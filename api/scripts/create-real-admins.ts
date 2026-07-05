import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const realAdmins = [
  {
    name: 'Jonathan Alonzo Trejo Villalobos',
    username: 'jtrejo',
    email: 'jtrejo@atico.local',
    password: 'Trejo12345',
    role: UserRole.ADMIN,
  },
  {
    name: 'Eduardo Lozano Acevedo',
    username: 'elozano',
    email: 'elozano@atico.local',
    password: 'Lozano12345',
    role: UserRole.ADMIN,
  },
];

async function ensureSuperAdmin() {
  const existingSuperAdmin = await prisma.administrator.findFirst({
    where: {
      OR: [
        { username: 'edelamora' },
        { email: 'admin@atico.local' },
        { role: UserRole.SUPER_ADMIN },
      ],
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const password = await bcrypt.hash('Efren100', 10);

  if (existingSuperAdmin) {
    return prisma.administrator.update({
      where: { id: existingSuperAdmin.id },
      data: {
        username: 'edelamora',
        email: existingSuperAdmin.email || 'admin@atico.local',
        password,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }

  return prisma.administrator.create({
    data: {
      name: 'Administrador General',
      username: 'edelamora',
      email: 'admin@atico.local',
      password,
      role: UserRole.SUPER_ADMIN,
    },
  });
}

async function main() {
  const superAdmin = await ensureSuperAdmin();

  console.log(`SUPER_ADMIN listo: ${superAdmin.username}`);

  for (const admin of realAdmins) {
    const password = await bcrypt.hash(admin.password, 10);

    const user = await prisma.administrator.upsert({
      where: { username: admin.username },
      update: {
        name: admin.name,
        email: admin.email,
        password,
        role: admin.role,
      },
      create: {
        name: admin.name,
        username: admin.username,
        email: admin.email,
        password,
        role: admin.role,
      },
    });

    console.log(`ADMIN listo: ${user.username} (${user.name})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
