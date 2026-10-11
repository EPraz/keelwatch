import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
    async function boot(demoEnabled = true, useOidc = false) {
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

    it.each(['inactive', 'unprovisioned', 'elevated'] as const)(
      'rechecks the %s account through the real database on every protected request',
      async (state) => {
        const issued = await request(httpServer)
          .post('/api/v1/access/demo/sessions')
          .send({ role: 'auditor' })
          .expect(201);
        const { accessToken } = issued.body as { accessToken: string };
        const user = await fixture.database.user.findUniqueOrThrow({
          where: { externalSubject: 'demo:auditor' },
        });
        const manager = await fixture.database.role.findUniqueOrThrow({
          where: { code: 'OPERATIONS_MANAGER' },
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
              data: { userId: user.id, roleId: manager.id, source: 'SYSTEM_SEED' },
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
            .send({ role: 'auditor' })
            .expect(403);
        } finally {
          await fixture.database.user.update({
            where: { id: user.id },
            data: { externalSubject: user.externalSubject, status: user.status },
          });
          if (state === 'elevated')
            await fixture.database.userRoleAssignment.delete({
              where: { userId_roleId: { userId: user.id, roleId: manager.id } },
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
