import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CrewMemberNotFoundError,
  QualificationConflictError,
  type QualificationRecord,
} from '../src/crew/domain/qualification';
import {
  QUALIFICATION_REPOSITORY,
  type QualificationRepository,
  type RecordQualificationInput,
} from '../src/crew/ports/qualification.repository';

const member = {
  id: randomUUID(),
  displayName: 'Synthetic Crew',
  crewNumber: 'KW-C-000001',
  createdAt: new Date(),
};
class MemoryQualifications implements QualificationRepository {
  intervals(crewMemberId: string) {
    return Promise.resolve(
      this.items.filter((item) => item.crewMemberId === crewMemberId),
    );
  }
  findMemberByNumber(crewNumber: string) {
    return Promise.resolve(crewNumber === member.crewNumber ? member : null);
  }
  items: QualificationRecord[] = [];
  findMember(id: string) {
    return Promise.resolve(id === member.id ? member : null);
  }
  list(crewMemberId: string, skip: number, take: number) {
    const items = this.items.filter((item) => item.crewMemberId === crewMemberId);
    return Promise.resolve({
      items: items.slice(skip, skip + take),
      total: items.length,
    });
  }
  createWithAudit(input: RecordQualificationInput) {
    if (input.crewMemberId !== member.id) throw new CrewMemberNotFoundError();
    if (this.items.some((item) => item.referenceNumber === input.referenceNumber))
      throw new QualificationConflictError();
    const item: QualificationRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.items.push(item);
    return Promise.resolve(item);
  }
}

describe('Qualification request pipeline', () => {
  let app: INestApplication;
  let server: Server;
  const store = new MemoryQualifications();
  const path = `/api/v1/crew-members/${member.id}/qualifications`;
  const input = {
    kind: 'DEMO_SAFETY',
    referenceNumber: 'KW-Q-000001',
    validFrom: '2026-01-01',
    expiresOn: '2027-01-01',
  };
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(QUALIFICATION_REPOSITORY)
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
  ] as const)('rejects writes for %s without storing records', async (token, code) => {
    const action = request(server).post(path);
    if (token) action.set('Authorization', `Bearer ${token}`);
    await action.send(input).expect(code);
    expect(store.items).toEqual([]);
  });
  it('records normalized references and exposes only the public dated view to Auditor', async () => {
    const response = await request(server)
      .post(path)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ ...input, referenceNumber: ' kw-q-000001 ' })
      .expect(201);
    expect(response.body).toMatchObject(input);
    expect(Object.keys(response.body as object).sort()).toEqual([
      'asOf',
      'createdAt',
      'expiresOn',
      'id',
      'kind',
      'kindLabel',
      'reason',
      'referenceNumber',
      'status',
      'validFrom',
    ]);
    const read = await request(server)
      .get(path)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(read.body).toMatchObject({
      member: { id: member.id },
      items: [input],
      total: 1,
      page: 1,
    });
  });
  it('returns a recoverable conflict without a second record', async () => {
    await request(server)
      .post(path)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(input)
      .expect(201);
    const response = await request(server)
      .post(path)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(input)
      .expect(409);
    expect(response.body).toMatchObject({
      code: 'QUALIFICATION_REFERENCE_CONFLICT',
      fieldErrors: { referenceNumber: ['Use a unique reference for this profile.'] },
    });
    expect(store.items).toHaveLength(1);
  });
  it.each([
    { validFrom: '0000-01-01' },
    { validFrom: '2026-02-30' },
    { validFrom: '2028-01-01' },
    { expiresOn: '2027-01-01T00:00:00Z' },
    { referenceNumber: 'real-document' },
    { kind: 'UNKNOWN' },
    { createdById: randomUUID() },
  ])('rejects invalid dates, types and unowned fields %j', async (patch) => {
    await request(server)
      .post(path)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ ...input, ...patch })
      .expect(400);
    expect(store.items).toEqual([]);
  });
  it('protects reads, validates paths and pagination, and returns not-found for unknown profiles', async () => {
    await request(server).get(path).expect(401);
    await request(server)
      .get(path)
      .set('Authorization', 'Bearer local.inactive')
      .expect(403);
    for (const page of ['0', '1.5', '10001'])
      await request(server)
        .get(`${path}?page=${page}`)
        .set('Authorization', 'Bearer local.auditor')
        .expect(400);
    await request(server)
      .get('/api/v1/crew-members/invalid/qualifications')
      .set('Authorization', 'Bearer local.auditor')
      .expect(400);
    const missing = `/api/v1/crew-members/${randomUUID()}/qualifications`;
    await request(server)
      .get(missing)
      .set('Authorization', 'Bearer local.auditor')
      .expect(404);
    await request(server)
      .post(missing)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(input)
      .expect(404);
    expect(store.items).toEqual([]);
  });
  it('returns an explicit empty page', async () => {
    const response = await request(server)
      .get(`${path}?page=2`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(response.body).toMatchObject({ items: [], total: 0, page: 2, totalPages: 0 });
  });
});
