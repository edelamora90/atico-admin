import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AttendanceStatus,
  AcademicArea,
  CreditTransactionType,
  Membership,
  Prisma,
  Reservation,
  ReservationStatus,
  StudentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CheckInClassDto } from './dto/check-in-class.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de término debe ser mayor a la fecha de inicio');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: {
        items: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Salón no encontrado');
    }

    let teacherId = dto.teacherId || null;

    if (dto.type !== 'RENTAL') {
      if (!teacherId) {
        throw new BadRequestException('Selecciona docente');
      }

      const teacher = await this.prisma.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        throw new NotFoundException('Docente no encontrado');
      }
    }

    const firstCourse = await this.prisma.course.findFirst();

    if (!firstCourse) {
      throw new BadRequestException('No existe ningún curso base en el sistema');
    }

    const selectedRentalItems =
      dto.type === 'RENTAL'
        ? room.items.filter((item) => {
            return dto.rentalItemIds?.includes(item.id);
          })
        : [];

    const rentalTotal =
      dto.type === 'RENTAL'
        ? this.calculateRentalTotal(room, selectedRentalItems, startDate, endDate)
        : 0;

    const createdClass = await this.prisma.class.create({
      data: {
        courseId: firstCourse.id,
        teacherId: teacherId || (await this.getFallbackTeacherId()),
        roomId: dto.roomId,
        type: dto.type,
        area: dto.area || AcademicArea.DANCE,
        title: dto.title,
        startDate,
        endDate,
        durationMinutes: dto.durationMinutes,
        capacity: dto.capacity,
        teacherPaymentAmount: rentalTotal,
        rentalItems:
          dto.type === 'RENTAL'
            ? selectedRentalItems.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
              }))
            : undefined,
      },
      include: this.defaultInclude(),
    });

    return this.attachTeacherPaymentSummary(createdClass);
  }

  async getFallbackTeacherId() {
    const teacher = await this.prisma.teacher.findFirst();

    if (!teacher) {
      throw new BadRequestException('No existe ningún docente en el sistema');
    }

    return teacher.id;
  }

  async findAll() {
    const classes = await this.prisma.class.findMany({
      orderBy: {
        startDate: 'asc',
      },
      include: this.defaultInclude(),
    });

    return this.attachTeacherPaymentSummaries(classes);
  }

  async findOne(id: string) {
    const selectedClass = await this.prisma.class.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    return selectedClass
      ? this.attachTeacherPaymentSummary(selectedClass)
      : null;
  }

  async update(id: string, dto: UpdateClassDto) {
    const updatedClass = await this.prisma.$transaction(async (tx) => {
      const currentClass = await tx.class.findUnique({
        where: { id },
        include: {
          reservations: true,
        },
      });

      if (!currentClass) {
        throw new NotFoundException('Clase no encontrada');
      }

      const nextType = dto.type ?? currentClass.type;
      const nextStartDate = dto.startDate
        ? new Date(dto.startDate)
        : currentClass.startDate;
      const nextEndDate = dto.endDate
        ? new Date(dto.endDate)
        : currentClass.endDate;

      if (nextEndDate && nextEndDate <= nextStartDate) {
        throw new BadRequestException(
          'La fecha de término debe ser mayor a la fecha de inicio',
        );
      }

      const nextCapacity = dto.capacity ?? currentClass.capacity;
      const occupied = this.getOccupiedReservationCount(currentClass);

      if (nextCapacity < occupied) {
        throw new BadRequestException(
          'No puedes reducir el cupo por debajo de los lugares ya ocupados.',
        );
      }

      const nextRoomId = dto.roomId ?? currentClass.roomId;
      const room = await tx.room.findUnique({
        where: { id: nextRoomId },
        include: {
          items: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Salón no encontrado');
      }

      let nextTeacherId = dto.teacherId ?? currentClass.teacherId;

      if (nextType !== 'RENTAL') {
        if (!nextTeacherId) {
          throw new BadRequestException('Selecciona docente');
        }

        const teacher = await tx.teacher.findUnique({
          where: { id: nextTeacherId },
        });

        if (!teacher) {
          throw new NotFoundException('Docente no encontrado');
        }
      } else if (!nextTeacherId) {
        nextTeacherId = await this.getFallbackTeacherId();
      } else if (dto.teacherId) {
        const teacher = await tx.teacher.findUnique({
          where: { id: nextTeacherId },
        });

        if (!teacher) {
          throw new NotFoundException('Docente no encontrado');
        }
      }

      const data: Prisma.ClassUpdateInput = {
        type: nextType,
        area: dto.area ?? currentClass.area,
        title: dto.title ?? currentClass.title,
        teacher: {
          connect: {
            id: nextTeacherId,
          },
        },
        room: {
          connect: {
            id: nextRoomId,
          },
        },
        startDate: nextStartDate,
        endDate: nextEndDate,
        durationMinutes: dto.durationMinutes ?? currentClass.durationMinutes,
        capacity: nextCapacity,
        teacherPaymentAmount: nextType === 'RENTAL' ? currentClass.teacherPaymentAmount : 0,
      };

      if (nextType === 'RENTAL') {
        if (!nextEndDate) {
          throw new BadRequestException(
            'La fecha de término debe ser mayor a la fecha de inicio',
          );
        }

        const rentalItemIds = dto.rentalItemIds ?? this.getStoredRentalItemIds(currentClass.rentalItems);
        const selectedRentalItems = room.items.filter((item) => {
          return rentalItemIds.includes(item.id);
        });

        const rentalTotal = this.calculateRentalTotal(
          room,
          selectedRentalItems,
          nextStartDate,
          nextEndDate,
        );

        data.teacherPaymentAmount = rentalTotal;
        data.rentalItems = selectedRentalItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
        }));
      } else {
        data.rentalItems = Prisma.DbNull;
      }

      return tx.class.update({
        where: { id },
        data,
        include: this.defaultInclude(),
      });
    });

    return this.attachTeacherPaymentSummary(updatedClass);
  }

  async checkIn(classId: string, dto: CheckInClassDto) {
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const selectedClass = await tx.class.findUnique({
            where: { id: classId },
            include: {
              course: true,
              reservations: true,
              attendances: true,
            },
          });

          if (!selectedClass) {
            throw new NotFoundException('Clase no encontrada');
          }

          this.validateCheckInWindow(selectedClass.startDate);

          const student = await tx.student.findUnique({
            where: { id: dto.studentId },
          });

          if (!student) {
            throw new NotFoundException('Alumno no encontrado');
          }

          if (
            student.status === StudentStatus.INACTIVO ||
            student.status === StudentStatus.BLOQUEADO
          ) {
            throw new BadRequestException(
              'El alumno no puede registrar asistencia por su estado actual',
            );
          }

          const existingAttendance = await tx.attendance.findFirst({
            where: {
              studentId: dto.studentId,
              classId,
            },
          });

          if (existingAttendance) {
            throw new BadRequestException('Esta asistencia ya fue registrada');
          }

          const existingReservation = await tx.reservation.findFirst({
            where: {
              studentId: dto.studentId,
              classId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (existingReservation?.status === ReservationStatus.ATTENDED) {
            throw new BadRequestException('Esta asistencia ya fue registrada');
          }

          if (existingReservation?.status === ReservationStatus.NO_SHOW) {
            throw new BadRequestException(
              'La reservación ya fue marcada como no show',
            );
          }

          const needsCapacityCheck =
            !existingReservation ||
            ([
              ReservationStatus.CANCELLED,
              ReservationStatus.RELEASED,
              ReservationStatus.WAITING_LIST,
            ] as ReservationStatus[]).includes(existingReservation.status);

          if (needsCapacityCheck && !this.hasAvailableCapacity(selectedClass)) {
            throw new BadRequestException('La clase no tiene cupo disponible.');
          }

          const shouldConsumeCredit =
            !existingReservation || !existingReservation.creditConsumed;

          let activeMembership: Membership | null = null;

          if (shouldConsumeCredit) {
            activeMembership = await tx.membership.findFirst({
              where: {
                studentId: dto.studentId,
                status: 'ACTIVE',
                availableCredits: {
                  gt: 0,
                },
                expirationDate: {
                  gte: new Date(),
                },
                package: {
                  area: selectedClass.area,
                },
              },
              orderBy: {
                expirationDate: 'asc',
              },
            });

            if (!activeMembership) {
              throw new BadRequestException(
                this.getNoCreditsMessage(selectedClass.area),
              );
            }
          }

          let reservation: Reservation;

          if (existingReservation) {
            reservation = await tx.reservation.update({
              where: { id: existingReservation.id },
              data: {
                status: ReservationStatus.ATTENDED,
                creditConsumed: existingReservation.creditConsumed || shouldConsumeCredit,
                creditMembershipId:
                  existingReservation.creditMembershipId ||
                  activeMembership?.id ||
                  null,
              },
            });
          } else {
            reservation = await tx.reservation.create({
              data: {
                studentId: dto.studentId,
                classId,
                status: ReservationStatus.ATTENDED,
                creditConsumed: true,
                creditMembershipId: activeMembership?.id || null,
              },
            });
          }

          if (shouldConsumeCredit && activeMembership) {
            const updatedMembership = await tx.membership.updateMany({
              where: {
                id: activeMembership.id,
                status: 'ACTIVE',
                availableCredits: {
                  gt: 0,
                },
                expirationDate: {
                  gte: new Date(),
                },
              },
              data: {
                availableCredits: {
                  decrement: 1,
                },
                depletedAt:
                  activeMembership.availableCredits === 1 ? new Date() : null,
              },
            });

            if (updatedMembership.count !== 1) {
              throw new BadRequestException(
                this.getNoCreditsMessage(selectedClass.area),
              );
            }

            await tx.creditTransaction.create({
              data: {
                membershipId: activeMembership.id,
                type: CreditTransactionType.CLASS_USE,
                amount: -1,
                description: `Crédito consumido por check-in manual: ${this.getClassDisplayName(
                  selectedClass,
                )}`,
              },
            });

            if (activeMembership.availableCredits === 1) {
              const enrollmentExpiresAt = new Date();
              enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

              await tx.student.update({
                where: { id: dto.studentId },
                data: {
                  enrollmentExpiresAt,
                },
              });
            }
          }

          const attendance = await tx.attendance.create({
            data: {
              studentId: dto.studentId,
              classId,
              status: AttendanceStatus.PRESENT,
            },
            include: {
              student: true,
              class: {
                include: {
                  course: true,
                  teacher: true,
                  room: true,
                },
              },
            },
          });

          const updatedClass = await tx.class.findUnique({
            where: { id: classId },
            include: this.defaultInclude(),
          });

          const updatedStudent = await tx.student.findUnique({
            where: { id: dto.studentId },
            include: {
              memberships: true,
              reservations: true,
              attendances: true,
              payments: true,
            },
          });

          const updatedReservation = await tx.reservation.findUnique({
            where: { id: reservation.id },
            include: {
              student: true,
              class: {
                include: {
                  course: true,
                  teacher: true,
                  room: true,
                },
              },
            },
          });

          return {
            success: true,
            message: 'Check-in registrado correctamente.',
            student: updatedStudent,
            class: updatedClass,
            reservation: updatedReservation,
            attendance,
            creditConsumed: shouldConsumeCredit,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return {
        ...result,
        class: result.class
          ? await this.attachTeacherPaymentSummary(result.class)
          : result.class,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new BadRequestException(
          'No se pudo completar el check-in. Intenta nuevamente.',
        );
      }

      throw error;
    }
  }

  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({
        where: { classId: id },
      });

      await tx.reservation.deleteMany({
        where: { classId: id },
      });

      return tx.class.delete({
        where: { id },
      });
    });
  }

  private async attachTeacherPaymentSummaries(classes: any[]) {
    const summaries = await this.getTeacherPaymentSummaries(classes);

    return classes.map((item) => ({
      ...item,
      teacherPaymentSummary: summaries.get(item.id) || this.emptyTeacherPaymentSummary(),
      teacherPaymentTotal: summaries.get(item.id)?.total || 0,
      paidAttendancesCount: summaries.get(item.id)?.attendancesCount || 0,
    }));
  }

  private async attachTeacherPaymentSummary(selectedClass: any) {
    const summaries = await this.getTeacherPaymentSummaries([selectedClass]);
    const summary = summaries.get(selectedClass.id) || this.emptyTeacherPaymentSummary();

    return {
      ...selectedClass,
      teacherPaymentSummary: summary,
      teacherPaymentTotal: summary.total,
      paidAttendancesCount: summary.attendancesCount,
    };
  }

  private async getTeacherPaymentSummaries(classes: any[]) {
    const membershipIds = Array.from(
      new Set(
        classes.flatMap((selectedClass) => {
          return (selectedClass.reservations || [])
            .filter((reservation: any) => reservation.creditMembershipId)
            .map((reservation: any) => reservation.creditMembershipId);
        }),
      ),
    );

    const memberships = membershipIds.length
      ? await this.prisma.membership.findMany({
          where: {
            id: {
              in: membershipIds,
            },
          },
          include: {
            package: true,
          },
        })
      : [];

    const membershipMap = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );
    const summaries = new Map<string, any>();

    for (const selectedClass of classes) {
      const attendedByStudent = new Map<string, any>();

      for (const reservation of selectedClass.reservations || []) {
        if (reservation.status !== ReservationStatus.ATTENDED) {
          continue;
        }

        attendedByStudent.set(reservation.studentId, {
          studentId: reservation.studentId,
          studentName: reservation.student?.name || 'Alumno',
          membershipId: reservation.creditMembershipId || null,
        });
      }

      for (const attendance of selectedClass.attendances || []) {
        if (attendance.status !== AttendanceStatus.PRESENT) {
          continue;
        }

        if (attendedByStudent.has(attendance.studentId)) {
          continue;
        }

        attendedByStudent.set(attendance.studentId, {
          studentId: attendance.studentId,
          studentName: attendance.student?.name || 'Alumno',
          membershipId: null,
        });
      }

      const items = Array.from(attendedByStudent.values()).map((item) => {
        const membership = item.membershipId
          ? membershipMap.get(item.membershipId)
          : null;
        const packageData = membership?.package || null;
        const teacherPayment = packageData
          ? this.calculateTeacherPayment(packageData)
          : 0;

        return {
          studentId: item.studentId,
          studentName: item.studentName,
          packageName: packageData?.name || 'Sin paquete identificado',
          packageArea: packageData?.area || null,
          teacherPayment,
        };
      });

      const total = this.roundMoney(
        items.reduce((sum, item) => sum + Number(item.teacherPayment || 0), 0),
      );

      summaries.set(selectedClass.id, {
        total,
        attendancesCount: items.length,
        items,
      });
    }

    return summaries;
  }

  private calculateTeacherPayment(packageData: {
    price?: number | null;
    teacherPercentage?: number | null;
    teacherPaymentPerClass?: number | null;
    credits?: number | null;
  }) {
    const storedPayment = Number(packageData.teacherPaymentPerClass || 0);

    if (storedPayment > 0) {
      return this.roundMoney(storedPayment);
    }

    const credits = Number(packageData.credits || 0);

    if (credits <= 0) {
      return 0;
    }

    return this.roundMoney(
      (Number(packageData.price || 0) *
        Number(packageData.teacherPercentage || 0)) /
        100 /
        credits,
    );
  }

  private emptyTeacherPaymentSummary() {
    return {
      total: 0,
      attendancesCount: 0,
      items: [],
    };
  }

  private roundMoney(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private defaultInclude() {
    return {
      course: true,
      teacher: true,
      room: true,
      reservations: {
        include: {
          student: true,
        },
      },
      attendances: {
        include: {
          student: true,
        },
      },
    };
  }

  private hasAvailableCapacity(selectedClass: {
    capacity: number;
    reservations: { status: ReservationStatus }[];
  }): boolean {
    return this.getOccupiedReservationCount(selectedClass) < selectedClass.capacity;
  }

  private getOccupiedReservationCount(selectedClass: {
    reservations: { status: ReservationStatus }[];
  }): number {
    const capacityStatuses: ReservationStatus[] = [
      ReservationStatus.RESERVED,
      ReservationStatus.CONFIRMED,
      ReservationStatus.ATTENDED,
    ];

    return selectedClass.reservations.filter((reservation) => {
      return capacityStatuses.includes(reservation.status);
    }).length;
  }

  private getClassDisplayName(selectedClass: {
    title?: string | null;
    course?: { name?: string | null } | null;
  }): string {
    return selectedClass.title || selectedClass.course?.name || 'Clase';
  }

  private getAreaLabel(area?: AcademicArea | null): string {
    return area === AcademicArea.MUSIC ? 'Música' : 'Danza';
  }

  private getNoCreditsMessage(area?: AcademicArea | null): string {
    return `El alumno no tiene créditos disponibles de ${this.getAreaLabel(
      area,
    )} o su membresía venció.`;
  }

  private validateCheckInWindow(startDate: Date): void {
    const checkInStart = new Date(startDate);
    checkInStart.setMinutes(checkInStart.getMinutes() - 30);

    const checkInEnd = new Date(startDate);
    checkInEnd.setMinutes(checkInEnd.getMinutes() + 20);

    const now = new Date();

    if (now < checkInStart || now > checkInEnd) {
      throw new BadRequestException(
        `El check-in solo está disponible de ${this.formatLocalTime(
          checkInStart,
        )} a ${this.formatLocalTime(checkInEnd)}.`,
      );
    }
  }

  private formatLocalTime(value: Date): string {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private calculateDurationHours(startDate: Date, endDate: Date): number {
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new BadRequestException(
        'La fecha de término debe ser mayor a la fecha de inicio',
      );
    }

    return durationHours;
  }

  private calculateRentalTotal(
    room: { basePrice?: number | null },
    selectedRentalItems: Array<{ price?: number | null }>,
    startDate: Date,
    endDate: Date,
  ): number {
    const durationHours = this.calculateDurationHours(startDate, endDate);
    const extrasTotal = selectedRentalItems.reduce((sum, item) => {
      return sum + Number(item.price || 0);
    }, 0);

    return Number(room.basePrice || 0) * durationHours + extrasTotal;
  }

  private getStoredRentalItemIds(rentalItems: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(rentalItems)) {
      return [];
    }

    return rentalItems
      .map((item) => {
        if (item && typeof item === 'object' && 'id' in item) {
          return String(item.id || '');
        }

        return '';
      })
      .filter(Boolean);
  }
}
