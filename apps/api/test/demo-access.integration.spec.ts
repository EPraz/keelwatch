import { Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateEnvironment } from '../src/config/environment';
import { RequirePermissions } from '../src/access/http/require-permissions.decorator';

@Controller({ path: 'test/access-admin', version: '1' })
class AccessAdminTestController {
  @Post()
  @RequirePermissions('access:manage')
  manage() {
    return { managed: true };
  }
}

describe('Public DemoAccount access', () => {
  let app: INestApplication;
  let httpServer: Server;

  const secret = randomBytes(32).toString('base64url');

  async function boot(overrides: Record<string, unknown> = {}) {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    process.env.DEMO_ACCESS_ENABLED = 'true';
    process.env.DEMO_SESSION_SECRET = secret;
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const config = new ConfigService(
      validateEnvironment({
        NODE_ENV: 'test',
        AUTH_MODE: 'local',
        ACCESS_STORE: 'memory',
        WEB_ORIGIN: 'http://localhost:5173',
        DEMO_ACCESS_ENABLED: 'true',
        DEMO_SESSION_SECRET: process.env.DEMO_SESSION_SECRET,
        DEMO_SESSION_LIMIT: '2',
        DEMO_SESSION_WINDOW_SECONDS: '60',
        ...overrides,
      }),
    );
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AccessAdminTestController],
    })
      .overrideProvider(ConfigService)
      .useValue(config)
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

  it('opens a one-hour Manager session for its separate fixed DemoAccount', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const startedAt = Date.now();
    const issued = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'manager' })
      .expect(201);
    const session = issued.body as { accessToken: string; expiresAt: string };
    expect(Date.parse(session.expiresAt) - startedAt).toBeGreaterThan(3_599_000);
    expect(Date.parse(session.expiresAt) - startedAt).toBeLessThanOrEqual(3_600_000);
    const profile = await request(httpServer)
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(profile.body).toMatchObject({
      displayName: 'Demo Manager',
      roles: ['OPERATIONS_MANAGER'],
    });
    expect((profile.body as { permissions: string[] }).permissions).toEqual([
      'activity:read',
      'crew:read',
      'crew:write',
      'fleet:read',
      'fleet:write',
      'maintenance:read',
      'maintenance:write',
    ]);
  });

  it('opens a one-hour session for the fixed read-only DemoAccount', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const startedAt = Date.now();
    const issued = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
    const session = issued.body as { accessToken: string; expiresAt: string };
    expect(Date.parse(session.expiresAt) - startedAt).toBeGreaterThan(3_599_000);
    expect(Date.parse(session.expiresAt) - startedAt).toBeLessThanOrEqual(3_600_000);
    expect(issued.headers['cache-control']).toBe('no-store');

    const profile = await request(httpServer)
      .get('/api/v1/access/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(profile.body).toMatchObject({
      displayName: 'Demo Auditor',
      roles: ['AUDITOR'],
      permissions: ['activity:read', 'crew:read', 'fleet:read', 'maintenance:read'],
    });
  });

  it('bounds session issuance and explains when a visitor can retry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
    await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
    const limited = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(429);
    expect(limited.headers['retry-after']).toBe('60');
    expect(limited.body).toMatchObject({
      code: 'DEMO_SESSION_LIMITED',
      message: 'Demo sign-in is busy. Try again in 60 seconds.',
    });
    vi.setSystemTime(Date.now() + 60_000);
    await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
  });

  it('counts malformed attempts and limits simultaneous issuance requests', async () => {
    await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'unknown' })
      .expect(400);
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(httpServer)
          .post('/api/v1/access/demo/sessions')
          .set('Origin', 'http://localhost:5173')
          .send({ role: 'auditor' }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 429, 429]);
    const limited = responses.find((response) => response.status === 429)!;
    expect(limited.headers['access-control-expose-headers']).toContain('Retry-After');
    expect(limited.headers['cache-control']).toBe('no-store');
  });

  it.each([
    {},
    { role: 'unknown' },
    { role: 'administrator' },
    { role: 'auditor', subject: 'auth0|owner' },
    { role: 'auditor', roles: ['PLATFORM_ADMINISTRATOR'] },
  ])('rejects an invalid or elevated public selection %j', async (body) => {
    await request(httpServer).post('/api/v1/access/demo/sessions').send(body).expect(400);
  });

  it.each(['manager', 'auditor'])(
    'rejects tampered and expired %s credentials',
    async (role) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const issued = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role })
        .expect(201);
      const session = issued.body as { accessToken: string; expiresAt: string };
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${session.accessToken}tampered`)
        .expect(401);
      vi.setSystemTime(Date.parse(session.expiresAt));
      const expired = await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
      expect(expired.body).toMatchObject({ code: 'INVALID_ACCESS_TOKEN' });
    },
  );

  it.each(['manager', 'auditor'])(
    'rejects issued %s sessions after disabling demo access',
    async (role) => {
      const issued = await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role })
        .expect(201);
      const { accessToken } = issued.body as { accessToken: string };
      await app.close();
      await boot({ DEMO_ACCESS_ENABLED: 'false' });
      await request(httpServer)
        .get('/api/v1/access/demo')
        .expect(200, { availableRoles: [] });
      await request(httpServer)
        .post('/api/v1/access/demo/sessions')
        .send({ role })
        .expect(403);
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      await request(httpServer)
        .get('/api/v1/access/me')
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
    },
  );

  it('enforces read-only operational and access-management policies with an issued token', async () => {
    const issued = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
    const { accessToken } = issued.body as { accessToken: string };
    await request(httpServer)
      .get('/api/v1/vessels')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Demo write denied', registryNumber: 'KW-999001' })
      .expect(403);
    const vesselId = '00000000-0000-4000-8000-000000000001';
    for (const path of [
      '/api/v1/crew-members',
      `/api/v1/vessels/${vesselId}/certificates`,
      `/api/v1/vessels/${vesselId}/crew-assignments`,
      `/api/v1/vessels/${vesselId}/maintenance-orders`,
      '/api/v1/compliance/notification-jobs',
      '/api/v1/test/access-admin',
    ]) {
      const denied = await request(httpServer)
        .post(path)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(403);
      expect(denied.body).toMatchObject({ code: 'PERMISSION_DENIED' });
    }
  });

  it('bounds concurrent write attempts across operational routes after authorization', async () => {
    await app.close();
    await boot({ DEMO_WRITE_LIMIT: '2', DEMO_WRITE_WINDOW_SECONDS: '60' });
    vi.useFakeTimers({ toFake: ['Date'] });
    const manager = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'manager' })
      .expect(201);
    const auditor = await request(httpServer)
      .post('/api/v1/access/demo/sessions')
      .send({ role: 'auditor' })
      .expect(201);
    const managerToken = (manager.body as { accessToken: string }).accessToken;
    const auditorToken = (auditor.body as { accessToken: string }).accessToken;
    for (const token of [managerToken, auditorToken])
      await request(httpServer)
        .post('/api/v1/test/access-admin')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    await request(httpServer).post('/api/v1/vessels').send({}).expect(401);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({})
      .expect(403);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(400);
    const attempts = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(httpServer)
          .post('/api/v1/crew-members')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({}),
      ),
    );
    expect(attempts.map((response) => response.status).sort()).toEqual([400, 429, 429]);
    const id = '00000000-0000-4000-8000-000000000001';
    for (const [method, path] of [
      ['put', `/vessels/${id}`],
      ['post', `/vessels/${id}/certificates`],
      ['put', `/vessels/${id}/certificates/${id}`],
      ['post', `/vessels/${id}/certificates/${id}/archive`],
      ['post', `/crew-members/${id}/qualifications`],
      ['post', `/vessels/${id}/crew-assignments`],
      ['post', `/vessels/${id}/crew-assignments/${id}/cancellation`],
      ['post', `/vessels/${id}/maintenance-orders`],
      ['put', `/vessels/${id}/maintenance-orders/${id}`],
      ['post', `/vessels/${id}/maintenance-orders/${id}/transitions`],
      ['post', '/compliance/notification-jobs'],
    ] as const) {
      const client = request(httpServer);
      const limited = await client[method](`/api/v1${path}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({})
        .expect(429);
      expect(limited.body).toMatchObject({ code: 'DEMO_WRITE_LIMITED' });
      expect(limited.headers['retry-after']).toBe('60');
    }
    await request(httpServer)
      .get('/api/v1/vessels')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    vi.setSystemTime(Date.now() + 60_000);
    await request(httpServer)
      .post('/api/v1/vessels')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(400);
  });
});
