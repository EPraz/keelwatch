import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AUDIT_EVENT_READER,
  type AuditActivityRecord,
  type AuditEventReader,
} from '../src/audit/application/audit-event.reader';
import {
  VesselRegistryConflictError,
  type VesselRecord,
} from '../src/fleet/domain/vessel';
import {
  VESSEL_REPOSITORY,
  type CreateVesselRecordInput,
  type ListVesselsInput,
  type UpdateVesselRecordInput,
  type VesselListRecord,
  type VesselRepository,
} from '../src/fleet/ports/vessel.repository';

class MemoryVesselRepository implements VesselRepository {
  private vessels: VesselRecord[] = [];
  private activity: AuditActivityRecord[] = [];
  auditCount = 0;

  reset(): void {
    this.vessels = [];
    this.activity = [];
    this.auditCount = 0;
  }

  createWithAudit(input: CreateVesselRecordInput): Promise<VesselRecord> {
    if (this.vessels.some((item) => item.registryNumber === input.registryNumber)) {
      throw new VesselRegistryConflictError();
    }

    const vessel: VesselRecord = {
      id: `10000000-0000-4000-8000-${String(this.vessels.length + 1).padStart(12, '0')}`,
      name: input.name,
      registryNumber: input.registryNumber,
      status: 'ACTIVE',
      createdAt: new Date('2026-10-02T12:00:00.000Z'),
      updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    };
    this.vessels.push(vessel);
    this.activity.unshift({
      id: `20000000-0000-4000-8000-${String(this.auditCount + 1).padStart(12, '0')}`,
      action: 'VESSEL_CREATED',
      actorDisplayName: 'Morgan Reed',
      occurredAt: vessel.createdAt,
      changedFields: [],
    });
    this.auditCount += 1;
    return Promise.resolve(vessel);
  }

  list(input: ListVesselsInput): Promise<VesselListRecord> {
    return Promise.resolve({
      items: this.vessels.slice(input.skip, input.skip + input.take),
      total: this.vessels.length,
    });
  }

  findById(id: string): Promise<VesselRecord | null> {
    return Promise.resolve(this.vessels.find((vessel) => vessel.id === id) ?? null);
  }

  updateWithAudit(input: UpdateVesselRecordInput): Promise<VesselRecord | null> {
    const index = this.vessels.findIndex((vessel) => vessel.id === input.id);
    if (index === -1) return Promise.resolve(null);
    if (
      this.vessels.some(
        (vessel) =>
          vessel.id !== input.id && vessel.registryNumber === input.registryNumber,
      )
    ) {
      throw new VesselRegistryConflictError();
    }

    const current = this.vessels[index]!;
    const changedFields = [
      ...(current.name === input.name ? [] : ['name']),
      ...(current.registryNumber === input.registryNumber ? [] : ['registryNumber']),
    ];
    if (changedFields.length === 0) return Promise.resolve(current);

    const vessel = {
      ...current,
      name: input.name,
      registryNumber: input.registryNumber,
      updatedAt: new Date('2026-10-02T13:00:00.000Z'),
    };
    this.vessels[index] = vessel;
    this.activity.unshift({
      id: `20000000-0000-4000-8000-${String(this.auditCount + 1).padStart(12, '0')}`,
      action: 'VESSEL_UPDATED',
      actorDisplayName: 'Morgan Reed',
      occurredAt: vessel.updatedAt,
      changedFields,
    });
    this.auditCount += 1;
    return Promise.resolve(vessel);
  }

  activityForVessel(vesselId: string): readonly AuditActivityRecord[] {
    return this.vessels.some((vessel) => vessel.id === vesselId) ? this.activity : [];
  }

  count(): number {
    return this.vessels.length;
  }
}

class MemoryAuditEventReader implements AuditEventReader {
  constructor(private readonly vessels: MemoryVesselRepository) {}

  listForEntity(input: {
    readonly entityType: string;
    readonly entityId: string;
    readonly take: number;
  }): Promise<readonly AuditActivityRecord[]> {
    if (input.entityType !== 'VESSEL') return Promise.resolve([]);
    return Promise.resolve(
      this.vessels.activityForVessel(input.entityId).slice(0, input.take),
    );
  }
}

