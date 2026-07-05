import {
  CreditTransactionType,
  MembershipStatus,
  PaymentConcept,
  PrismaClient,
  RenewalPolicy,
} from '@prisma/client';

type ContinuityStatus =
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'EXPIRED_NEEDS_RENEWAL'
  | 'NEW_NEEDS_INSCRIPTION';

type StudentContinuityRecord = {
  id: string;
  name: string;
  enrolled: boolean;
  inscriptionPaid: boolean;
  inscriptionAmount: number;
  memberships: Array<{
    status: MembershipStatus;
    availableCredits: number;
    expirationDate: Date;
    createdAt: Date;
    depletedAt: Date | null;
    package: { area: string } | null;
    transactions: Array<{
      type: CreditTransactionType;
      createdAt: Date;
    }>;
  }>;
  payments: Array<{ concept: PaymentConcept }>;
  reservations: Array<unknown>;
  attendances: Array<unknown>;
};

const prisma = new PrismaClient();
const ACADEMIC_HISTORY_PAYMENT_CONCEPTS = new Set<PaymentConcept>([
  PaymentConcept.INSCRIPCION,
  PaymentConcept.RENEWAL,
  PaymentConcept.PAQUETE,
  PaymentConcept.DAY_PASS,
  PaymentConcept.CURSO,
  PaymentConcept.EVENTO,
]);

async function main() {
  const settings = await getBusinessSettings();
  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    include: {
      memberships: {
        include: {
          package: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      payments: true,
      reservations: true,
      attendances: true,
    },
  });

  const rows = students
    .map((student) => {
      const continuity = calculateContinuity(student, settings);
      const membershipsCount = student.memberships.length;
      const activeMembershipsCount = student.memberships.filter((membership) => {
        return membership.status === MembershipStatus.ACTIVE
          && membership.expirationDate >= new Date();
      }).length;
      const paymentsCount = student.payments.length;
      const hasFormalContinuityPayment = hasInscriptionOrRenewalPayment(student.payments);
      const hasAcademicHistory = hasRealAcademicHistory(student);
      const problems: string[] = [];

      if (membershipsCount > 0 && continuity.continuityStatus === 'NEW_NEEDS_INSCRIPTION') {
        problems.push('A: membresías con continuidad inicial pendiente');
      }

      if (student.enrolled && !hasFormalContinuityPayment && !student.inscriptionPaid) {
        problems.push('B: enrolled=true sin pago/flag de inscripción o renovación');
      }

      if (activeMembershipsCount > 0 && !student.enrolled) {
        problems.push('C: membresía activa con enrolled=false');
      }

      if (student.inscriptionPaid && continuity.continuityStatus === 'NEW_NEEDS_INSCRIPTION') {
        problems.push('D: inscriptionPaid=true pero continuidad inicial pendiente');
      }

      if (hasAcademicHistory && continuity.continuityStatus === 'NEW_NEEDS_INSCRIPTION') {
        problems.push('E: historial académico sin continuidad clara');
      }

      if (problems.length === 0) {
        return null;
      }

      return {
        studentId: student.id,
        name: student.name,
        enrolled: student.enrolled,
        inscriptionPaid: student.inscriptionPaid,
        membershipsCount,
        activeMembershipsCount,
        paymentsCount,
        continuityStatus: continuity.continuityStatus,
        suggestedFix: getSuggestedFix(problems, hasAcademicHistory),
        findings: problems.join(' | '),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  console.log(`Alumnos auditados: ${students.length}`);
  console.log(`Inconsistencias encontradas: ${rows.length}`);
  console.table(rows);
}

async function getBusinessSettings() {
  return prisma.businessSettings.findFirst()
    .then((settings) => settings || {
      renewalPolicy: RenewalPolicy.BY_MEMBERSHIP_EXPIRATION,
      renewalGraceDays: 15,
      renewalFeeAmount: 100,
    });
}

function calculateContinuity(
  student: StudentContinuityRecord,
  settings: Awaited<ReturnType<typeof getBusinessSettings>>,
): { continuityStatus: ContinuityStatus } {
  const hasContinuity = student.inscriptionPaid
    || hasInscriptionOrRenewalPayment(student.payments);

  if (!hasContinuity) {
    return { continuityStatus: 'NEW_NEEDS_INSCRIPTION' };
  }

  const memberships = [...student.memberships]
    .filter((membership) => {
      return membership.package?.area === 'DANCE' || membership.package?.area === 'MUSIC';
    })
    .sort((a, b) => {
      return new Date(b.expirationDate || b.createdAt).getTime()
        - new Date(a.expirationDate || a.createdAt).getTime();
    });

  if (memberships.length === 0) {
    return { continuityStatus: 'EXPIRED_NEEDS_RENEWAL' };
  }

  const now = new Date();

  if (settings.renewalPolicy === RenewalPolicy.BY_CREDITS_DEPLETION) {
    const activeWithCredits = memberships.find((membership) => {
      return membership.status === MembershipStatus.ACTIVE
        && membership.expirationDate >= now
        && Number(membership.availableCredits || 0) > 0;
    });

    if (activeWithCredits) {
      return { continuityStatus: 'ACTIVE' };
    }

    const anchorDate = getCreditsPolicyAnchorDate(memberships[0], now);
    return now <= addDays(anchorDate, settings.renewalGraceDays)
      ? { continuityStatus: 'GRACE_PERIOD' }
      : { continuityStatus: 'EXPIRED_NEEDS_RENEWAL' };
  }

  const latestMembership = memberships[0];

  if (
    latestMembership.status === MembershipStatus.ACTIVE
    && latestMembership.expirationDate >= now
  ) {
    return { continuityStatus: 'ACTIVE' };
  }

  const graceUntil = addDays(
    latestMembership.expirationDate || latestMembership.createdAt,
    settings.renewalGraceDays,
  );

  return now <= graceUntil
    ? { continuityStatus: 'GRACE_PERIOD' }
    : { continuityStatus: 'EXPIRED_NEEDS_RENEWAL' };
}

function hasInscriptionOrRenewalPayment(payments: Array<{ concept: PaymentConcept }>) {
  return payments.some((payment) => {
    return payment.concept === PaymentConcept.INSCRIPCION
      || payment.concept === PaymentConcept.RENEWAL;
  });
}

function hasRealAcademicHistory(student: StudentContinuityRecord) {
  return student.memberships.length > 0
    || student.reservations.length > 0
    || student.attendances.length > 0
    || student.payments.some((payment) => {
      return ACADEMIC_HISTORY_PAYMENT_CONCEPTS.has(payment.concept);
    });
}

function getCreditsPolicyAnchorDate(
  membership: StudentContinuityRecord['memberships'][number],
  now: Date,
) {
  const classUseDate = membership.transactions
    ?.filter((transaction) => transaction.type === CreditTransactionType.CLASS_USE)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    ?.createdAt || null;

  const dates = [
    membership.depletedAt,
    membership.expirationDate && membership.expirationDate < now
      ? membership.expirationDate
      : null,
    Number(membership.availableCredits || 0) <= 0 ? classUseDate : null,
    membership.createdAt,
  ].filter((date): date is Date => Boolean(date));

  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function getSuggestedFix(problems: string[], hasAcademicHistory: boolean) {
  if (hasAcademicHistory && problems.some((problem) => {
    return problem.startsWith('A:') || problem.startsWith('C:') || problem.startsWith('E:');
  })) {
    return 'Normalizar flags históricos: enrolled=true, inscriptionPaid=true, inscriptionAmount=0 si no hay monto.';
  }

  return 'Revisar manualmente antes de corregir.';
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
