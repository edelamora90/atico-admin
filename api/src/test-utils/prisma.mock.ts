const modelNames = [
  'administrator',
  'attendance',
  'auditLog',
  'businessSettings',
  'cashRegisterClose',
  'class',
  'classSession',
  'course',
  'creditTransaction',
  'event',
  'expense',
  'membership',
  'notification',
  'package',
  'payment',
  'posSale',
  'posSaleItem',
  'reservation',
  'room',
  'roomItem',
  'roomReservation',
  'storeProduct',
  'storeSale',
  'student',
  'teacher',
  'teacherPaymentRange',
  'teacherPaymentSetting',
];

const methodNames = [
  'aggregate',
  'count',
  'create',
  'createMany',
  'delete',
  'deleteMany',
  'findFirst',
  'findMany',
  'findUnique',
  'groupBy',
  'update',
  'updateMany',
  'upsert',
];

export function createPrismaMock() {
  const prisma: any = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }

      return Promise.all(callback);
    }),
  };

  for (const modelName of modelNames) {
    prisma[modelName] = {};

    for (const methodName of methodNames) {
      prisma[modelName][methodName] = jest.fn();
    }
  }

  return prisma;
}
