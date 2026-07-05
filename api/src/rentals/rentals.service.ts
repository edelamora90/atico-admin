import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
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

  remove(id: string) {
    return this.prisma.roomReservation.delete({
      where: { id },
    });
  }
}