describe('Fleet API contract and authorization', () => {
  let app: INestApplication;
  let httpServer: Server;
  const vessels = new MemoryVesselRepository();
  const activity = new MemoryAuditEventReader(vessels);

  const bodyOf = (response: Response): Record<string, unknown> =>
    response.body as Record<string, unknown>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    process.env.WEB_ORIGIN = 'http://localhost:5173';

    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VESSEL_REPOSITORY)
      .useValue(vessels)
      .overrideProvider(AUDIT_EVENT_READER)
      .useValue(activity)
      .compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => vessels.reset());

  afterAll(async () => app.close());

  it('creates a normalized vessel for an Operations Manager', async () => {
    const response = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', 'fleet-create-contract')
      .send({ name: '  MV Northwind  ', registryNumber: ' kw-000001 ' })
      .expect(201);

    expect(bodyOf(response)).toMatchObject({
      name: 'MV Northwind',
      registryNumber: 'KW-000001',
      status: 'ACTIVE',
    });
    expect(vessels.count()).toBe(1);
    expect(vessels.auditCount).toBe(1);
  });

  it('lists vessels for an Auditor without exposing write access', async () => {
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV Northwind', registryNumber: 'KW-000001' })
      .expect(201);

    const response = await request(httpServer)
      .get('/api/v1/vessels')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);

    expect(bodyOf(response)).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      items: [{ registryNumber: 'KW-000001' }],
    });
  });

  it('shows detail and sanitized activity to an Auditor', async () => {
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV Northwind', registryNumber: 'KW-000001' })
      .expect(201);
    const vesselId = String(bodyOf(created).id);

    const response = await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);

    expect(bodyOf(response)).toMatchObject({
      id: vesselId,
      registryNumber: 'KW-000001',
      activity: [
        {
          action: 'VESSEL_CREATED',
          actorDisplayName: 'Morgan Reed',
          changedFields: [],
        },
      ],
    });
  });

  it('updates a vessel for an Operations Manager and records its changed fields', async () => {
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV Northwind', registryNumber: 'KW-000001' })
      .expect(201);
    const vesselId = String(bodyOf(created).id);

    await request(httpServer)
      .put(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: '  MV Northwind Star  ', registryNumber: 'kw-000003' })
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toMatchObject({
          name: 'MV Northwind Star',
          registryNumber: 'KW-000003',
        });
      });

    const detail = await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(bodyOf(detail)).toMatchObject({
      activity: [
        {
          action: 'VESSEL_UPDATED',
          changedFields: ['name', 'registryNumber'],
        },
        { action: 'VESSEL_CREATED' },
      ],
    });
    expect(vessels.auditCount).toBe(2);
  });

  it('returns not-found for a missing vessel detail', async () => {
    const response = await request(httpServer)
      .get('/api/v1/vessels/10000000-0000-4000-8000-000000000099')
      .set('Authorization', 'Bearer local.auditor')
      .expect(404);

    expect(bodyOf(response)).toMatchObject({ code: 'VESSEL_NOT_FOUND' });
  });

  it('denies an Auditor edit before the vessel or activity changes', async () => {
    const created = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV Northwind', registryNumber: 'KW-000001' })
      .expect(201);
    const vesselId = String(bodyOf(created).id);

    await request(httpServer)
      .put(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .send({ name: 'MV Unauthorized', registryNumber: 'KW-000009' })
      .expect(403);

    await request(httpServer)
      .get(`/api/v1/vessels/${vesselId}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toMatchObject({
          name: 'MV Northwind',
          activity: [{ action: 'VESSEL_CREATED' }],
        });
      });
    expect(vessels.auditCount).toBe(1);
  });

  it('returns field errors and writes nothing for invalid input', async () => {
    const response = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'A', registryNumber: 'NOT-A-REGISTRY' })
      .expect(400);

    expect(bodyOf(response)).toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: {
        name: ['Name must contain at least 2 characters.'],
        registryNumber: ['Use the demo format KW-######.'],
      },
    });
    expect(vessels.count()).toBe(0);
    expect(vessels.auditCount).toBe(0);
  });

  it('returns a stable conflict and preserves the original vessel', async () => {
    const payload = { name: 'MV Northwind', registryNumber: 'KW-000001' };
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send(payload)
      .expect(201);

    const response = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send(payload)
      .expect(409);

    expect(bodyOf(response)).toMatchObject({
      code: 'VESSEL_REGISTRY_NUMBER_CONFLICT',
      fieldErrors: { registryNumber: ['Use a unique registry number.'] },
    });
    expect(vessels.count()).toBe(1);
    expect(vessels.auditCount).toBe(1);
  });

  it('preserves both vessels when an edit conflicts with another registry', async () => {
    const first = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV First', registryNumber: 'KW-000001' })
      .expect(201);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV Second', registryNumber: 'KW-000002' })
      .expect(201);

    const response = await request(httpServer)
      .put(`/api/v1/vessels/${String(bodyOf(first).id)}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ name: 'MV First', registryNumber: 'KW-000002' })
      .expect(409);

    expect(bodyOf(response)).toMatchObject({
      code: 'VESSEL_REGISTRY_NUMBER_CONFLICT',
    });
    expect(vessels.count()).toBe(2);
    expect(vessels.auditCount).toBe(2);
  });

  it('denies an Auditor before any vessel or audit event is written', async () => {
    const response = await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', 'Bearer local.auditor')
      .send({ name: 'MV Observer', registryNumber: 'KW-000002' })
      .expect(403);

    expect(bodyOf(response)).toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(vessels.count()).toBe(0);
    expect(vessels.auditCount).toBe(0);
  });

  it('requires authentication before listing fleet data', async () => {
    await request(httpServer).get('/api/v1/vessels').expect(401);
  });

  it('allows the configured web origin to preflight vessel edits', async () => {
    const response = await request(httpServer)
      .options('/api/v1/vessels/10000000-0000-4000-8000-000000000001')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
  });
});
