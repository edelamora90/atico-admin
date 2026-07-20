import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AcademicArea, PaymentConcept } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentContinuityService } from '../student-continuity/student-continuity.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: PrismaService,
    private studentContinuityService: StudentContinuityService,
  ) {}

  async expireMemberships() {
    await this.prisma.student.updateMany({
      where: {
        enrolled: true,
        enrollmentExpiresAt: {
          lt: new Date(),
        },
      },
      data: {
        enrolled: false,
      },
    });

    await this.prisma.membership.updateMany({
      where: {
        status: 'ACTIVE',
        expirationDate: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
        availableCredits: 0,
        depletedAt: new Date(),
      },
    });
  }

  async create(dto: CreateMembershipDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const selectedPackage = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
    });

    if (!selectedPackage) {
      throw new NotFoundException('Paquete no encontrado');
    }

    if (selectedPackage.area === AcademicArea.BOTH) {
      throw new BadRequestException('Solo se permiten paquetes de Danza o Música.');
    }

    const continuity =
      await this.studentContinuityService.getStudentContinuity(student.id);

    if (
      selectedPackage.requiresEnrollment &&
      !selectedPackage.includesFreeInscription &&
      continuity?.requiresInitialInscription
    ) {
      throw new BadRequestException(
        'Este paquete requiere que el alumno pague inscripción antes de comprarlo.',
      );
    }

    if (selectedPackage.isTrial && student.trialClassUsed) {
      throw new BadRequestException(
        'El alumno ya utilizó su clase muestra.',
      );
    }

    const startDate = new Date();
    const expirationDate = new Date();

    expirationDate.setMonth(expirationDate.getMonth() + 1);

    const enrollmentExpiresAt = new Date(expirationDate);
    enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          studentId: dto.studentId,
          packageId: dto.packageId,
          initialCredits: selectedPackage.credits,
          availableCredits: selectedPackage.credits,
          startDate,
          expirationDate,
          depletedAt: selectedPackage.credits <= 0 ? startDate : null,
        },
      });

      await tx.creditTransaction.create({
        data: {
          membershipId: membership.id,
          type: 'PURCHASE',
          amount: selectedPackage.credits,
          description: `Compra de paquete: ${selectedPackage.name}`,
        },
      });

      await tx.payment.create({
        data: {
          studentId: dto.studentId,
          concept: selectedPackage.isTrial
            ? PaymentConcept.DAY_PASS
            : PaymentConcept.PAQUETE,
          amount: selectedPackage.price,
          notes: selectedPackage.isTrial
            ? `Pago generado por clase muestra: ${selectedPackage.name}`
            : `Pago generado por compra de paquete: ${selectedPackage.name}`,
        },
      });

      if (selectedPackage.isTrial) {
        await tx.student.update({
          where: { id: dto.studentId },
          data: {
            trialClassUsed: true,
            trialClassPaid: selectedPackage.price > 0,
            trialClassAmount: selectedPackage.price,
          },
        });
      }

      if (
        !selectedPackage.isTrial &&
        selectedPackage.type !== 'DAY_PASS'
      ) {
        await tx.student.update({
          where: { id: dto.studentId },
          data: {
            enrolled: true,
            enrollmentExpiresAt,
          },
        });
      }

      if (selectedPackage.includesFreeInscription && !student.enrolled) {
        await tx.payment.create({
          data: {
            studentId: dto.studentId,
            concept: PaymentConcept.INSCRIPCION,
            amount: 0,
            notes: `Inscripción incluida gratis en promoción: ${selectedPackage.name}`,
          },
        });

        await tx.student.update({
          where: { id: dto.studentId },
          data: {
            inscriptionPaid: true,
            inscriptionAmount: 0,
            enrolled: true,
            enrollmentExpiresAt,
          },
        });
      }

      return tx.membership.findUnique({
        where: { id: membership.id },
        include: {
          student: true,
          package: true,
          transactions: true,
        },
      });
    });
  }

  async findAll() {
    await this.expireMemberships();

    return this.prisma.membership.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        student: true,
        package: true,
        transactions: true,
      },
    });
  }

  private getAreaLabel(area?: AcademicArea | null): string {
    return area === AcademicArea.MUSIC ? 'Música' : 'Danza';
  }

  async findOne(id: string) {
    await this.expireMemberships();

    return this.prisma.membership.findUnique({
      where: { id },
      include: {
        student: true,
        package: true,
        transactions: true,
      },
    });
  }

  async cancel(id: string, input: string | { reason?: string; actorId?: string | null } = {}) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
    });

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada');
    }
    const actorId = typeof input === 'string' ? null : input.actorId || null;
    const reason = normalizeAuditReason(
      typeof input === 'string' ? input : input.reason,
      'Cancelación manual de membresía.',
    );

    return this.prisma.$transaction(async (tx) => {
      if (membership.availableCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            membershipId: id,
            type: 'CANCELLATION',
            amount: membership.availableCredits * -1,
            description: reason,
          },
        });
      }

      const updated = await tx.membership.update({
        where: { id },
        data: {
          availableCredits: 0,
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledById: actorId,
          depletedAt: new Date(),
        },
        include: {
          student: true,
          package: true,
          transactions: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'MEMBERSHIP_CANCEL',
          entityType: 'Membership',
          entityId: id,
          actorId,
          reason,
          before: toAuditJson(membership),
          after: toAuditJson(updated),
        },
      });

      return updated;
    });
  }

  remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    return this.cancel(id, {
      reason: input.reason || 'Eliminación lógica de membresía desde administración.',
      actorId: input.actorId,
    });
  }
}
