import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateRentalDto } from './dto/create-rental.dto';

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRentalDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de término debe ser mayor a la fecha de inicio');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException('Espacio no encontrado');
    }

    const rentals = await this.prisma.roomReservation.findMany({
      where: {
        roomId: dto.roomId,
        cancelledAt: null,
      },
    });

    const rentalConflict = rentals.some((item) => {
      return item.startDate < endDate && item.endDate > startDate;
    });

    if (rentalConflict) {
      throw new BadRequestException('El espacio ya está rentado en ese horario');
    }

    const classes = await this.prisma.class.findMany({
      where: {
        roomId: dto.roomId,
        deletedAt: null,
      },
    });

    const classConflict = classes.some((item) => {
      const classStart = item.startDate;
      const classEnd =
        item.endDate ||
        new Date(item.startDate.getTime() + item.durationMinutes * 60000);

      return classStart < endDate && classEnd > startDate;
    });

    if (classConflict) {
      throw new BadRequestException('El espacio ya tiene una clase o curso en ese horario');
    }

    return this.prisma.roomReservation.create({
      data: {
        customerName: dto.customerName,
        roomId: dto.roomId,
        amount: dto.amount,
        startDate,
        endDate,
        notes: dto.notes || null,
      },
      include: {
        room: true,
      },
    });
  }

  findAll() {
    return this.prisma.roomReservation.findMany({
      where: {
        cancelledAt: null,
      },
      orderBy: {
        startDate: 'asc',
      },
      include: {
        room: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.roomReservation.findUnique({
      where: { id },
      include: {
        room: true,
      },
    });
  }

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: {
        room: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Renta no encontrada');
    }

    const reason = normalizeAuditReason(
      input.reason,
      'Cancelación de renta desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.roomReservation.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledById: input.actorId || null,
        },
        include: {
          room: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ROOM_RESERVATION_CANCEL',
          entityType: 'RoomReservation',
          entityId: id,
          actorId: input.actorId || null,
          reason,
          before: toAuditJson(current),
          after: toAuditJson(cancelled),
        },
      });

      return cancelled;
    });
  }
}
