import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Portfolio demo has no file attachment routes', () => {
  let app: INestApplication;
  let server: Server;
  const base =
    '/api/v1/vessels/10000000-0000-4000-8000-000000000001/certificates/20000000-0000-4000-8000-000000000001/documents';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => app.close());

  it.each([undefined, 'local.operations-manager', 'local.auditor', 'local.inactive'])(
    'does not accept multipart, issue links, or run file jobs for %s',
    async (token) => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await request(server)
        .post(base)
        .set(headers)
        .attach(
          'file',
          readFileSync(resolve(__dirname, 'fixtures/synthetic-document.pdf')),
          'synthetic-document.pdf',
        )
        .expect(404);
      await request(server)
        .get(`${base}/30000000-0000-4000-8000-000000000001/access-url`)
        .set(headers)
        .expect(404);
      await request(server)
        .post('/api/v1/compliance/document-jobs/reconcile')
        .set(headers)
        .expect(404);
      const download = await request(server)
        .get('/api/v1/document-downloads/retired-token')
        .set(headers)
        .expect(404);
      expect(download.headers['content-type']).toContain('application/json');
      expect(download.headers['content-disposition']).toBeUndefined();
    },
  );

  it('publishes only the retained metadata workflows in OpenAPI', () => {
    const api = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const paths = Object.keys(api.paths);
    expect(paths).toContain('/api/v1/vessels/{vesselId}/certificates');
    expect(paths).toContain('/api/v1/crew-members');
    expect(
      paths.some((path) => /\/documents|document-downloads|document-jobs/u.test(path)),
    ).toBe(false);
    expect(JSON.stringify(api)).not.toContain('multipart/form-data');
  });
});
