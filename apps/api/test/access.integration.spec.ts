import { Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RequirePermissions } from '../src/access/http/require-permissions.decorator';

@Controller({ path: 'test/fleet-write', version: '1' })
class FleetWriteTestController {
  @Post()
  @RequirePermissions('fleet:write')
  create(): { created: true } {
    return { created: true };
  }
}

describe('Access request pipeline', () => {
  let app: INestApplication;
  let httpServer: Server;

  const bodyOf = (response: Response): unknown => response.body as unknown;
  const recordBodyOf = (response: Response): Record<string, unknown> => {
    const body = bodyOf(response);
    if (typeof body !== 'object' || body === null)
      throw new Error('Expected an object body.');
    return body as Record<string, unknown>;
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    process.env.WEB_ORIGIN = 'http://localhost:5173';

    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FleetWriteTestController],
    }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    const server: unknown = app.getHttpServer();
    httpServer = server as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps health public and returns a correlation ID', async () => {
    const response = await request(httpServer).get('/api/v1/health/live').expect(200);
    expect(bodyOf(response)).toEqual({ status: 'ok' });
    expect(response.headers['x-correlation-id']).toEqual(expect.any(String));
  });

  it('rejects an unauthenticated request consistently', async () => {
    const response = await request(httpServer).get('/api/v1/access/me').expect(401);
    const body = recordBodyOf(response);
    expect(body.code).toBe('AUTHENTICATION_REQUIRED');
    expect(typeof body.correlationId).toBe('string');
  });

  it('rejects an inactive local user', async () => {
    const response = await request(httpServer)
      .get('/api/v1/access/me')
      .set('Authorization', 'Bearer local.inactive')
      .expect(403);
    expect(bodyOf(response)).toMatchObject({ code: 'ACCESS_USER_INACTIVE' });
  });

  it('rejects an invalid local bearer token', async () => {
    const response = await request(httpServer)
      .get('/api/v1/access/me')
      .set('Authorization', 'Bearer local.unknown')
      .expect(401);
    expect(bodyOf(response)).toMatchObject({ code: 'INVALID_ACCESS_TOKEN' });
  });

  it('returns the application-owned roles for an active manager', async () => {
    const response = await request(httpServer)
      .get('/api/v1/access/me')
      .set('Authorization', 'Bearer local.operations-manager')
      .expect(200);
    const body = recordBodyOf(response);
    expect(body).toMatchObject({
      displayName: 'Morgan Reed',
      roles: ['OPERATIONS_MANAGER'],
    });
    expect(body.permissions).toContain('fleet:write');
  });

  it('allows the permitted role through a server policy', async () => {
    await request(httpServer)
      .post('/api/v1/test/fleet-write')
      .set('Authorization', 'Bearer local.operations-manager')
      .expect(201, { created: true });
  });

  it('denies an Auditor at the same server policy', async () => {
    const response = await request(httpServer)
      .post('/api/v1/test/fleet-write')
      .set('Authorization', 'Bearer local.auditor')
      .expect(403);
    expect(bodyOf(response)).toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
