import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CrewNumberConflictError,
  type CrewMemberRecord,
} from '../src/crew/domain/crew-member';
import {
  CREW_REPOSITORY,
  type CrewRepository,
  type RegisterCrewInput,
} from '../src/crew/ports/crew.repository';

class MemoryCrew implements CrewRepository {
  items: CrewMemberRecord[] = [];
  createWithAudit(input: RegisterCrewInput) {
    if (this.items.some((item) => item.crewNumber === input.crewNumber))
      throw new CrewNumberConflictError();
    const member = {
      id: randomUUID(),
      displayName: input.displayName,
      crewNumber: input.crewNumber,
      createdAt: new Date(),
    };
    this.items.push(member);
    return Promise.resolve(member);
  }
  list({ skip, take }: { skip: number; take: number }) {
    return Promise.resolve({
      items: this.items.slice(skip, skip + take),
      total: this.items.length,
    });
  }
}

describe('Crew request pipeline', () => {
  let app: INestApplication;
  let server: Server;
  const store = new MemoryCrew();
  const input = { displayName: 'Jordan Vale', crewNumber: 'KW-C-000001' };
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CREW_REPOSITORY)
      .useValue(store)
      .compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });
  beforeEach(() => {
    store.items = [];
  });
  afterAll(async () => app.close());

  it.each([
    [undefined, 401],
    ['local.inactive', 403],
    ['local.auditor', 403],
  ] as const)('rejects unauthorized creation with %s', async (token, status) => {
    const action = request(server).post('/api/v1/crew-members');
    if (token) action.set('Authorization', `Bearer ${token}`);
    await action.send(input).expect(status);
    expect(store.items).toEqual([]);
  });

  it('creates a normalized profile and lets Auditor read it without internal fields', async () => {
    const created = await request(server)
      .post('/api/v1/crew-members')
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ displayName: ' Jordan Vale ', crewNumber: ' kw-c-000001 ' })
      .expect(201);
    expect(created.body).toMatchObject(input);
    expect(Object.keys(created.body as object).sort()).toEqual([
      'createdAt',
      'crewNumber',
      'displayName',
      'id',
    ]);
    const response = await request(server)
      .get('/api/v1/crew-members')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(response.body).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      items: [input],
    });
  });

  it('returns a recoverable duplicate conflict', async () => {
    await request(server)
      .post('/api/v1/crew-members')
      .set('Authorization', 'Bearer local.operations-manager')
      .send(input)
      .expect(201);
    const response = await request(server)
      .post('/api/v1/crew-members')
      .set('Authorization', 'Bearer local.operations-manager')
      .send(input)
      .expect(409);
    expect(response.body).toMatchObject({
      code: 'CREW_NUMBER_CONFLICT',
      fieldErrors: { crewNumber: ['Use a unique demo crew number.'] },
    });
    expect(store.items).toHaveLength(1);
  });

  it.each([
    { ...input, displayName: ' ' },
    { ...input, crewNumber: 'KW-000001' },
    { ...input, createdById: randomUUID() },
  ])('rejects invalid or unowned fields: %j', async (body) => {
    await request(server)
      .post('/api/v1/crew-members')
      .set('Authorization', 'Bearer local.operations-manager')
      .send(body)
      .expect(400);
    expect(store.items).toEqual([]);
  });

  it('protects reads and validates bounded pagination', async () => {
    await request(server).get('/api/v1/crew-members').expect(401);
    for (const page of ['0', '-1', '1.5', '10001', 'bad']) {
      await request(server)
        .get(`/api/v1/crew-members?page=${page}`)
        .set('Authorization', 'Bearer local.auditor')
        .expect(400);
    }
    const response = await request(server)
      .get('/api/v1/crew-members?page=2')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(response.body).toMatchObject({ page: 2, total: 0, totalPages: 0, items: [] });
  });
});
