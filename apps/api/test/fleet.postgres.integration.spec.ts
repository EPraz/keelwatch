import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
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
import { PrismaModule } from '../src/database/prisma.module';
import { PrismaService } from '../src/database/prisma.service';
import { FleetModule } from '../src/fleet/fleet.module';
import {
  VESSEL_REPOSITORY,
  type VesselRepository,
} from '../src/fleet/ports/vessel.repository';

const repositoryEnvironmentFile = resolve(__dirname, '../../../.env');
if (existsSync(repositoryEnvironmentFile)) process.loadEnvFile(repositoryEnvironmentFile);
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'local';
process.env.ACCESS_STORE = 'prisma';
process.env.WEB_ORIGIN = 'http://localhost:5173';

const runPostgresTests = process.env.RUN_POSTGRES_TESTS === 'true';

describe.skipIf(!runPostgresTests)('Fleet PostgreSQL integration', () => {
  let app: INestApplication;
  let module: TestingModule;
  let database: PrismaService;
  let httpServer: Server;
  let managerUserId: string;
  const registries = new Set<string>();
  const correlationIds = new Set<string>();
  const testRunId = randomUUID();

  async function unusedRegistry(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const registryNumber = `KW-${String(randomInt(700_000, 800_000)).padStart(6, '0')}`;
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

  function correlationId(label: string): string {
    const value = `fleet-postgres-${testRunId}-${label}`;
    correlationIds.add(value);
    return value;
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
    await database.vessel.deleteMany({
      where: { registryNumber: { in: [...registries] } },
    });
    registries.clear();
    correlationIds.clear();
  });

  afterAll(async () => app.close());

  it('commits vessel creation and its audit event, then lists it for an Auditor', async () => {
    const registryNumber = await unusedRegistry();
    const requestId = correlationId('happy-path');

    const createResponse = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', requestId)
      .send({
        name: '  MV Integration Star  ',
        registryNumber: registryNumber.toLowerCase(),
      })
      .expect(201);
    const created = createResponse.body as { id: string; registryNumber: string };

    expect(created.registryNumber).toBe(registryNumber);
    await expect(
      database.auditEvent.count({
        where: {
          entityId: created.id,
          action: 'VESSEL_CREATED',
          actorUserId: managerUserId,
          correlationId: requestId,
        },
      }),
    ).resolves.toBe(1);

    const listResponse = await request(httpServer)
      .get('/api/v1/vessels?page=1&pageSize=100')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    const page = listResponse.body as {
      items: readonly { registryNumber: string }[];
    };
    expect(page.items).toContainEqual(expect.objectContaining({ registryNumber }));
  });

  it('enforces registry uniqueness without producing a second audit event', async () => {
    const registryNumber = await unusedRegistry();
    const firstRequestId = correlationId('duplicate-first');
    const secondRequestId = correlationId('duplicate-second');
    const payload = { name: 'MV Duplicate Check', registryNumber };

    const first = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', firstRequestId)
      .send(payload)
      .expect(201);
    const vesselId = (first.body as { id: string }).id;

    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', secondRequestId)
      .send(payload)
      .expect(409);

    await expect(database.vessel.count({ where: { registryNumber } })).resolves.toBe(1);
    await expect(
      database.auditEvent.count({ where: { entityId: vesselId } }),
    ).resolves.toBe(1);
  });

  it('updates vessel detail and its sanitized activity in one transaction', async () => {
    const registryNumber = await unusedRegistry();
    const createRequestId = correlationId('detail-create');
    const updateRequestId = correlationId('detail-update');
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', createRequestId)
      .send({ name: 'MV Detail Check', registryNumber })
      .expect(201);
    const vesselId = (created.body as { id: string }).id;

    await request(httpServer)
      .put(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', updateRequestId)
      .send({ name: '  MV Detail Star  ', registryNumber: registryNumber.toLowerCase() })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'MV Detail Star',
          registryNumber,
        });
      });

    const detail = await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(detail.body).toMatchObject({
      id: vesselId,
      activity: [
        { action: 'VESSEL_UPDATED', changedFields: ['name'] },
        { action: 'VESSEL_CREATED' },
      ],
    });
    await expect(
      database.auditEvent.count({ where: { entityId: vesselId } }),
    ).resolves.toBe(2);
  });

  it('rolls an edit back when its registry conflicts with another vessel', async () => {
    const firstRegistry = await unusedRegistry();
    const secondRegistry = await unusedRegistry();
    const firstRequestId = correlationId('edit-conflict-first');
    const secondRequestId = correlationId('edit-conflict-second');
    const conflictRequestId = correlationId('edit-conflict-attempt');
    const first = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', firstRequestId)
      .send({ name: 'MV First Registry', registryNumber: firstRegistry })
      .expect(201);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', secondRequestId)
      .send({ name: 'MV Second Registry', registryNumber: secondRegistry })
      .expect(201);

    await request(httpServer)
      .put(`/api/v1/vessels/${(first.body as { id: string }).id}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', conflictRequestId)
      .send({ name: 'MV Conflict Attempt', registryNumber: secondRegistry })
      .expect(409);

    await expect(
      database.vessel.findUniqueOrThrow({
        where: { registryNumber: firstRegistry },
        select: { name: true },
      }),
    ).resolves.toEqual({ name: 'MV First Registry' });
    await expect(
      database.auditEvent.count({ where: { correlationId: conflictRequestId } }),
    ).resolves.toBe(0);
  });

  it('denies an Auditor edit without changing vessel data or activity', async () => {
    const registryNumber = await unusedRegistry();
    const createRequestId = correlationId('forbidden-edit-create');
    const forbiddenRequestId = correlationId('forbidden-edit');
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', createRequestId)
      .send({ name: 'MV Protected Detail', registryNumber })
      .expect(201);
    const vesselId = (created.body as { id: string }).id;

    await request(httpServer)
      .put(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .set('X-Correlation-Id', forbiddenRequestId)
      .send({ name: 'MV Unauthorized Edit', registryNumber })
      .expect(403);

    await expect(
      database.vessel.findUniqueOrThrow({
        where: { id: vesselId },
        select: { name: true },
      }),
    ).resolves.toEqual({ name: 'MV Protected Detail' });
    await expect(
      database.auditEvent.count({ where: { entityId: vesselId } }),
    ).resolves.toBe(1);
    await expect(
      database.auditEvent.count({ where: { correlationId: forbiddenRequestId } }),
    ).resolves.toBe(0);
  });

  it('writes neither vessel nor audit event for invalid or forbidden requests', async () => {
    const forbiddenRegistry = await unusedRegistry();
    const invalidRequestId = correlationId('invalid');
    const forbiddenRequestId = correlationId('forbidden');

    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', invalidRequestId)
      .send({ name: 'A', registryNumber: 'invalid' })
      .expect(400);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.auditor')
      .set('X-Correlation-Id', forbiddenRequestId)
      .send({ name: 'MV Read Only', registryNumber: forbiddenRegistry })
      .expect(403);

    await expect(
      database.vessel.count({
        where: { registryNumber: { in: ['invalid', forbiddenRegistry] } },
      }),
    ).resolves.toBe(0);
    await expect(
      database.auditEvent.count({
        where: { correlationId: { in: [invalidRequestId, forbiddenRequestId] } },
      }),
    ).resolves.toBe(0);
  });

  it('rolls the vessel back when the audit write fails', async () => {
    const registryNumber = await unusedRegistry();
    const requestId = correlationId('audit-rollback');
    const failingAudit: AuditEventWriter = {
      append: () => Promise.reject(new Error('Synthetic audit failure.')),
    };
    const isolatedModule = await Test.createTestingModule({
      imports: [PrismaModule, FleetModule],
    })
      .overrideProvider(AUDIT_EVENT_WRITER)
      .useValue(failingAudit)
      .compile();

    try {
      const repository = isolatedModule.get<VesselRepository>(VESSEL_REPOSITORY);
      await expect(
        repository.createWithAudit({
          name: 'MV Atomicity Check',
          registryNumber,
          actorUserId: managerUserId,
          correlationId: requestId,
        }),
      ).rejects.toThrow('Synthetic audit failure.');
    } finally {
      await isolatedModule.close();
    }

    await expect(database.vessel.count({ where: { registryNumber } })).resolves.toBe(0);
    await expect(
      database.auditEvent.count({ where: { correlationId: requestId } }),
    ).resolves.toBe(0);
  });

  it('rolls an edit back when its audit write fails', async () => {
    const registryNumber = await unusedRegistry();
    const createRequestId = correlationId('update-rollback-create');
    const updateRequestId = correlationId('update-rollback');
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', createRequestId)
      .send({ name: 'MV Before Rollback', registryNumber })
      .expect(201);
    const vesselId = (created.body as { id: string }).id;
    const failingAudit: AuditEventWriter = {
      append: () => Promise.reject(new Error('Synthetic audit failure.')),
    };
    const isolatedModule = await Test.createTestingModule({
      imports: [PrismaModule, FleetModule],
    })
      .overrideProvider(AUDIT_EVENT_WRITER)
      .useValue(failingAudit)
      .compile();

    try {
      const repository = isolatedModule.get<VesselRepository>(VESSEL_REPOSITORY);
      await expect(
        repository.updateWithAudit({
          id: vesselId,
          name: 'MV After Rollback',
          registryNumber,
          actorUserId: managerUserId,
          correlationId: updateRequestId,
        }),
      ).rejects.toThrow('Synthetic audit failure.');
    } finally {
      await isolatedModule.close();
    }

    await expect(
      database.vessel.findUniqueOrThrow({
        where: { id: vesselId },
        select: { name: true },
      }),
    ).resolves.toEqual({ name: 'MV Before Rollback' });
    await expect(
      database.auditEvent.count({ where: { correlationId: updateRequestId } }),
    ).resolves.toBe(0);
  });
});
