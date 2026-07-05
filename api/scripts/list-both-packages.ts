import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packages = await prisma.package.findMany({
    where: {
      area: 'BOTH',
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      area: true,
    },
  });

  if (packages.length === 0) {
    console.log('No hay paquetes con area BOTH.');
    return;
  }

  console.table(packages);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
