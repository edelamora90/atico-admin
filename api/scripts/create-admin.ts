import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'edelamora';
  const email = 'admin@atico.local';
  const password = 'Efren100';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.administrator.upsert({
    where: {
      username,
    },
    update: {
      email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      name: 'Administrador General',
    },
    create: {
      name: 'Administrador General',
      username,
      email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log({
    id: admin.id,
    name: admin.name,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
