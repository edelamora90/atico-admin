import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AcademicArea,
  AttendanceStatus,
  Prisma,
  ReservationStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttendanceDto) {
    let reservation: any = null;
    let studentId = dto.studentId;
    let classId = dto.classId;

    if (dto.reservationId) {
      reservation = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
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

      if (!reservation) {
        throw new NotFoundException('Reservación no encontrada');
      }

      studentId = reservation.studentId;
      classId = reservation.classId;
    }

    if (!studentId || !classId) {
      throw new BadRequestException(
        'Debes enviar reservationId o studentId y classId.',
      );
    }

    const selectedClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        teacher: true,
        room: true,
      },
    });

    if (!selectedClass) {
      throw new NotFoundException('Clase no encontrada');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        studentId,
        classId,
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Esta asistencia ya fue registrada');
    }

    const shouldConsumeCredit =
      dto.status === AttendanceStatus.PRESENT &&
      (!reservation || !reservation.creditConsumed);

    let activeMembership: any = null;

    if (shouldConsumeCredit) {
      activeMembership = await this.prisma.membership.findFirst({
        where: {
          studentId,
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

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: {
          studentId,
          classId,
          status: dto.status,
        },
      });

      if (shouldConsumeCredit && activeMembership) {
        await tx.membership.update({
          where: { id: activeMembership.id },
          data: {
            availableCredits: {
              decrement: 1,
            },
            depletedAt:
              activeMembership.availableCredits === 1 ? new Date() : null,
          },
        });

        await tx.creditTransaction.create({
          data: {
            membershipId: activeMembership.id,
            type: 'CLASS_USE',
            amount: -1,
            description: `Crédito consumido por asistencia sin reservación: ${selectedClass.course.name}`,
          },
        });

        if (activeMembership.availableCredits === 1) {
          const enrollmentExpiresAt = new Date();
          enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

          await tx.student.update({
            where: { id: studentId },
            data: {
              enrollmentExpiresAt,
            },
          });
        }
      }

      if (reservation) {
        if (dto.status === AttendanceStatus.PRESENT) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.ATTENDED,
            },
          });
        }

        if (dto.status === AttendanceStatus.NO_SHOW) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.NO_SHOW,
            },
          });
        }

        if (dto.status === AttendanceStatus.ABSENT) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.CANCELLED,
            },
          });
        }
      }

      return tx.attendance.findUnique({
        where: { id: attendance.id },
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
    });
  }

  async findAll(query: any = {}) {
    const rows = await this.getNormalizedAttendances(query);

    return rows;
  }

  async getSummary(query: any = {}) {
    const items = await this.getNormalizedAttendances(query);
    const byAreaMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();

    for (const item of items) {
      byAreaMap.set(item.area, Number(byAreaMap.get(item.area) || 0) + 1);
      byStatusMap.set(item.status, Number(byStatusMap.get(item.status) || 0) + 1);
    }

    return {
      totalAttendances: items.length,
      creditsConsumed: items.filter((item) => item.creditConsumed).length,
      teacherPaymentTotal: this.roundMoney(
        items.reduce((sum, item) => sum + Number(item.teacherPayment || 0), 0),
      ),
      byArea: Array.from(byAreaMap.entries()).map(([area, count]) => ({
        area,
        count,
      })),
      byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
    };
  }

  async getNormalizedAttendances(query: any = {}) {
    const range = this.getDateRange(query);
    const createdAt = this.getDateWhere(range);
    const classWhere = {
      ...(query.classId ? { id: String(query.classId) } : {}),
      ...(query.teacherId ? { teacherId: String(query.teacherId) } : {}),
      ...(query.area ? { area: query.area as AcademicArea } : {}),
    };
    const studentWhere = query.studentId
      ? { id: String(query.studentId) }
      : undefined;

    const [reservations, attendances] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          createdAt,
          ...(query.studentId ? { studentId: String(query.studentId) } : {}),
          ...(query.classId ? { classId: String(query.classId) } : {}),
          ...(query.status &&
          Object.values(ReservationStatus).includes(query.status)
            ? { status: query.status as ReservationStatus }
            : {}),
          class: classWhere,
          ...(studentWhere ? { student: studentWhere } : {}),
        },
        include: this.historyInclude(),
      }),
      this.prisma.attendance.findMany({
        where: {
          createdAt,
          ...(query.studentId ? { studentId: String(query.studentId) } : {}),
          ...(query.classId ? { classId: String(query.classId) } : {}),
          ...(query.status &&
          Object.values(AttendanceStatus).includes(query.status)
            ? { status: query.status as AttendanceStatus }
            : {}),
          class: classWhere,
          ...(studentWhere ? { student: studentWhere } : {}),
        },
        include: this.historyInclude(),
      }),
    ]);

    const membershipIds = Array.from(
      new Set(
        reservations
          .map((reservation) => reservation.creditMembershipId)
          .filter(Boolean) as string[],
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
    const rows = new Map<string, any>();

    for (const reservation of reservations) {
      const key = this.getHistoryKey(reservation.classId, reservation.studentId);
      const membership = reservation.creditMembershipId
        ? membershipMap.get(reservation.creditMembershipId)
        : null;

      rows.set(key, this.normalizeHistoryRow({
        id: reservation.id,
        date: reservation.createdAt,
        student: reservation.student,
        selectedClass: reservation.class,
        status: reservation.status,
        creditConsumed: reservation.creditConsumed,
        membership,
        source: 'RESERVATION',
      }));
    }

    for (const attendance of attendances) {
      const key = this.getHistoryKey(attendance.classId, attendance.studentId);
      const existing = rows.get(key);

      if (existing?.status === ReservationStatus.ATTENDED && attendance.status === AttendanceStatus.PRESENT) {
        continue;
      }

      if (!existing || attendance.status === AttendanceStatus.PRESENT) {
        rows.set(key, this.normalizeHistoryRow({
          id: attendance.id,
          date: attendance.createdAt,
          student: attendance.student,
          selectedClass: attendance.class,
          status: attendance.status,
          creditConsumed: attendance.status === AttendanceStatus.PRESENT,
          membership: null,
          source: 'ATTENDANCE',
        }));
      }
    }

    let result = Array.from(rows.values());

    if (query.status === 'ATTENDED') {
      result = result.filter((item) => item.status === 'ATTENDED' || item.status === 'PRESENT');
    } else if (query.status) {
      result = result.filter((item) => item.status === query.status);
    }

    return result.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  private historyInclude() {
    return {
      student: true,
      class: {
        include: {
          course: true,
          teacher: true,
          room: true,
        },
      },
    };
  }

  private normalizeHistoryRow(input: {
    id: string;
    date: Date;
    student: any;
    selectedClass: any;
    status: string;
    creditConsumed: boolean;
    membership: any | null;
    source: 'RESERVATION' | 'ATTENDANCE';
  }) {
    const packageData = input.membership?.package || null;
    const generatesTeacherPayment =
      input.status === ReservationStatus.ATTENDED ||
      input.status === AttendanceStatus.PRESENT;

    return {
      id: input.id,
      date: input.date.toISOString(),
      studentId: input.student?.id || null,
      studentName: input.student?.name || 'Sin alumno',
      studentPhone: input.student?.phone || null,
      classId: input.selectedClass?.id || null,
      className: input.selectedClass?.title || input.selectedClass?.course?.name || 'Clase',
      classType: input.selectedClass?.type || 'CLASS',
      area: input.selectedClass?.area || 'DANCE',
      teacherId: input.selectedClass?.teacher?.id || null,
      teacherName: input.selectedClass?.teacher?.name || 'Sin docente',
      status: input.status,
      creditConsumed: !!input.creditConsumed,
      packageName: packageData?.name || 'Sin paquete identificado',
      packageArea: packageData?.area || null,
      teacherPayment: packageData && generatesTeacherPayment
        ? this.calculateTeacherPayment(packageData)
        : 0,
      source: input.source,
    };
  }

  private getHistoryKey(classId: string, studentId: string) {
    return `${classId}:${studentId}`;
  }

  private getDateRange(query: {
    period?: 'all' | 'this-month' | 'last-30-days' | 'today';
    from?: string;
    to?: string;
  }) {
    if (query.from || query.to) {
      return {
        from: query.from ? new Date(`${query.from}T00:00:00`) : null,
        to: query.to ? this.getEndOfDay(new Date(`${query.to}T00:00:00`)) : null,
      };
    }

    const period = query.period || 'all';
    const now = new Date();

    if (period === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);

      return {
        from,
        to: this.getEndOfDay(from),
      };
    }

    if (period === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        from,
        to: this.getEndOfDay(to),
      };
    }

    if (period === 'last-30-days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);

      return {
        from,
        to: this.getEndOfDay(now),
      };
    }

    return {
      from: null,
      to: null,
    };
  }

  private getDateWhere(range: {
    from: Date | null;
    to: Date | null;
  }): Prisma.DateTimeFilter | undefined {
    if (!range.from && !range.to) {
      return undefined;
    }

    return {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    };
  }

  private getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
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

  private roundMoney(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  findRawAttendances() {
    return this.prisma.attendance.findMany({
      orderBy: {
        createdAt: 'desc',
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
  }

  findOne(id: string) {
    return this.prisma.attendance.findUnique({
      where: { id },
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
  }

  remove(id: string) {
    return this.prisma.attendance.delete({
      where: { id },
    });
  }

  private getAreaLabel(area?: AcademicArea | null): string {
    return area === AcademicArea.MUSIC ? 'Música' : 'Danza';
  }

  private getNoCreditsMessage(area?: AcademicArea | null): string {
    return `El alumno no tiene créditos disponibles de ${this.getAreaLabel(
      area,
    )} o su membresía venció.`;
  }
}
