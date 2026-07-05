import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const receptionUser = {
  name: 'Recepción QA',
  username: 'recepcion.qa',
  password: 'Recepcion12345',
  role: UserRole.RECEPCION,
};

async function main() {
  const existingUser = await prisma.administrator.findUnique({
    where: {
      username: receptionUser.username,
    },
  });

  const password = await bcrypt.hash(receptionUser.password, 10);

  if (existingUser) {
    const user = await prisma.administrator.update({
      where: {
        username: receptionUser.username,
      },
      data: {
        password,
        role: receptionUser.role,
      },
    });

    console.log(`Usuario existente actualizado: ${user.username} (${user.role})`);
    return;
  }

  const user = await prisma.administrator.create({
    data: {
      name: receptionUser.name,
      username: receptionUser.username,
      password,
      role: receptionUser.role,
    },
  });

  console.log(`Usuario creado: ${user.username} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
