import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AcademicArea,
  ClassType,
  CreditTransactionType,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const selectedClass = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      include: {
        reservations: true,
        course: true,
        teacher: true,
        room: true,
      },
    });

    if (!selectedClass) {
      throw new NotFoundException('Clase no encontrada');
    }

    const activeReservations = selectedClass.reservations.filter((reservation) =>
      ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status),
    );

    const alreadyReserved = selectedClass.reservations.some(
      (reservation) =>
        reservation.studentId === dto.studentId &&
        !['CANCELLED', 'RELEASED'].includes(reservation.status),
    );

    if (alreadyReserved) {
      throw new BadRequestException(
        'El alumno ya tiene una reservación para esta clase',
      );
    }

    if (activeReservations.length >= selectedClass.capacity) {
      throw new BadRequestException('La clase ya no tiene cupo disponible.');
    }

    const isRental = selectedClass.type === ClassType.RENTAL;

    const activeMembership = isRental
      ? null
      : await this.prisma.membership.findFirst({
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

    if (!isRental && !activeMembership) {
      throw new BadRequestException(
        this.getNoCreditsMessage(selectedClass.area),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const shouldConsumeCredit = !isRental && Boolean(activeMembership);

      const reservation = await tx.reservation.create({
        data: {
          studentId: dto.studentId,
          classId: dto.classId,
          status: ReservationStatus.RESERVED,
          creditConsumed: shouldConsumeCredit,
          creditMembershipId: activeMembership?.id || null,
        },
      });

      if (activeMembership) {
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
            description: `Crédito consumido por reservación: ${selectedClass.course.name}`,
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

      return tx.reservation.findUnique({
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
    });
  }


  private canRefundReservationCredit(classStartDate: Date): boolean {
    const now = new Date();
    return now < new Date(classStartDate);
  }

  private getCancellationMessage(classStartDate: Date): string {
    if (this.canRefundReservationCredit(classStartDate)) {
      return 'Reservación cancelada. Crédito devuelto correctamente.';
    }

    return 'Reservación cancelada después del inicio de la clase. No se devolvió el crédito.';
  }

  private getAreaLabel(area?: AcademicArea | null): string {
    return area === AcademicArea.MUSIC ? 'Música' : 'Danza';
  }

  private getNoCreditsMessage(area?: AcademicArea | null): string {
    return `El alumno no tiene créditos activos para ${this.getAreaLabel(
      area,
    )}.`;
  }

  async findAll(query: {
    period?: string;
    status?: string;
    area?: string;
  } = {}) {
    const { from, to } = this.getPeriodRange(query.period);
    const where: Prisma.ReservationWhereInput = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ReservationStatus;
    }

    if (from || to || (query.area && query.area !== 'ALL')) {
      where.class = {};

      if (from || to) {
        where.class.startDate = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      if (query.area && query.area !== 'ALL') {
        where.class.area = query.area as AcademicArea;
      }
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: this.getReservationInclude(),
    });

    return this.enrichReservations(reservations);
  }

  findOne(id: string) {
    return this.prisma.reservation.findUnique({
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

  async update(id: string, dto: UpdateReservationDto) {
    if (dto.status === ReservationStatus.CANCELLED) {
      return this.cancel(id);
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservación no encontrada');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: dto,
      include: this.getReservationInclude(),
    });
  }

  async cancel(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservación no encontrada');
    }

    if (reservation.status === ReservationStatus.ATTENDED) {
      throw new BadRequestException(
        'No se puede cancelar una asistencia ya registrada.',
      );
    }

    if (reservation.status === ReservationStatus.NO_SHOW) {
      throw new BadRequestException(
        'No se puede cancelar una reservación marcada como no show.',
      );
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      const [cancelled] = await this.enrichReservations([
        await this.prisma.reservation.findUniqueOrThrow({
          where: { id },
          include: this.getReservationInclude(),
        }),
      ]);

      return {
        message: 'La reservación ya estaba cancelada.',
        creditRefunded: false,
        reservation: cancelled,
      };
    }

    const shouldRefundCredit =
      reservation.creditConsumed &&
      reservation.creditMembershipId &&
      this.canRefundReservationCredit(reservation.class.startDate);

    const updatedReservation = await this.prisma.$transaction(async (tx) => {
      if (shouldRefundCredit) {
        await tx.membership.update({
          where: { id: reservation.creditMembershipId as string },
          data: {
            availableCredits: {
              increment: 1,
            },
            depletedAt: null,
          },
        });

        await tx.creditTransaction.create({
          data: {
            membershipId: reservation.creditMembershipId as string,
            type: CreditTransactionType.CANCELLATION,
            amount: 1,
            description: `Crédito devuelto por cancelación de reservación: ${reservation.class.course.name}`,
          },
        });
      }

      return tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          creditConsumed: shouldRefundCredit ? false : reservation.creditConsumed,
        },
        include: this.getReservationInclude(),
      });
    });

    const [enrichedReservation] = await this.enrichReservations([
      updatedReservation,
    ]);

    return {
      message: this.getCancellationMessage(reservation.class.startDate),
      creditRefunded: shouldRefundCredit,
      reservation: enrichedReservation,
    };
  }

  async remove(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservación no encontrada');
    }

    const canRefundByTime = this.canRefundReservationCredit(reservation.class.startDate);

    const shouldRefundCredit =
      reservation.creditConsumed &&
      reservation.creditMembershipId &&
      reservation.status !== ReservationStatus.ATTENDED &&
      reservation.status !== ReservationStatus.NO_SHOW &&
      canRefundByTime;

    return this.prisma.$transaction(async (tx) => {
      if (shouldRefundCredit) {
        await tx.membership.update({
          where: { id: reservation.creditMembershipId as string },
          data: {
            availableCredits: {
              increment: 1,
            },
            depletedAt: null,
          },
        });

        await tx.creditTransaction.create({
          data: {
            membershipId: reservation.creditMembershipId as string,
            type: CreditTransactionType.CANCELLATION,
            amount: 1,
            description: `Crédito devuelto por eliminación de reservación: ${reservation.class.course.name}`,
          },
        });
      }

      return tx.reservation.delete({
        where: { id },
      });
    });
  }

  private getReservationInclude() {
    return {
      student: true,
      class: {
        include: {
          course: true,
          teacher: true,
          room: true,
        },
      },
    } satisfies Prisma.ReservationInclude;
  }

  private getPeriodRange(period?: string): { from: Date | null; to: Date | null } {
    const now = new Date();
    const key = period || 'all';

    if (key === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    if (key === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    if (key === 'last-30-days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    return { from: null, to: null };
  }

  private async enrichReservations(
    reservations: Array<
      Prisma.ReservationGetPayload<{
        include: ReturnType<ReservationsService['getReservationInclude']>;
      }>
    >,
  ) {
    const membershipIds = [
      ...new Set(
        reservations
          .map((reservation) => reservation.creditMembershipId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

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

    const membershipById = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );

    return reservations.map((reservation) => {
      const creditMembership = reservation.creditMembershipId
        ? membershipById.get(reservation.creditMembershipId) || null
        : null;

      return {
        ...reservation,
        creditMembership,
        packageName: creditMembership?.package?.name || null,
        packageArea: creditMembership?.package?.area || null,
        classDate: reservation.class.startDate,
        className:
          reservation.class.course?.name ||
          reservation.class.title ||
          'Clase',
        teacherName: reservation.class.teacher?.name || null,
        studentName: reservation.student?.name || null,
        area: reservation.class.area,
        creditLabel: this.getCreditLabel(reservation),
        canCancel: reservation.status === ReservationStatus.RESERVED,
      };
    });
  }

  private getCreditLabel(reservation: {
    class: { type: ClassType };
    creditConsumed: boolean;
    status: ReservationStatus;
  }): string {
    if (reservation.class.type === ClassType.RENTAL) {
      return 'No aplica';
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return reservation.creditConsumed ? 'No devuelto' : 'Devuelto';
    }

    if (reservation.creditConsumed) {
      return 'Apartado';
    }

    return 'Sin crédito';
  }
}
