import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { validateEnvironment } from '../src/config/environment';
import { createDemoPostgresFixture } from './demo-postgres.fixture';
import { createDemoOidcFixture } from './demo-oidc.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'DemoAccount PostgreSQL HTTP journey',
  () => {
    let fixture: Awaited<ReturnType<typeof createDemoPostgresFixture>>;
    let oidc: Awaited<ReturnType<typeof createDemoOidcFixture>>;
    let app: INestApplication;
    let httpServer: Server;
    const secret = randomBytes(32).toString('base64url');

    beforeAll(async () => {
      fixture = await createDemoPostgresFixture();
      oidc = await createDemoOidcFixture();
    }, 30_000);
    async function boot(
      demoEnabled = true,
      useOidc = false,
      overrides: Record<string, unknown> = {},
    ) {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MODE = 'local';
      process.env.ACCESS_STORE = 'prisma';
      process.env.WEB_ORIGIN = 'http://localhost:5173';
      process.env.DEMO_ACCESS_ENABLED = 'true';
      process.env.DEMO_SESSION_SECRET = secret;
      const [{ AppModule }, { configureApplication }] = await Promise.all([
        import('../src/app.module'),
        import('../src/configure-application'),
      ]);
      const configuration = validateEnvironment({
        NODE_ENV: useOidc ? 'production' : 'test',
        AUTH_MODE: useOidc ? 'oidc' : 'local',
        ACCESS_STORE: 'prisma',
        DATABASE_URL: fixture.databaseUrl,
        WEB_ORIGIN: useOidc ? 'https://keelwatch.example.test' : 'http://localhost:5173',
        DEMO_ACCESS_ENABLED: String(demoEnabled),
        DEMO_SESSION_SECRET: secret,
        OIDC_ISSUER: 'https://identity.example.test/',
        OIDC_AUDIENCE: oidc.audience,
        ...overrides,
      });
      // Only the external provider fixture uses HTTP loopback. Production input
      // validation above still requires HTTPS; all real guards and JWKS checks run.
      if (useOidc) configuration.OIDC_ISSUER = oidc.issuer;
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ConfigService)
        .useValue(new ConfigService(configuration))
        .compile();
      app = module.createNestApplication();
      configureApplication(app);
      await app.init();
      httpServer = app.getHttpServer() as Server;
    }
    beforeEach(() => boot());
    afterEach(async () => {
      await app?.close();
      vi.useRealTimers();
    });
    afterAll(async () => {
      await oidc?.close();
      await fixture?.close();
    });

    it('provisions a distinct Demo Auditor and preserves an operational record across repeated seed', async () => {
      const created = await request(httpServer)
        .post('/api/v1/vessels')
        .set('Authorization', 'Bearer local.operations-manager')
        .send({ name: 'MV Demo Seed Retained', registryNumber: 'KW-900001' })
        .expect(201);
      const { id: vesselId } = created.body as { id: string };
      const issued = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'auditor' })
        .expect(201);
      const { accessToken } = issued.body as { accessToken: string };
      const profile = await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(profile.body).toMatchObject({
        displayName: 'Demo Auditor',
        roles: ['AUDITOR'],
      });
      fixture.seed();
      const retained = await request(httpServer)
        .get(`/api/v1/vessels/${vesselId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(retained.body).toMatchObject({
        id: vesselId,
        name: 'MV Demo Seed Retained',
      });
      for (const path of [
        '/api/v1/vessels',
        '/api/v1/compliance',
        '/api/v1/crew-members',
        `/api/v1/vessels/${vesselId}/compliance`,
        `/api/v1/vessels/${vesselId}/crew-assignments`,
        `/api/v1/vessels/${vesselId}/crew-composition`,
        `/api/v1/vessels/${vesselId}/maintenance-orders`,
      ])
        await request(httpServer)
          .get(path)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
    });

    it('shares a Manager write and its attributed Activity with a later Auditor session', async () => {
      const managerSession = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'manager' })
        .expect(201);
      const managerToken = (managerSession.body as { accessToken: string }).accessToken;
      const created = await request(httpServer)
        .post('/api/v1/vessels')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'MV Shared Demo Record', registryNumber: 'KW-900002' })
        .expect(201);
      const { id } = created.body as { id: string };
      fixture.seed();
      const auditorSession = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'auditor' })
        .expect(201);
      const auditorToken = (auditorSession.body as { accessToken: string }).accessToken;
      const retained = await request(httpServer)
        .get(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);
      expect(retained.body).toMatchObject({
        name: 'MV Shared Demo Record',
        activity: [{ action: 'VESSEL_CREATED', actorDisplayName: 'Demo Manager' }],
      });
      await request(httpServer)
        .put(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({ name: 'Denied Auditor change', registryNumber: 'KW-900002' })
        .expect(403);
    });

    it('uses the existing operational lifecycles with Manager credentials and shares their Activity with Auditor', async () => {
      const issued = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'manager' })
        .expect(201);
      const token = (issued.body as { accessToken: string }).accessToken;
      const post = (path: string, body: object = {}) =>
        request(httpServer)
          .post(`/api/v1${path}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);
      const put = (path: string, body: object) =>
        request(httpServer)
          .put(`/api/v1${path}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);
      const vessel = await post('/vessels', {
        name: 'MV Demo Lifecycle',
        registryNumber: 'KW-900004',
      }).expect(201);
      const vesselId = (vessel.body as { id: string }).id;
      const root = `/vessels/${vesselId}`;
      await put(root, {
        name: 'MV Demo Lifecycle Updated',
        registryNumber: 'KW-900004',
      }).expect(200);
      const certificateInput = {
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'DEMO-LIFECYCLE-004',
        issuer: 'Synthetic Demo Registry',
        issuedOn: '2026-01-01',
        expiresOn: '2099-01-01',
      };
      const certificate = await post(`${root}/certificates`, certificateInput).expect(
        201,
      );
      const certificateId = (certificate.body as { certificates: { id: string }[] })
        .certificates[0]!.id;
      await put(`${root}/certificates/${certificateId}`, {
        ...certificateInput,
        issuer: 'Synthetic Demo Registry Updated',
      }).expect(200);
      await post(`${root}/certificates/${certificateId}/archive`).expect(200);
      await post(`${root}/certificates/${certificateId}/archive`).expect(409);

      const crew = await post('/crew-members', {
        displayName: 'Synthetic Demo Crew',
        crewNumber: 'KW-C-900004',
      }).expect(201);
      const crewId = (crew.body as { id: string }).id;
      await post(`/crew-members/${crewId}/qualifications`, {
        kind: 'DEMO_SAFETY',
        referenceNumber: 'KW-Q-900004',
        validFrom: '2026-01-01',
        expiresOn: '2099-01-01',
      }).expect(201);
      const assignmentInput = {
        crewNumber: 'KW-C-900004',
        role: 'DEMO_SUPPORT',
        startsOn: '2026-11-01',
        endsOn: '2026-11-30',
      };
      const assignment = await post(`${root}/crew-assignments`, assignmentInput).expect(
        201,
      );
      const assignmentId = (assignment.body as { id: string }).id;
      await post(`${root}/crew-assignments`, assignmentInput).expect(409);
      await post(`${root}/crew-assignments/${assignmentId}/cancellation`, {
        reason: 'PLAN_CHANGED',
      }).expect(201);

      const orderInput = {
        title: 'Synthetic demo inspection',
        category: 'INSPECTION',
        priority: 'NORMAL',
      };
      const order = await post(`${root}/maintenance-orders`, orderInput).expect(201);
      const orderId = (order.body as { id: string }).id;
      const orderPath = `${root}/maintenance-orders/${orderId}`;
      await put(orderPath, {
        ...orderInput,
        priority: 'HIGH',
        expectedRevision: 1,
      }).expect(200);
      await put(orderPath, { ...orderInput, expectedRevision: 1 }).expect(409);
      await post(`${orderPath}/transitions`, {
        action: 'CANCEL',
        reasonCode: 'WORK_NO_LONGER_REQUIRED',
        expectedRevision: 2,
      }).expect(201);
      await put(orderPath, { ...orderInput, expectedRevision: 3 }).expect(409);

      const auditor = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'auditor' })
        .expect(201);
      const auditorToken = (auditor.body as { accessToken: string }).accessToken;
      const read = (path: string) =>
        request(httpServer)
          .get(`/api/v1${path}`)
          .set('Authorization', `Bearer ${auditorToken}`);
      const detail = await read(root).expect(200);
      const activity = (
        detail.body as { activity: { action: string; actorDisplayName: string }[] }
      ).activity;
      expect(activity.map((event) => event.action).sort()).toEqual(
        [
          'VESSEL_CREATED',
          'VESSEL_UPDATED',
          'CERTIFICATE_CREATED',
          'CERTIFICATE_UPDATED',
          'CERTIFICATE_ARCHIVED',
          'CREW_ASSIGNMENT_CREATED',
          'CREW_ASSIGNMENT_CANCELLED',
          'MAINTENANCE_ORDER_CREATED',
          'MAINTENANCE_ORDER_UPDATED',
          'MAINTENANCE_ORDER_TRANSITIONED',
        ].sort(),
      );
      expect(activity.every((event) => event.actorDisplayName === 'Demo Manager')).toBe(
        true,
      );
      expect((await read(`${root}/crew-assignments`).expect(200)).body).toMatchObject({
        items: [{ id: assignmentId, status: 'CANCELLED' }],
      });
      expect((await read(orderPath).expect(200)).body).toMatchObject({
        status: 'CANCELLED',
        revision: 3,
      });
      expect(
        (await read(`/crew-members/${crewId}/qualifications`).expect(200)).body,
      ).toMatchObject({ items: [{ referenceNumber: 'KW-Q-900004' }] });
      expect((await read(`${root}/compliance`).expect(200)).body).toMatchObject({
        status: 'MISSING',
        certificates: [
          {
            id: certificateId,
            issuer: 'Synthetic Demo Registry Updated',
            archivedAt: expect.any(String) as unknown,
          },
        ],
      });
    });

    it('keeps the write budget across issued credentials, refuses writes without changes and leaves OIDC unrestricted', async () => {
      await app.close();
      await boot(true, true, { DEMO_WRITE_LIMIT: '1', DEMO_WRITE_WINDOW_SECONDS: '60' });
      vi.useFakeTimers({ toFake: ['Date'] });
      const first = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'manager' })
        .expect(201);
      const firstToken = (first.body as { accessToken: string }).accessToken;
      const created = await request(httpServer)
        .post('/api/v1/vessels')
        .set('Authorization', `Bearer ${firstToken}`)
        .send({ name: 'MV Budget Preserved', registryNumber: 'KW-900003' })
        .expect(201);
      const { id } = created.body as { id: string };
      const second = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'manager' })
        .expect(201);
      const secondToken = (second.body as { accessToken: string }).accessToken;
      const before = await request(httpServer)
        .get(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);
      const denied = await request(httpServer)
        .put(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .send({ name: 'Denied budget change', registryNumber: 'KW-900003' })
        .expect(429);
      expect(denied.headers['retry-after']).toBe('60');
      expect(denied.body).toMatchObject({
        code: 'DEMO_WRITE_LIMITED',
        message:
          'Demo changes are busy. Try again in 60 seconds. Reading remains available.',
      });
      const after = await request(httpServer)
        .get(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);
      expect(after.body).toEqual(before.body);
      const normalToken = await oidc.token('auth0|synthetic-demo-test-manager');
      await request(httpServer)
        .put(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ name: 'MV Owner Edit', registryNumber: 'KW-900003' })
        .expect(200);
      vi.setSystemTime(Date.now() + 60_000);
      await request(httpServer)
        .put(`/api/v1/vessels/${id}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .send({ name: 'MV Budget Recovered', registryNumber: 'KW-900003' })
        .expect(200);
    });

    it.each(
      (['manager', 'auditor'] as const).flatMap((role) =>
        (['inactive', 'unprovisioned', 'elevated'] as const).map((state) => ({
          role,
          state,
        })),
      ),
    )(
      'rechecks $state $role accounts through the real database on every request',
      async ({ role, state }) => {
        const issued = await request(httpServer)
          .post('/api/v1/access/demo/sessions')
          .send({ role })
          .expect(201);
        const { accessToken } = issued.body as { accessToken: string };
        const user = await fixture.database.user.findUniqueOrThrow({
          where: { externalSubject: `demo:${role}` },
        });
        const additionalRole = await fixture.database.role.findUniqueOrThrow({
          where: { code: role === 'manager' ? 'AUDITOR' : 'OPERATIONS_MANAGER' },
        });
        try {
          if (state === 'inactive')
            await fixture.database.user.update({
              where: { id: user.id },
              data: { status: 'INACTIVE' },
            });
          if (state === 'unprovisioned')
            await fixture.database.user.update({
              where: { id: user.id },
              data: { externalSubject: 'demo:unavailable-test' },
            });
          if (state === 'elevated')
            await fixture.database.userRoleAssignment.create({
              data: { userId: user.id, roleId: additionalRole.id, source: 'SYSTEM_SEED' },
            });
          const denied = await request(httpServer)
            .get('/api/v1/access/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(403);
          expect(denied.body).toMatchObject({
            code:
              state === 'inactive'
                ? 'ACCESS_USER_INACTIVE'
                : state === 'unprovisioned'
                  ? 'ACCESS_USER_NOT_PROVISIONED'
                  : 'DEMO_ACCOUNT_UNAVAILABLE',
          });
          await request(httpServer)
            .post('/api/v1/access/demo/sessions')
            .send({ role })
            .expect(403);
        } finally {
          await fixture.database.user.update({
            where: { id: user.id },
            data: { externalSubject: user.externalSubject, status: user.status },
          });
          if (state === 'elevated')
            await fixture.database.userRoleAssignment.delete({
              where: { userId_roleId: { userId: user.id, roleId: additionalRole.id } },
            });
        }
      },
    );

    it('keeps real OIDC verification working in production mode when demo access is disabled', async () => {
      await app.close();
      await boot(true, true);
      const token = await oidc.token();
      const normal = await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(normal.body).toMatchObject({
        displayName: 'Avery Chen',
        roles: ['AUDITOR'],
      });
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', 'Bearer local.auditor')
        .expect(401);
      const reservedSubject = await oidc.token('demo:auditor');
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${reservedSubject}`)
        .expect(401);
      const issued = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'auditor' })
        .expect(201);
      const { accessToken } = issued.body as { accessToken: string };
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${accessToken.slice('demo.'.length)}`)
        .expect(401);
      await app.close();
      await boot(false, true);
      await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role: 'auditor' })
        .expect(403);
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  },
);
