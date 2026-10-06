import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../src/audit/application/audit-event.writer';
import { ComplianceModule } from '../src/compliance/compliance.module';
import { PrismaNotificationRepository } from '../src/compliance/infrastructure/prisma-notification.repository';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../src/compliance/ports/compliance.repository';
import { PrismaModule } from '../src/database/prisma.module';
import { PrismaService } from '../src/database/prisma.service';

const repositoryEnvironmentFile = resolve(__dirname, '../../../.env');
if (existsSync(repositoryEnvironmentFile)) process.loadEnvFile(repositoryEnvironmentFile);
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'local';
process.env.ACCESS_STORE = 'prisma';
process.env.WEB_ORIGIN = 'http://localhost:5173';

const runPostgresTests = process.env.RUN_POSTGRES_TESTS === 'true';

describe.skipIf(!runPostgresTests)('Compliance PostgreSQL integration', () => {
  let app: INestApplication;
  let module: TestingModule;
  let database: PrismaService;
  let httpServer: Server;
  let managerUserId: string;
  const registries = new Set<string>();
  const references = new Set<string>();
  const correlationIds = new Set<string>();
  const notificationRunIds = new Set<string>();
  const testRunId = randomUUID();

  async function unusedRegistry(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const registryNumber = `KW-${String(randomInt(800_000, 900_000)).padStart(6, '0')}`;
      if (
        !registries.has(registryNumber) &&
        (await database.vessel.count({ where: { registryNumber } })) === 0
      ) {
        registries.add(registryNumber);
        return registryNumber;
      }
    }
    throw new Error('Could not allocate an isolated synthetic registry number.');
  }

  function reference(label: string): string {
    const value = `SE-PG-${testRunId.slice(0, 8)}-${label}`;
    references.add(value);
    return value;
  }

  function correlationId(label: string): string {
    const value = `compliance-postgres-${testRunId}-${label}`;
    correlationIds.add(value);
    return value;
  }

  async function createVessel(label: string): Promise<string> {
    const registryNumber = await unusedRegistry();
    const response = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId(`vessel-${label}`))
      .send({ name: `MV Compliance ${label}`, registryNumber })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  beforeAll(async () => {
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    database = module.get(PrismaService);
    httpServer = app.getHttpServer() as Server;
    managerUserId = (
      await database.user.findUniqueOrThrow({
        where: { externalSubject: 'local:operations-manager' },
        select: { id: true },
      })
    ).id;
  });

  afterEach(async () => {
    await database.auditEvent.deleteMany({
      where: { correlationId: { in: [...correlationIds] } },
    });
    await database.certificate.deleteMany({
      where: { referenceNumber: { in: [...references] } },
    });
    await database.vessel.deleteMany({
      where: { registryNumber: { in: [...registries] } },
    });
    registries.clear();
    references.clear();
    correlationIds.clear();
    notificationRunIds.clear();
  });

  afterAll(async () => app.close());

  it('commits a certificate and its audit event, then derives the workspace', async () => {
    const vesselId = await createVessel('Commit');
    const certificateReference = reference('commit');
    const requestId = correlationId('certificate-commit');
    const response = await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', requestId)
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: certificateReference,
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);
    const body = response.body as {
      status: string;
      certificates: readonly { id: string }[];
    };
    expect(body.status).toBe('VALID');
    expect(body.certificates).toHaveLength(1);
    await expect(
      database.auditEvent.count({
        where: {
          entityId: body.certificates[0]!.id,
          action: 'CERTIFICATE_CREATED',
          actorUserId: managerUserId,
          correlationId: requestId,
        },
      }),
    ).resolves.toBe(1);

    await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}/compliance`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200)
      .expect(({ body: workspace }) => {
        expect(workspace).toMatchObject({
          status: 'VALID',
          certificates: [{ referenceNumber: certificateReference }],
        });
      });

    await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200)
      .expect((result) => {
        const detail = result.body as {
          readonly activity: readonly { readonly action: string }[];
        };
        expect(detail.activity.map((event) => event.action)).toContain(
          'CERTIFICATE_CREATED',
        );
      });
  });

  it('enforces the relevant duplicate constraint without a second event', async () => {
    const vesselId = await createVessel('Unique');
    const certificateReference = reference('unique');
    const payload = {
      certificateTypeCode: 'SAFETY_EQUIPMENT',
      referenceNumber: certificateReference,
      issuer: 'Northstar Safety Registry',
      issuedOn: '2026-09-01',
      expiresOn: '2099-09-01',
    };
    await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('unique-first'))
      .send(payload)
      .expect(201);
    await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('unique-second'))
      .send(payload)
      .expect(409);

    await expect(
      database.certificate.count({
        where: { vesselId, referenceNumber: certificateReference },
      }),
    ).resolves.toBe(1);
    await expect(
      database.auditEvent.count({
        where: {
          action: 'CERTIFICATE_CREATED',
          metadata: { path: ['vesselId'], equals: vesselId },
        },
      }),
    ).resolves.toBe(1);
  });

  it('derives the filtered fleet-wide queue from retained PostgreSQL records', async () => {
    const registryNumber = await unusedRegistry();
    const vesselResponse = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('queue-vessel'))
      .send({ name: 'MV Compliance Queue', registryNumber })
      .expect(201);
    const vesselId = (vesselResponse.body as { id: string }).id;

    await request(httpServer)
      .get(`/api/v1/compliance?status=MISSING&search=${registryNumber}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          total: 1,
          items: [{ vessel: { id: vesselId, registryNumber }, status: 'MISSING' }],
        });
      });

    const certificateReference = reference('queue');
    await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('queue-certificate'))
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: certificateReference,
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);
    await request(httpServer)
      .get(`/api/v1/compliance?status=VALID&search=${registryNumber}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          total: 1,
          items: [{ vessel: { id: vesselId }, status: 'VALID' }],
        });
      });
  });

  it('updates and archives evidence with one audit event per change', async () => {
    const vesselId = await createVessel('Lifecycle');
    const certificateReference = reference('lifecycle');
    const created = await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('lifecycle-create'))
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: certificateReference,
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);
    const certificateId = (created.body as { certificates: readonly { id: string }[] })
      .certificates[0]!.id;
    const updateCorrelationId = correlationId('lifecycle-update');
    await request(httpServer)
      .put(`/api/v1/vessels/${vesselId}/certificates/${certificateId}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', updateCorrelationId)
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: certificateReference,
        issuer: 'Northstar Registry Updated',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(200);
    await expect(
      database.certificate.findUniqueOrThrow({
        where: { id: certificateId },
        select: { issuer: true, archivedAt: true },
      }),
    ).resolves.toEqual({ issuer: 'Northstar Registry Updated', archivedAt: null });
    await expect(
      database.auditEvent.count({
        where: {
          entityId: certificateId,
          action: 'CERTIFICATE_UPDATED',
          correlationId: updateCorrelationId,
        },
      }),
    ).resolves.toBe(1);

    const archiveCorrelationId = correlationId('lifecycle-archive');
    const archived = await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates/${certificateId}/archive`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', archiveCorrelationId)
      .expect(200);
    expect((archived.body as { status: string }).status).toBe('MISSING');
    const archivedRecord = await database.certificate.findUniqueOrThrow({
      where: { id: certificateId },
      select: { archivedAt: true },
    });
    expect(archivedRecord.archivedAt).toBeInstanceOf(Date);
    await expect(
      database.auditEvent.count({
        where: {
          entityId: certificateId,
          action: 'CERTIFICATE_ARCHIVED',
          correlationId: archiveCorrelationId,
        },
      }),
    ).resolves.toBe(1);

    await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates/${certificateId}/archive`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('lifecycle-archive-repeat'))
      .expect(409);
    const detail = await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    const actions = (
      detail.body as { activity: readonly { action: string }[] }
    ).activity.map((event) => event.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'CERTIFICATE_CREATED',
        'CERTIFICATE_UPDATED',
        'CERTIFICATE_ARCHIVED',
      ]),
    );
  });

  it('rolls the certificate back when the audit append fails', async () => {
    const vesselId = await createVessel('Rollback');
    const certificateReference = reference('rollback');
    const requestId = correlationId('certificate-rollback');
    const failingAudit: AuditEventWriter = {
      append: () => Promise.reject(new Error('Synthetic audit failure.')),
    };
    const isolatedModule = await Test.createTestingModule({
      imports: [PrismaModule, ComplianceModule],
    })
      .overrideProvider(AUDIT_EVENT_WRITER)
      .useValue(failingAudit)
      .compile();

    try {
      const repository = isolatedModule.get<ComplianceRepository>(COMPLIANCE_REPOSITORY);
      await expect(
        repository.createWithAudit({
          vesselId,
          certificateTypeCode: 'SAFETY_EQUIPMENT',
          referenceNumber: certificateReference,
          issuer: 'Northstar Safety Registry',
          issuedOn: new Date('2026-09-01T00:00:00.000Z'),
          expiresOn: new Date('2099-09-01T00:00:00.000Z'),
          actorUserId: managerUserId,
          correlationId: requestId,
        }),
      ).rejects.toThrow('Synthetic audit failure.');
    } finally {
      await isolatedModule.close();
    }

    await expect(
      database.certificate.count({
        where: { vesselId, referenceNumber: certificateReference },
      }),
    ).resolves.toBe(0);
    await expect(
      database.auditEvent.count({ where: { correlationId: requestId } }),
    ).resolves.toBe(0);
  });

  it('rolls certificate edits and archives back when audit append fails', async () => {
    const vesselId = await createVessel('LifecycleRollback');
    const certificateReference = reference('lifecycle-rollback');
    const created = await request(httpServer)
      .post(`/api/v1/vessels/${vesselId}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', correlationId('lifecycle-rollback-create'))
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: certificateReference,
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);
    const certificateId = (created.body as { certificates: readonly { id: string }[] })
      .certificates[0]!.id;
    const failingAudit: AuditEventWriter = {
      append: () => Promise.reject(new Error('Synthetic audit failure.')),
    };
    const isolatedModule = await Test.createTestingModule({
      imports: [PrismaModule, ComplianceModule],
    })
      .overrideProvider(AUDIT_EVENT_WRITER)
      .useValue(failingAudit)
      .compile();
    const updateRequestId = correlationId('lifecycle-rollback-update');
    const archiveRequestId = correlationId('lifecycle-rollback-archive');

    try {
      const repository = isolatedModule.get<ComplianceRepository>(COMPLIANCE_REPOSITORY);
      await expect(
        repository.updateWithAudit({
          vesselId,
          certificateId,
          certificateTypeCode: 'SAFETY_EQUIPMENT',
          referenceNumber: certificateReference,
          issuer: 'Forbidden Rolled Back Update',
          issuedOn: new Date('2026-09-01T00:00:00.000Z'),
          expiresOn: new Date('2099-09-01T00:00:00.000Z'),
          actorUserId: managerUserId,
          correlationId: updateRequestId,
        }),
      ).rejects.toThrow('Synthetic audit failure.');
      await expect(
        repository.archiveWithAudit({
          vesselId,
          certificateId,
          actorUserId: managerUserId,
          correlationId: archiveRequestId,
        }),
      ).rejects.toThrow('Synthetic audit failure.');
    } finally {
      await isolatedModule.close();
    }

    await expect(
      database.certificate.findUniqueOrThrow({
        where: { id: certificateId },
        select: { issuer: true, archivedAt: true },
      }),
    ).resolves.toEqual({ issuer: 'Northstar Safety Registry', archivedAt: null });
    await expect(
      database.auditEvent.count({
        where: { correlationId: { in: [updateRequestId, archiveRequestId] } },
      }),
    ).resolves.toBe(0);
  });

  it('reconciles notifications idempotently without changing retained records', async () => {
    const vesselId = await createVessel('NotificationJob');
    const certificateType = await database.certificateType.findUniqueOrThrow({
      where: { code: 'SAFETY_EQUIPMENT' },
    });
    async function snapshot() {
      return {
        notifications: await database.complianceNotification.findMany({
          orderBy: { id: 'asc' },
        }),
        runs: await database.complianceNotificationRun.findMany({
          orderBy: { id: 'asc' },
        }),
      };
    }
    const retained = await snapshot();
    const rollback = new Error('Rollback isolated notification test.');

    await expect(
      database.$transaction(async (transaction) => {
        // Bind repository transactions to the outer rollback-only transaction:
        // reconciliation deliberately touches the whole watch, not just this fixture.
        const scopedDatabase = {
          complianceNotificationRun: transaction.complianceNotificationRun,
          $transaction: <T>(
            operation: (client: Prisma.TransactionClient) => Promise<T>,
          ) => operation(transaction),
        } as unknown as PrismaService;
        const repository = new PrismaNotificationRepository(scopedDatabase);
        const condition = {
          vesselId,
          certificateTypeId: certificateType.id,
          conditionKey: `test:${testRunId}:${vesselId}`,
          status: 'MISSING' as const,
          reason: 'Synthetic missing qualification evidence.',
          asOf: new Date('2026-10-06T00:00:00Z'),
        };

        for (const createdCount of [1, 0]) {
          const queued = await repository.enqueue(managerUserId);
          expect(queued.created).toBe(true);
          expect(await repository.markRunning(queued.run.id)).toBe(true);
          const completed = await repository.complete(queued.run.id, [condition]);
          expect(completed).toMatchObject({
            status: 'SUCCEEDED',
            createdCount,
            skippedCount: 1 - createdCount,
          });
          await expect(
            transaction.complianceNotification.count({
              where: { vesselId, status: 'MISSING', resolvedAt: null },
            }),
          ).resolves.toBe(1);
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);

    expect(await snapshot()).toEqual(retained);
  });
});
