import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { MaintenanceStatus } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Maintenance lifecycle HTTP/PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    const vessels: string[] = [];
    const users: string[] = [];
    let failAudit = false;
    beforeAll(async () => {
      fixture = await assignmentFixture(
        (action) => failAudit && action === 'MAINTENANCE_ORDER_TRANSITIONED',
      );
    });
    afterEach(async () => {
      failAudit = false;
      await fixture.database.maintenanceOrder.deleteMany({
        where: { vesselId: { in: vessels } },
      });
      await fixture.clean();
      await fixture.database.userRoleAssignment.deleteMany({
        where: { userId: { in: users } },
      });
      await fixture.database.user.deleteMany({ where: { id: { in: users } } });
      vessels.length = users.length = 0;
    });
    afterAll(async () => {
      await fixture?.app.close();
    });
    const values = {
      title: 'Synthetic engine inspection',
      category: 'INSPECTION',
      priority: 'NORMAL',
    };
    async function order(status: MaintenanceStatus = 'OPEN') {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const me = await request(fixture.server)
        .get('/api/v1/access/me')
        .set('Authorization', 'Bearer local.operations-manager')
        .expect(200);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      const created = await fixture
        .send(path, {
          ...values,
          assigneeId: (me.body as { id: string }).id,
          targetDate: '2026-11-01',
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      if (status !== 'OPEN')
        await fixture.database.maintenanceOrder.update({
          where: { id },
          data: {
            status,
            reasonCode:
              status === 'BLOCKED'
                ? 'COORDINATION_REQUIRED'
                : status === 'CANCELLED'
                  ? 'INCORRECT_RECORD'
                  : null,
          },
        });
      return { vesselId, id, path: `${path}/${id}` };
    }
    const get = (path: string) =>
      request(fixture.server).get(path).set('Authorization', 'Bearer local.auditor');
    const transition = (path: string, body: object, token = 'local.operations-manager') =>
      fixture.send(`${path}/transitions`, body, token);
    const put = (path: string, body: object) => {
      const correlation = `lifecycle-test-${randomUUID()}`;
      fixture.correlations.push(correlation);
      return request(fixture.server)
        .put(path)
        .set('Authorization', 'Bearer local.operations-manager')
        .set('X-Correlation-Id', correlation)
        .send(body);
    };
    const states = [
      'OPEN',
      'PLANNED',
      'IN_PROGRESS',
      'BLOCKED',
      'CLOSED',
      'CANCELLED',
    ] as const;
    const actions = ['PLAN', 'START', 'BLOCK', 'RESUME', 'CLOSE', 'CANCEL'] as const;
    const allowed: Record<MaintenanceStatus, readonly string[]> = {
      OPEN: ['PLAN', 'CANCEL'],
      PLANNED: ['START', 'CANCEL'],
      IN_PROGRESS: ['BLOCK', 'CLOSE', 'CANCEL'],
      BLOCKED: ['RESUME', 'CANCEL'],
      CLOSED: [],
      CANCELLED: [],
    };
    it.each(states)('enforces every allowed and denied edge from %s', async (status) => {
      for (const action of actions) {
        const current = await order(status);
        const result = await transition(current.path, {
          action,
          expectedRevision: 1,
          ...(action === 'BLOCK'
            ? { reasonCode: 'COORDINATION_REQUIRED' }
            : action === 'CANCEL'
              ? { reasonCode: 'WORK_NO_LONGER_REQUIRED' }
              : {}),
        });
        const permits = allowed[status].includes(action);
        expect(result.status).toBe(permits ? 201 : 409);
        expect((await get(current.path).expect(200)).body).toMatchObject({
          revision: permits ? 2 : 1,
        });
        expect(
          await fixture.database.auditEvent.count({
            where: { entityId: current.id, action: 'MAINTENANCE_ORDER_TRANSITIONED' },
          }),
        ).toBe(permits ? 1 : 0);
        if (permits && action === 'CANCEL')
          expect(result.body).toMatchObject({
            status: 'CANCELLED',
            reasonCode: 'WORK_NO_LONGER_REQUIRED',
          });
      }
    });
    it.each([
      { action: 'BLOCK', status: 'IN_PROGRESS', reasonCode: undefined },
      { action: 'BLOCK', status: 'IN_PROGRESS', reasonCode: 'INCORRECT_RECORD' },
      { action: 'CANCEL', status: 'OPEN', reasonCode: undefined },
      { action: 'CANCEL', status: 'OPEN', reasonCode: 'AWAITING_RESOURCES' },
      { action: 'PLAN', status: 'OPEN', reasonCode: 'COORDINATION_REQUIRED' },
      { action: 'BLOCK', status: 'IN_PROGRESS', reasonCode: null },
      { action: 'CANCEL', status: 'OPEN', reasonCode: '' },
    ] as const)(
      'rejects missing or inappropriate reasons %j without writing',
      async ({ status, ...body }) => {
        const current = await order(status);
        await transition(current.path, { ...body, expectedRevision: 1 }).expect(400);
        expect((await get(current.path).expect(200)).body).toMatchObject({
          status,
          revision: 1,
        });
      },
    );
    it.each([undefined, null, 0, -1, '1', 1.5, 2147483647])(
      'rejects invalid expected revision %s',
      async (expectedRevision) => {
        const current = await order();
        await transition(current.path, { action: 'PLAN', expectedRevision }).expect(400);
      },
    );
    it.each(['local.auditor', 'local.inactive', 'invalid', ''])(
      'denies transition for identity %s',
      async (token) => {
        const current = await order();
        await transition(
          current.path,
          { action: 'PLAN', expectedRevision: 1 },
          token,
        ).expect(token === 'local.auditor' || token === 'local.inactive' ? 403 : 401);
        expect((await get(current.path).expect(200)).body).toMatchObject({
          status: 'OPEN',
          revision: 1,
        });
      },
    );
    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'denies implicit grants to %s',
      async (role) => {
        const current = await order();
        fixture.restrictReader([role]);
        await transition(
          current.path,
          { action: 'PLAN', expectedRevision: 1 },
          'local.auditor',
        ).expect(403);
      },
    );
    it('requires planning fields and isolates transitions by vessel', async () => {
      const current = await order();
      await put(current.path, {
        ...values,
        targetDate: null,
        expectedRevision: 1,
      }).expect(200);
      await transition(current.path, { action: 'PLAN', expectedRevision: 2 }).expect(400);
      await put(current.path, {
        ...values,
        targetDate: '2026-11-01',
        assigneeId: null,
        expectedRevision: 2,
      }).expect(200);
      await transition(current.path, { action: 'PLAN', expectedRevision: 3 }).expect(400);
      const other = await fixture.vessel();
      vessels.push(other);
      await transition(`/api/v1/vessels/${other}/maintenance-orders/${current.id}`, {
        action: 'PLAN',
        expectedRevision: 3,
      }).expect(404);
      await transition(current.path, {
        action: 'PLAN',
        expectedRevision: 3,
        status: 'CLOSED',
      }).expect(400);
    });
    it('rechecks an owned synthetic assignee at plan/start/resume while permitting finalization after ineligibility', async () => {
      const current = await order();
      const role = await fixture.database.role.findUniqueOrThrow({
        where: { code: 'OPERATIONS_MANAGER' },
      });
      const id = randomUUID();
      users.push(id);
      await fixture.database.user.create({
        data: {
          id,
          displayName: 'Synthetic Lifecycle Owner',
          email: `${id}@example.invalid`,
          externalSubject: `lifecycle-test:${id}`,
          roleAssignments: { create: { roleId: role.id, source: 'SYSTEM_SEED' } },
        },
      });
      await put(current.path, { ...values, assigneeId: id, expectedRevision: 1 }).expect(
        200,
      );
      await fixture.database.user.update({ where: { id }, data: { status: 'INACTIVE' } });
      for (const [status, action] of [
        ['OPEN', 'PLAN'],
        ['PLANNED', 'START'],
        ['BLOCKED', 'RESUME'],
      ] as const) {
        await fixture.database.maintenanceOrder.update({
          where: { id: current.id },
          data: {
            status,
            reasonCode: status === 'BLOCKED' ? 'AWAITING_RESOURCES' : null,
          },
        });
        await transition(current.path, { action, expectedRevision: 2 }).expect(400);
        expect((await get(current.path).expect(200)).body).toMatchObject({
          status,
          revision: 2,
          assignee: { id },
        });
      }
      await fixture.database.maintenanceOrder.update({
        where: { id: current.id },
        data: { status: 'IN_PROGRESS', reasonCode: null },
      });
      await transition(current.path, { action: 'CLOSE', expectedRevision: 2 }).expect(
        201,
      );
      expect((await get(current.path).expect(200)).body).toMatchObject({
        status: 'CLOSED',
        assignee: { id },
      });
      await fixture.database.maintenanceOrder.update({
        where: { id: current.id },
        data: { status: 'BLOCKED', reasonCode: 'AWAITING_RESOURCES' },
      });
      await transition(current.path, {
        action: 'CANCEL',
        reasonCode: 'INCORRECT_RECORD',
        expectedRevision: 3,
      }).expect(201);
    });
    it.each(['edit/transition', 'transition/transition'])(
      'has one actual winner in a %s race',
      async (race) => {
        const current = await order(race === 'edit/transition' ? 'OPEN' : 'IN_PROGRESS');
        const results = await Promise.all([
          race === 'edit/transition'
            ? put(current.path, {
                ...values,
                title: 'Changed by competing editor',
                expectedRevision: 1,
              })
            : transition(current.path, {
                action: 'BLOCK',
                reasonCode: 'AWAITING_RESOURCES',
                expectedRevision: 1,
              }),
          transition(current.path, {
            action: race === 'edit/transition' ? 'PLAN' : 'CLOSE',
            expectedRevision: 1,
          }),
        ]);
        expect(
          results.filter((result) => [200, 201].includes(result.status)),
        ).toHaveLength(1);
        expect(results.find((result) => result.status === 409)?.body).toMatchObject({
          code: 'MAINTENANCE_STALE_WRITE',
        });
        const winner = results.find((result) => result.status < 300)!;
        expect((await get(current.path).expect(200)).body).toMatchObject({
          title: (winner.body as { title: string }).title,
          status: (winner.body as { status: string }).status,
          revision: 2,
        });
        expect(
          await fixture.database.auditEvent.count({ where: { entityId: current.id } }),
        ).toBe(2);
      },
    );
    it('rolls state and revision back when audit fails and manages existing archived-vessel work', async () => {
      const current = await order('IN_PROGRESS');
      await fixture.database.vessel.update({
        where: { id: current.vesselId },
        data: { status: 'ARCHIVED' },
      });
      failAudit = true;
      await transition(current.path, { action: 'CLOSE', expectedRevision: 1 }).expect(
        500,
      );
      expect((await get(current.path).expect(200)).body).toMatchObject({
        status: 'IN_PROGRESS',
        revision: 1,
      });
      expect(
        await fixture.database.auditEvent.count({ where: { entityId: current.id } }),
      ).toBe(1);
      failAudit = false;
      await transition(current.path, { action: 'CLOSE', expectedRevision: 1 }).expect(
        201,
      );
      expect((await get(current.path).expect(200)).body).toMatchObject({
        status: 'CLOSED',
        revision: 2,
      });
    });
  },
);
