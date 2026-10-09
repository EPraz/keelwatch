import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaAccessUserRepository } from '../src/access/infrastructure/prisma-access-user.repository';
import { ACCESS_USER_REPOSITORY } from '../src/access/ports/access-user.repository';
import type { RoleCode, Permission } from '../src/access/domain/access.types';
import { PermissionGuard } from '../src/access/http/permission.guard';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../src/audit/application/audit-event.writer';

const environmentFile = resolve(__dirname, '../../../.env');
if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'local';
process.env.ACCESS_STORE = 'prisma';
process.env.WEB_ORIGIN = 'http://localhost:5173';

export async function assignmentFixture(
  failAudit?: (action: string) => boolean,
  removedReaderPermissions: readonly Permission[] = [],
) {
  const [{ AppModule }, { configureApplication }] = await Promise.all([
    import('../src/app.module'),
    import('../src/configure-application'),
  ]);
  const audit: AuditEventWriter = {
    async append(transaction, event) {
      if (failAudit?.(event.action)) throw new Error('Synthetic audit failure.');
      await transaction.auditEvent.create({
        data: { ...event, metadata: { ...event.metadata } },
      });
    },
  };
  const builder = Test.createTestingModule({ imports: [AppModule] });
  let readerRoles: readonly RoleCode[] | null = null;
  builder.overrideProvider(ACCESS_USER_REPOSITORY).useFactory({
    inject: [PrismaAccessUserRepository],
    factory: (users: PrismaAccessUserRepository) => ({
      async findByExternalSubject(subject: string) {
        const user = await users.findByExternalSubject(subject);
        return user && subject === 'local:auditor' && readerRoles
          ? { ...user, roles: readerRoles }
          : user;
      },
    }),
  });
  if (failAudit) builder.overrideProvider(AUDIT_EVENT_WRITER).useValue(audit);
  const module = await builder.compile();
  const app: INestApplication = module.createNestApplication();
  configureApplication(app);
  if (removedReaderPermissions.length) {
    // After normal authentication/authorization, model a narrower synthetic
    // grant and enforce the actual PermissionGuard against the same HTTP route.
    const permissions = new PermissionGuard(module.get(Reflector));
    app.useGlobalGuards({
      canActivate(context: ExecutionContext) {
        const incoming = context.switchToHttp().getRequest<Request>();
        if (incoming.actor?.externalSubject === 'local:auditor')
          incoming.actor = {
            ...incoming.actor,
            permissions: incoming.actor.permissions.filter(
              (permission) => !removedReaderPermissions.includes(permission),
            ),
          };
        return permissions.canActivate(context);
      },
    });
  }
  await app.init();
  const database = module.get(PrismaService);
  const server = app.getHttpServer() as Server;
  const vessels: string[] = [];
  const members: string[] = [];
  const correlations: string[] = [];
  function send(path: string, body: object, token = 'local.operations-manager') {
    const correlation = `assignment-test-${randomUUID()}`;
    correlations.push(correlation);
    return request(server)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Correlation-Id', correlation)
      .send(body);
  }
  async function unusedReference(
    prefix: string,
    exists: (value: string) => Promise<boolean>,
  ) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${prefix}${randomInt(800000, 900000)}`;
      if (!(await exists(candidate))) return candidate;
    }
    throw new Error('Could not allocate an isolated synthetic reference.');
  }
  async function vessel(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
    const registryNumber = await unusedReference(
      'KW-',
      async (value) =>
        !!(await database.vessel.findUnique({
          where: { registryNumber: value },
          select: { id: true },
        })),
    );
    const response = await send('/api/v1/vessels', {
      name: 'MV Synthetic Plan',
      registryNumber,
    }).expect(201);
    const id = (response.body as { id: string }).id;
    vessels.push(id);
    if (status === 'ARCHIVED')
      await database.vessel.update({ where: { id }, data: { status } });
    return id;
  }
  async function member() {
    const crewNumber = await unusedReference(
      'KW-C-',
      async (value) =>
        !!(await database.crewMember.findUnique({
          where: { crewNumber: value },
          select: { id: true },
        })),
    );
    const response = await send('/api/v1/crew-members', {
      displayName: 'Synthetic Planner',
      crewNumber,
    }).expect(201);
    const id = (response.body as { id: string }).id;
    members.push(id);
    return { id, crewNumber };
  }
  const path = (id: string) => `/api/v1/vessels/${id}/crew-assignments`;
  async function clean() {
    readerRoles = null;
    await database.auditEvent.deleteMany({
      where: { correlationId: { in: correlations } },
    });
    await database.crewAssignment.deleteMany({ where: { vesselId: { in: vessels } } });
    await database.crewQualification.deleteMany({
      where: { crewMemberId: { in: members } },
    });
    await database.crewMember.deleteMany({ where: { id: { in: members } } });
    await database.vessel.deleteMany({ where: { id: { in: vessels } } });
    vessels.length = members.length = correlations.length = 0;
  }
  function restrictReader(roles: readonly RoleCode[]) {
    readerRoles = roles;
  }
  return {
    app,
    database,
    server,
    send,
    vessel,
    member,
    path,
    clean,
    restrictReader,
    correlations,
  };
}
