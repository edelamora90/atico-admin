import { Injectable } from '@nestjs/common';
import {
  CreditTransactionType,
  Membership,
  PaymentConcept,
  Prisma,
  RenewalPolicy,
  Student,
} from '@prisma/client';

import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { PrismaService } from '../prisma/prisma.service';

type ContinuityStatus =
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'EXPIRED_NEEDS_RENEWAL'
  | 'NEW_NEEDS_INSCRIPTION';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type MembershipWithPackage = Membership & {
  package?: { area?: string | null } | null;
  transactions?: Array<{
    type: CreditTransactionType;
    amount: number;
    createdAt: Date;
  }>;
};

type StudentWithContinuityData = Student & {
  memberships?: MembershipWithPackage[];
  payments?: Array<{ concept: PaymentConcept }>;
};

@Injectable()
export class StudentContinuityService {
  constructor(
    private prisma: PrismaService,
    private businessSettingsService: BusinessSettingsService,
  ) {}

  async getStudentContinuity(
    studentId: string,
    client: PrismaClientLike = this.prisma,
  ) {
    const student = await client.student.findUnique({
      where: { id: studentId },
      include: this.studentInclude(),
    });

    if (!student) {
      return null;
    }

    return this.calculateForStudent(student, client);
  }

  async calculateForStudent(
    student: StudentWithContinuityData,
    client: PrismaClientLike = this.prisma,
  ) {
    const settings = await this.businessSettingsService.getSettings(client);
    const now = new Date();
    const hasEverPaidInscription = this.hasEverPaidInscription(student);

    if (!hasEverPaidInscription) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount: settings.renewalFeeAmount,
        continuityStatus: 'NEW_NEEDS_INSCRIPTION',
        reason: 'El alumno nunca ha pagado inscripción.',
      });
    }

    const memberships = this.getAcademicMemberships(student);

    if (memberships.length === 0) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount: settings.renewalFeeAmount,
        continuityStatus: 'EXPIRED_NEEDS_RENEWAL',
        reason: 'El alumno ya tuvo inscripción, pero no tiene membresías académicas.',
      });
    }

    if (settings.renewalPolicy === RenewalPolicy.BY_CREDITS_DEPLETION) {
      return this.calculateByCreditsDepletion(
        memberships,
        settings.renewalGraceDays,
        settings.renewalFeeAmount,
        hasEverPaidInscription,
        now,
      );
    }

    return this.calculateByMembershipExpiration(
      memberships,
      settings.renewalGraceDays,
      settings.renewalFeeAmount,
      hasEverPaidInscription,
      now,
    );
  }

  private calculateByMembershipExpiration(
    memberships: MembershipWithPackage[],
    renewalGraceDays: number,
    renewalFeeAmount: number,
    hasEverPaidInscription: boolean,
    now: Date,
  ) {
    const latestMembership = memberships[0];
    const expirationDate = latestMembership.expirationDate;

    if (
      latestMembership.status === 'ACTIVE' &&
      expirationDate &&
      expirationDate >= now
    ) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount,
        continuityStatus: 'ACTIVE',
        reason: 'La última membresía académica sigue vigente.',
      });
    }

    const graceUntil = this.addDays(expirationDate || latestMembership.createdAt, renewalGraceDays);

    if (now <= graceUntil) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount,
        graceUntil,
        continuityStatus: 'GRACE_PERIOD',
        reason: 'La membresía venció, pero el alumno sigue dentro del periodo de gracia.',
      });
    }

    return this.buildResult({
      hasEverPaidInscription,
      renewalFeeAmount,
      graceUntil,
      continuityStatus: 'EXPIRED_NEEDS_RENEWAL',
      reason: 'La membresía venció y terminó el periodo de gracia.',
    });
  }

  private calculateByCreditsDepletion(
    memberships: MembershipWithPackage[],
    renewalGraceDays: number,
    renewalFeeAmount: number,
    hasEverPaidInscription: boolean,
    now: Date,
  ) {
    const activeWithCredits = memberships.find((membership) => {
      return membership.status === 'ACTIVE'
        && membership.expirationDate >= now
        && Number(membership.availableCredits || 0) > 0;
    });

    if (activeWithCredits) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount,
        continuityStatus: 'ACTIVE',
        reason: 'El alumno tiene una membresía vigente con créditos disponibles.',
      });
    }

    const latestMembership = memberships[0];
    const anchorDate = this.getCreditsPolicyAnchorDate(latestMembership, now);
    const graceUntil = this.addDays(anchorDate, renewalGraceDays);

    if (now <= graceUntil) {
      return this.buildResult({
        hasEverPaidInscription,
        renewalFeeAmount,
        graceUntil,
        continuityStatus: 'GRACE_PERIOD',
        reason: 'El paquete terminó por créditos o vencimiento y sigue dentro del periodo de gracia.',
      });
    }

    return this.buildResult({
      hasEverPaidInscription,
      renewalFeeAmount,
      graceUntil,
      continuityStatus: 'EXPIRED_NEEDS_RENEWAL',
      reason: 'El paquete terminó y ya pasó el periodo de gracia.',
    });
  }

  private getCreditsPolicyAnchorDate(membership: MembershipWithPackage, now: Date) {
    const dates = [
      membership.depletedAt,
      membership.expirationDate && membership.expirationDate < now
        ? membership.expirationDate
        : null,
      this.getFallbackDepletionDate(membership),
      membership.createdAt,
    ].filter((date): date is Date => Boolean(date));

    return dates.sort((a, b) => a.getTime() - b.getTime())[0];
  }

  private getFallbackDepletionDate(membership: MembershipWithPackage) {
    if (Number(membership.availableCredits || 0) > 0) {
      return null;
    }

    return membership.transactions
      ?.filter((transaction) => transaction.type === CreditTransactionType.CLASS_USE)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      ?.createdAt || null;
  }

  private buildResult(input: {
    hasEverPaidInscription: boolean;
    renewalFeeAmount: number;
    continuityStatus: ContinuityStatus;
    reason: string;
    graceUntil?: Date;
  }) {
    return {
      hasEverPaidInscription: input.hasEverPaidInscription,
      isCurrentlyEnrolled: ['ACTIVE', 'GRACE_PERIOD'].includes(input.continuityStatus),
      requiresInitialInscription: input.continuityStatus === 'NEW_NEEDS_INSCRIPTION',
      requiresRenewal: input.continuityStatus === 'EXPIRED_NEEDS_RENEWAL',
      renewalFeeAmount: Number(input.renewalFeeAmount || 0),
      graceUntil: input.graceUntil?.toISOString() || null,
      continuityStatus: input.continuityStatus,
      reason: input.reason,
    };
  }

  private hasEverPaidInscription(student: StudentWithContinuityData) {
    if (student.inscriptionPaid) {
      return true;
    }

    return student.payments?.some((payment) => {
      return payment.concept === PaymentConcept.INSCRIPCION
        || payment.concept === PaymentConcept.RENEWAL;
    }) || false;
  }

  private getAcademicMemberships(student: StudentWithContinuityData) {
    return [...(student.memberships || [])]
      .filter((membership) => {
        return membership.package?.area === 'DANCE' || membership.package?.area === 'MUSIC';
      })
      .sort((a, b) => {
        return new Date(b.expirationDate || b.createdAt).getTime()
          - new Date(a.expirationDate || a.createdAt).getTime();
      });
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days || 0));
    return result;
  }

  private studentInclude() {
    return {
      memberships: {
        include: {
          package: true,
          transactions: {
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      payments: {
        select: { concept: true },
      },
    };
  }
}
