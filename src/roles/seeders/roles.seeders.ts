import { PrismaClient } from '@prisma/client';
import { RolesEnum } from '../enum/roles.enum';

const prisma = new PrismaClient();

const RolesSeeders = async () => {
  const roles = [RolesEnum.ADMIN, RolesEnum.USER];

  for (const roleName of roles) {
    const existingRole = await prisma.roles.findUnique({
      where: { name: roleName },
    });

    if (!existingRole) {
      await prisma.roles.create({
        data: { name: roleName },
      });
      console.log(`Role created: ${roleName}`);
    } else {
      console.log(`Role already exists: ${roleName}`);
    }
  }
};

RolesSeeders()
  .then(() => {
    console.log('Seeding completed');
  })
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
