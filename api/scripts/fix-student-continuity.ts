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
  if (process.env.CONFIRM_FIX_STUDENT_CONTINUITY !== 'true') {
    throw new Error(
      'Este script modifica alumnos históricos. Ejecuta con CONFIRM_FIX_STUDENT_CONTINUITY=true.',
    );
  }

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

  const candidates = students.filter((student) => {
    const continuity = calculateContinuity(student, settings);

    return continuity.continuityStatus === 'NEW_NEEDS_INSCRIPTION'
      && hasRealAcademicHistory(student)
      && (!student.enrolled || !student.inscriptionPaid);
  });

  console.log(`Candidatos a normalizar: ${candidates.length}`);

  const updatedRows: Array<{
    id: string;
    name: string;
    enrolled: boolean;
    inscriptionPaid: boolean;
    inscriptionAmount: number;
  }> = [];

  for (const student of candidates) {
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        enrolled: true,
        inscriptionPaid: true,
        inscriptionAmount: Number(student.inscriptionAmount || 0),
      },
      select: {
        id: true,
        name: true,
        enrolled: true,
        inscriptionPaid: true,
        inscriptionAmount: true,
      },
    });

    updatedRows.push(updated);
  }

  console.table(updatedRows);
  console.log('No se crearon pagos retroactivos ni se alteraron créditos, membresías o finanzas.');
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
