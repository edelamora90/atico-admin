import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: {
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        active: dto.active ?? true,
      },
    });
  }

  findAll() {
    return this.prisma.teacher.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        classes: {
          include: {
            course: true,
            room: true,
            sessions: {
              include: {
                reservations: true,
                attendances: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            course: true,
            room: true,
            sessions: {
              include: {
                reservations: true,
                attendances: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Docente no encontrado');
    }

    return teacher;
  }

  update(id: string, dto: UpdateTeacherDto) {
    return this.prisma.teacher.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        active: dto.active,
      },
    });
  }

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.findOne(id);
    const reason = normalizeAuditReason(
      input.reason,
      'Desactivación de docente desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { id },
        data: {
          active: false,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'TEACHER_DEACTIVATE',
          entityType: 'Teacher',
          entityId: id,
          actorId: input.actorId || null,
          reason,
          before: toAuditJson(current),
          after: toAuditJson(updated),
        },
      });

      return updated;
    });
  }
}
