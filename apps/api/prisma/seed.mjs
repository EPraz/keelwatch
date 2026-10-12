import { PrismaClient } from '@prisma/client';
import { certificateTypes } from './seed-catalog.mjs';
import { roles, selectSeedUsers } from './seed-users.mjs';
import { seedDemoDataset } from './seed-demo.mjs';

const prisma = new PrismaClient();

async function seed() {
  if (process.argv.includes('--demo')) return seedDemoDataset(prisma);
  const users = selectSeedUsers(process.env);
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role,
    });
  }

  for (const certificateType of certificateTypes) {
    await prisma.certificateType.upsert({
      where: { code: certificateType.code },
      update: {
        name: certificateType.name,
        isRequired: certificateType.isRequired,
      },
      create: certificateType,
    });
  }

  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { externalSubject: user.externalSubject },
      update: {
        displayName: user.displayName,
        email: user.email,
        status: user.status,
      },
      create: {
        externalSubject: user.externalSubject,
        displayName: user.displayName,
        email: user.email,
        status: user.status,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: user.roleCode } });

    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: savedUser.id, roleId: role.id } },
      update: { source: 'SYSTEM_SEED', assignedById: null },
      create: {
        userId: savedUser.id,
        roleId: role.id,
        source: 'SYSTEM_SEED',
      },
    });
  }
}

seed()
  .then((result) =>
    console.log(result ?? 'Synthetic access identities and catalog seeded.'),
  )
  .catch(() => {
    console.error(
      'Seed failed. Check the target database, base accounts/catalog and reserved-reference conflicts. No connection details emitted.',
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
