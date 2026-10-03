import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const roles = [
  { code: 'OPERATIONS_MANAGER', name: 'Operations Manager' },
  { code: 'AUDITOR', name: 'Auditor' },
];

const localUsers = [
  {
    externalSubject: 'local:operations-manager',
    displayName: 'Morgan Reed',
    email: 'morgan.reed@example.test',
    status: 'ACTIVE',
    roleCode: 'OPERATIONS_MANAGER',
  },
  {
    externalSubject: 'local:auditor',
    displayName: 'Avery Chen',
    email: 'avery.chen@example.test',
    status: 'ACTIVE',
    roleCode: 'AUDITOR',
  },
  {
    externalSubject: 'local:inactive',
    displayName: 'Inactive Demo User',
    email: 'inactive.user@example.test',
    status: 'INACTIVE',
    roleCode: 'AUDITOR',
  },
];

function productionUsers() {
  const operationsManagerSubject = process.env.SEED_OPERATIONS_MANAGER_SUBJECT;
  const auditorSubject = process.env.SEED_AUDITOR_SUBJECT;
  if (!operationsManagerSubject || !auditorSubject) {
    throw new Error(
      'Production seed requires both synthetic Auth0 demo-account subject values.',
    );
  }
  if (operationsManagerSubject === auditorSubject) {
    throw new Error('Production seed requires two distinct synthetic Auth0 subjects.');
  }

  return [
    {
      externalSubject: operationsManagerSubject,
      displayName: 'Morgan Reed',
      email: 'morgan.reed@example.test',
      status: 'ACTIVE',
      roleCode: 'OPERATIONS_MANAGER',
    },
    {
      externalSubject: auditorSubject,
      displayName: 'Avery Chen',
      email: 'avery.chen@example.test',
      status: 'ACTIVE',
      roleCode: 'AUDITOR',
    },
  ];
}

async function seed() {
  const users = process.env.NODE_ENV === 'production' ? productionUsers() : localUsers;
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role,
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
  .then(() => console.log('Synthetic access identities seeded.'))
  .finally(async () => prisma.$disconnect());
