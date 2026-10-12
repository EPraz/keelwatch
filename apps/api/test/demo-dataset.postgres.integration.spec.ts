import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDemoPostgresFixture } from './demo-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Operational demo dataset through HTTP',
  () => {
    let fixture: Awaited<ReturnType<typeof createDemoPostgresFixture>>;
    let app: INestApplication;
    let server: Server;
    beforeEach(async () => {
      fixture = await createDemoPostgresFixture();
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MODE = 'local';
      process.env.ACCESS_STORE = 'prisma';
      process.env.DEMO_ACCESS_ENABLED = 'false';
      process.env.WEB_ORIGIN = 'http://localhost:5173';
      const [{ AppModule }, { configureApplication }] = await Promise.all([
        import('../src/app.module'),
        import('../src/configure-application'),
      ]);
      const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = module.createNestApplication();
      configureApplication(app);
      await app.init();
      server = app.getHttpServer() as Server;
    }, 30_000);
    afterEach(async () => {
      await app?.close();
      await fixture?.close();
    });
    const get = (path: string, role = 'auditor') =>
      request(server)
        .get(`/api/v1${path}`)
        .set(
          'Authorization',
          `Bearer local.${role === 'auditor' ? 'auditor' : 'operations-manager'}`,
        );

    it('keeps the base seed empty and makes all four compliance scenarios readable by both roles on explicit demo seed', async () => {
      const empty = await get('/vessels').expect(200);
      expect(empty.body).toMatchObject({ total: 0 });
      const collision = await request(server)
        .post('/api/v1/vessels')
        .set('Authorization', 'Bearer local.operations-manager')
        .send({ name: 'Retained reference collision', registryNumber: 'KW-970005' })
        .expect(201);
      const collisionId = (collision.body as { id: string }).id;
      expect(() => fixture.seedDemo()).toThrow('Isolated Prisma');
      const afterFailure = await get('/vessels').expect(200);
      expect(afterFailure.body).toMatchObject({
        total: 1,
        items: [
          expect.objectContaining({
            id: collisionId,
            name: 'Retained reference collision',
          }),
        ],
      });
      const noCrew = await get('/crew-members').expect(200);
      expect(noCrew.body).toMatchObject({ total: 0 });
      // Clean only this fixture row inside the UUID-named isolated test schema.
      await fixture.database.auditEvent.deleteMany({ where: { entityId: collisionId } });
      await fixture.database.vessel.delete({ where: { id: collisionId } });
      fixture.seedDemo();
      for (const role of ['manager', 'auditor']) {
        const fleet = await get('/vessels', role).expect(200);
        expect(fleet.body).toMatchObject({ total: 5 });
        const items = (
          fleet.body as {
            items: { id: string; registryNumber: string; status: string }[];
          }
        ).items;
        const expected = ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING'];
        for (const [index, status] of expected.entries()) {
          const vessel = items.find(
            (item) => item.registryNumber === `KW-97000${index + 1}`,
          )!;
          const workspace = await get(`/vessels/${vessel.id}/compliance`, role).expect(
            200,
          );
          expect(workspace.body).toMatchObject({ status });
        }
        expect(items.find((item) => item.registryNumber === 'KW-970005')?.status).toBe(
          'ARCHIVED',
        );
      }
    });

    it('preserves visitor records, edits, archives, cancellation, dates and history on rerun', async () => {
      fixture.seedDemo();
      const root = '/vessels/5eed0001-0000-4000-8000-000000000001';
      const certificateId = '5eed0002-0000-4000-8000-000000000001';
      const planId = '5eed0005-0000-4000-8000-000000000001';
      const orderId = '5eed0006-0000-4000-8000-000000000001';
      const mutate = (path: string) =>
        request(server)
          .put(`/api/v1${path}`)
          .set('Authorization', 'Bearer local.operations-manager');
      await mutate(root)
        .send({
          name: 'Visitor-edited demo vessel',
          registryNumber: 'KW-970001',
        })
        .expect(200);
      await mutate(`${root}/maintenance-orders/${orderId}`)
        .send({
          title: 'Visitor-edited inspection',
          category: 'INSPECTION',
          priority: 'LOW',
          expectedRevision: 1,
        })
        .expect(200);
      await request(server)
        .post(`/api/v1${root}/certificates/${certificateId}/archive`)
        .set('Authorization', 'Bearer local.operations-manager')
        .send({})
        .expect(200);
      await request(server)
        .post(`/api/v1${root}/crew-assignments/${planId}/cancellation`)
        .set('Authorization', 'Bearer local.operations-manager')
        .send({ reason: 'PLAN_CHANGED' })
        .expect(201);
      const visitor = await request(server)
        .post('/api/v1/vessels')
        .set('Authorization', 'Bearer local.operations-manager')
        .send({ name: 'Visitor-created vessel', registryNumber: 'KW-980001' })
        .expect(201);
      const paths = [
        root,
        `${root}/crew-assignments`,
        `${root}/maintenance-orders/${orderId}`,
        `${root}/maintenance-orders/${orderId}/history`,
      ];
      const before = await Promise.all(paths.map((path) => get(path).expect(200)));
      fixture.seedDemo();
      fixture.seedDemo();
      const after = await Promise.all(paths.map((path) => get(path).expect(200)));
      expect(after.map((response): unknown => response.body)).toEqual(
        before.map((response): unknown => response.body),
      );
      const fleet = await get('/vessels').expect(200);
      expect(fleet.body).toMatchObject({ total: 6 });
      await get(`/vessels/${(visitor.body as { id: string }).id}`).expect(200);
      const certificates = await get(`${root}/compliance`).expect(200);
      expect(certificates.body).toMatchObject({ status: 'MISSING' });
      const denied = await request(server)
        .post(`/api/v1${root}/maintenance-orders`)
        .set('Authorization', 'Bearer local.auditor')
        .send({})
        .expect(403);
      expect(denied.body).toMatchObject({ code: 'PERMISSION_DENIED' });
    });

    it('exposes qualifications, current/future/ended/cancelled plans and all maintenance states with history', async () => {
      fixture.seedDemo();
      const crew = await get('/crew-members').expect(200);
      expect(crew.body).toMatchObject({ total: 5 });
      const profiles = (crew.body as { items: { id: string }[] }).items;
      const qualificationStates = new Set<string>();
      for (const profile of profiles) {
        const evidence = await get(`/crew-members/${profile.id}/qualifications`).expect(
          200,
        );
        for (const item of (evidence.body as { items: { status: string }[] }).items)
          qualificationStates.add(item.status);
      }
      expect([...qualificationStates].sort()).toEqual([
        'EXPIRED',
        'EXPIRING_SOON',
        'NOT_YET_VALID',
        'VALID',
      ]);
      const states = new Set<string>();
      const plans = new Set<string>();
      for (let index = 1; index <= 4; index += 1) {
        const id = `5eed0001-0000-4000-8000-${String(index).padStart(12, '0')}`;
        const root = `/vessels/${id}`;
        const orders = await get(`${root}/maintenance-orders`).expect(200);
        for (const order of (orders.body as { items: { id: string; status: string }[] })
          .items) {
          states.add(order.status);
          const history = await get(
            `${root}/maintenance-orders/${order.id}/history`,
          ).expect(200);
          const events = (
            history.body as { items: { action: string; actorDisplayName: string }[] }
          ).items;
          expect(
            events.some((event) => event.action === 'MAINTENANCE_ORDER_CREATED'),
          ).toBe(true);
          expect(events.every((event) => event.actorDisplayName === 'Demo Manager')).toBe(
            true,
          );
        }
        const assignments = await get(`${root}/crew-assignments`).expect(200);
        for (const plan of (assignments.body as { items: { status: string }[] }).items)
          plans.add(plan.status);
      }
      expect([...states].sort()).toEqual([
        'BLOCKED',
        'CANCELLED',
        'CLOSED',
        'IN_PROGRESS',
        'OPEN',
        'PLANNED',
      ]);
      expect([...plans].sort()).toEqual(['CANCELLED', 'CURRENT', 'ENDED', 'SCHEDULED']);
      const composition = await get(
        '/vessels/5eed0001-0000-4000-8000-000000000001/crew-composition',
      ).expect(200);
      expect(composition.body).toMatchObject({ total: 2 });
      expect(
        (composition.body as { items: { status: string }[] }).items
          .map((item) => item.status)
          .sort(),
      ).toEqual(['COVERED', 'WARNING']);
      const incomplete = await get(
        '/vessels/5eed0001-0000-4000-8000-000000000002/crew-composition',
      ).expect(200);
      expect(incomplete.body).toMatchObject({
        total: 1,
        items: [expect.objectContaining({ status: 'INCOMPLETE' })],
      });
    });
  },
);
