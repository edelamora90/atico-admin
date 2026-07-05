import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.studentId },
      });

      if (!student) {
        throw new NotFoundException('Alumno no encontrado');
      }
    }

    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId || null,
        concept: dto.concept,
        amount: dto.amount,
        notes: dto.notes || null,
      },
      include: {
        student: true,
      },
    });
  }

  findAll() {
    return this.prisma.payment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        student: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });
  }

  remove(id: string) {
    return this.prisma.payment.delete({
      where: { id },
    });
  }
}
