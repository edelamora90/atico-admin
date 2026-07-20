import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassSessionCancellationType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { toAuditJson } from '../utils/audit-log.util';

type ClassSessionCreateData = Prisma.ClassSessionUncheckedCreateInput;

@Injectable()
export class ClassSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(data: ClassSessionCreateData, client = this.prisma) {
    const existing = await client.classSession.findFirst({
      where: {
        classTemplateId: data.classTemplateId,
        date: this.getDayRange(new Date(data.date)),
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    if (existing) {
      return existing;
    }

    return client.classSession.create({
      data,
    });
  }

  async findOrCreateMany(items: ClassSessionCreateData[], client = this.prisma) {
    const sessions: Awaited<ReturnType<ClassSessionService['findOrCreate']>>[] = [];

    for (const item of items) {
      sessions.push(await this.findOrCreate(item, client));
    }

    return sessions;
  }

  async cancel(
    sessionId: string,
    input: {
      cancellationType: ClassSessionCancellationType;
      reason: string;
      cancelledById?: string | null;
    },
  ) {
    const reason = String(input.reason || '').trim();

    if (reason.length < 3) {
      throw new BadRequestException('El motivo de cancelación es obligatorio.');
    }

    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada.');
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestException('La sesión ya está cancelada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.classSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          cancellationType: input.cancellationType,
          cancellationReason: reason,
          cancelledAt: new Date(),
          cancelledById: input.cancelledById || null,
        },
        include: {
          class: {
            include: {
              teacher: true,
              room: true,
              course: true,
            },
          },
          reservations: {
            include: {
              student: true,
              session: true,
            },
          },
          attendances: {
            include: {
              student: true,
              session: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CLASS_SESSION_CANCEL',
          entityType: 'ClassSession',
          entityId: sessionId,
          actorId: input.cancelledById || null,
          reason,
          before: toAuditJson(session),
          after: toAuditJson(updated),
        },
      });

      return updated;
    });
  }

  private getDayRange(date: Date) {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    return {
      gte: from,
      lt: to,
    };
  }
}
