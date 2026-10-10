import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Maintenance history HTTP/PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    const vessels: string[] = [];
    const users: string[] = [];
    let failAudit = false;
    beforeAll(async () => {
      fixture = await assignmentFixture(
        (action) => failAudit && action.startsWith('MAINTENANCE_ORDER_'),
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
      vessels.length = 0;
      users.length = 0;
    });
    afterAll(async () => {
      await fixture?.app.close();
    });
    async function order() {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const created = await fixture
        .send(`/api/v1/vessels/${vesselId}/maintenance-orders`, {
          title: 'Synthetic pump inspection',
          category: 'INSPECTION',
          priority: 'NORMAL',
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      return {
        vesselId,
        id,
        path: `/api/v1/vessels/${vesselId}/maintenance-orders/${id}`,
      };
    }
    const get = (path: string, token = 'local.auditor') =>
      request(fixture.server).get(path).set('Authorization', `Bearer ${token}`);
    it('retains responsible display names and full lifecycle history after finalization, inactivation and vessel archiving', async () => {
      const current = await order();
      const userId = randomUUID();
      users.push(userId);
      const role = await fixture.database.role.findUniqueOrThrow({
        where: { code: 'OPERATIONS_MANAGER' },
      });
      await fixture.database.user.create({
        data: {
          id: userId,
          displayName: 'Synthetic History Owner',
          email: `${userId}@example.invalid`,
          externalSubject: `history-test:${userId}`,
          roleAssignments: { create: { roleId: role.id, source: 'SYSTEM_SEED' } },
        },
      });
      const correlation = `history-test-${randomUUID()}`;
      fixture.correlations.push(correlation);
      await request(fixture.server)
        .put(current.path)
        .set('Authorization', 'Bearer local.operations-manager')
        .set('X-Correlation-Id', correlation)
        .send({
          title: 'Synthetic pump inspection',
          category: 'CORRECTIVE',
          priority: 'HIGH',
          assigneeId: userId,
          targetDate: '2026-11-01',
          expectedRevision: 1,
        })
        .expect(200);
      let revision = 2;
      for (const action of ['PLAN', 'START', 'BLOCK', 'RESUME', 'CLOSE']) {
        await fixture
          .send(`${current.path}/transitions`, {
            action,
            expectedRevision: revision++,
            ...(action === 'BLOCK' ? { reasonCode: 'AWAITING_RESOURCES' } : {}),
          })
          .expect(201);
      }
      await fixture.database.user.update({
        where: { id: userId },
        data: { status: 'INACTIVE' },
      });
      await fixture.database.vessel.update({
        where: { id: current.vesselId },
        data: { status: 'ARCHIVED' },
      });
      const response = await get(`${current.path}/history`).expect(200);
      const events = (
        response.body as {
          items: {
            reasonCode: string | null;
            changes: {
              field: string;
              oldValue: string | null;
              newValue: string | null;
            }[];
          }[];
        }
      ).items;
      expect(events).toHaveLength(7);
      expect(events[0]?.changes).toEqual([
        { field: 'status', oldValue: 'IN_PROGRESS', newValue: 'CLOSED' },
      ]);
      expect(events[2]?.reasonCode).toBe('AWAITING_RESOURCES');
      expect(events[5]?.changes).toContainEqual({
        field: 'assigneeId',
        oldValue: null,
        newValue: 'Synthetic History Owner',
      });
      expect(events[5]?.changes).toContainEqual({
        field: 'targetDate',
        oldValue: null,
        newValue: '2026-11-01',
      });
      const cancelled = await order();
      await fixture
        .send(`${cancelled.path}/transitions`, {
          action: 'CANCEL',
          expectedRevision: 1,
          reasonCode: 'INCORRECT_RECORD',
        })
        .expect(201);
      expect((await get(`${cancelled.path}/history`).expect(200)).body).toMatchObject({
        items: [
          {
            reasonCode: 'INCORRECT_RECORD',
            changes: [{ field: 'status', oldValue: 'OPEN', newValue: 'CANCELLED' }],
          },
          {},
        ],
      });
    });
    it('decodes only known metadata fields and values without returning unsafe payloads', async () => {
      const current = await order();
      await fixture.database.auditEvent.updateMany({
        where: { entityId: current.id },
        data: {
          metadata: {
            vesselId: current.vesselId,
            title: { payload: 'unsafe nested value' },
            category: 'unknown category',
            priority: 'unknown priority',
            status: 'unknown status',
            assigneeId: 'not-a-user-id',
            targetDate: '2026-02-30',
            reasonCode: 'secret reason',
            email: 'hidden@example.invalid',
            externalSubject: 'hidden subject',
            rawPayload: 'private raw payload',
          },
        },
      });
      const response = await get(`${current.path}/history`).expect(200);
      expect(response.body).toMatchObject({
        items: [
          {
            reasonCode: null,
            changes: [
              { field: 'title', newValue: null },
              { field: 'category', newValue: null },
              { field: 'priority', newValue: null },
              { field: 'status', newValue: null },
              { field: 'assigneeId', newValue: null },
              { field: 'targetDate', newValue: null },
            ],
          },
        ],
      });
      for (const hidden of [
        'unsafe nested value',
        'hidden@example.invalid',
        'hidden subject',
        'private raw payload',
        'secret reason',
      ])
        expect(JSON.stringify(response.body)).not.toContain(hidden);
      await fixture.database.auditEvent.updateMany({
        where: { entityId: current.id },
        data: { action: 'UNKNOWN_MAINTENANCE_ACTION' },
      });
      expect((await get(`${current.path}/history`).expect(200)).body).toMatchObject({
        items: [],
        nextCursor: null,
      });
    });
    const put = (path: string, title: string, expectedRevision: number) => {
      const correlation = `history-test-${randomUUID()}`;
      fixture.correlations.push(correlation);
      return request(fixture.server)
        .put(path)
        .set('Authorization', 'Bearer local.operations-manager')
        .set('X-Correlation-Id', correlation)
        .send({ title, category: 'INSPECTION', priority: 'NORMAL', expectedRevision });
    };
    interface Page {
      items: {
        id: string;
        changes: { field: string; oldValue: string | null; newValue: string | null }[];
      }[];
      nextCursor: string | null;
    }
    it.each(['', 'invalid', 'local.inactive'])(
      'rejects unauthorized identity %s',
      async (token) => {
        const current = await order();
        await get(`${current.path}/history`, token).expect(
          token === 'local.inactive' ? 403 : 401,
        );
      },
    );
    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'denies implicit history grants to %s',
      async (role) => {
        const current = await order();
        fixture.restrictReader([role]);
        await get(`${current.path}/history`).expect(403);
      },
    );
    it.each(['maintenance:read', 'fleet:read', 'activity:read'] as const)(
      'requires the explicit %s permission',
      async (permission) => {
        const current = await order();
        const restricted = await assignmentFixture(undefined, [permission]);
        try {
          await request(restricted.server)
            .get(`${current.path}/history`)
            .set('Authorization', 'Bearer local.auditor')
            .expect(403);
        } finally {
          await restricted.app.close();
        }
      },
    );
    it('shows only a confirmed race winner and leaves data unchanged across history reads', async () => {
      const current = await order();
      const results = await Promise.all([
        put(current.path, 'Synthetic winner A', 1),
        put(current.path, 'Synthetic winner B', 1),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
      const winner = (
        results.find((result) => result.status === 200)!.body as { title: string }
      ).title;
      failAudit = true;
      await put(current.path, 'Synthetic rolled back change', 2).expect(500);
      const snapshot = async () =>
        JSON.stringify({
          order: await fixture.database.maintenanceOrder.findUnique({
            where: { id: current.id },
          }),
          events: await fixture.database.auditEvent.findMany({
            where: { entityId: current.id },
            orderBy: { id: 'asc' },
          }),
        });
      const before = await snapshot();
      const first = (await get(`${current.path}/history`).expect(200)).body as Page;
      expect(first.items).toHaveLength(2);
      expect(first.items[0]?.changes).toEqual([
        { field: 'title', oldValue: 'Synthetic pump inspection', newValue: winner },
      ]);
      expect(JSON.stringify(first)).not.toContain('Synthetic rolled back change');
      await get(`${current.path}/history`, 'local.operations-manager').expect(200);
      expect(await snapshot()).toBe(before);
      expect((await get(current.path).expect(200)).body).toMatchObject({
        title: winner,
        revision: 2,
      });
      await get(
        `/api/v1/vessels/${current.vesselId}/maintenance-orders/${randomUUID()}/history`,
      ).expect(404);
    });
    it('reaches every older event with stable timestamp/ID ties while new changes arrive', async () => {
      const current = await order();
      for (let revision = 1; revision <= 22; revision++)
        await put(current.path, `Synthetic edit ${revision}`, revision).expect(200);
      await fixture.database.auditEvent.updateMany({
        where: { entityId: current.id },
        data: { occurredAt: new Date('2026-10-09T12:00:00.000Z') },
      });
      const first = (await get(`${current.path}/history`).expect(200)).body as Page;
      expect(first.items).toHaveLength(20);
      expect(first.nextCursor).toBe(first.items[19]!.id);
      expect(first.items.map((item) => item.id)).toEqual(
        [...first.items.map((item) => item.id)].sort().reverse(),
      );
      await put(current.path, 'New change after first page', 23).expect(200);
      const second = (
        await get(`${current.path}/history?cursor=${first.nextCursor}`).expect(200)
      ).body as Page;
      expect(second.items).toHaveLength(3);
      expect(second.nextCursor).toBeNull();
      expect(
        new Set([...first.items, ...second.items].map((event) => event.id)).size,
      ).toBe(23);
      expect(
        second.items.some((item) => first.items.some((event) => event.id === item.id)),
      ).toBe(false);
      expect(
        second.items
          .flatMap((item) => item.changes)
          .some((change) => change.newValue === 'New change after first page'),
      ).toBe(false);
      const other = await order();
      await get(`${other.path}/history?cursor=${first.nextCursor}`).expect(400);
      await get(
        `/api/v1/vessels/${other.vesselId}/maintenance-orders/${current.id}/history`,
      ).expect(404);
      await get(`${current.path}/history?cursor=bad`).expect(400);
      await get(`${current.path}/history?cursor=${randomUUID()}`).expect(400);
      await get(`${current.path}/history?pageSize=100`).expect(400);
    });
    it('lets both permitted roles read an order creation with safe values and actor identity', async () => {
      const current = await order();
      for (const token of ['local.auditor', 'local.operations-manager']) {
        const response = await get(`${current.path}/history`, token).expect(200);
        expect(response.body).toMatchObject({
          pageSize: 20,
          nextCursor: null,
          items: [
            {
              action: 'MAINTENANCE_ORDER_CREATED',
              actorDisplayName: expect.any(String) as unknown,
              occurredAt: expect.any(String) as unknown,
              changes: [
                { field: 'title', oldValue: null, newValue: 'Synthetic pump inspection' },
                { field: 'category', oldValue: null, newValue: 'INSPECTION' },
                { field: 'priority', oldValue: null, newValue: 'NORMAL' },
                { field: 'status', oldValue: null, newValue: 'OPEN' },
                { field: 'assigneeId', oldValue: null, newValue: null },
                { field: 'targetDate', oldValue: null, newValue: null },
              ],
              reasonCode: null,
            },
          ],
        });
        const body = JSON.stringify(response.body);
        for (const hidden of ['email', 'externalSubject', 'metadata', 'actorUserId'])
          expect(body).not.toContain(hidden);
      }
    });
  },
);
