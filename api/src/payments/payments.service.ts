import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
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
      where: {
        cancelledAt: null,
      },
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

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.findOne(id);

    if (!current) {
      throw new NotFoundException('Pago no encontrado');
    }

    const reason = normalizeAuditReason(
      input.reason,
      'Cancelación de pago desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.payment.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledById: input.actorId || null,
        },
        include: {
          student: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_CANCEL',
          entityType: 'Payment',
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
