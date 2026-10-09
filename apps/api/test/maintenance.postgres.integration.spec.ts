import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { openApiResponseType } from './requirement-evaluation-contract';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'MaintenanceOrder HTTP with PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    const vessels: string[] = [];
    const users: string[] = [];
    let failingAction: string | undefined;
    beforeAll(async () => {
      fixture = await assignmentFixture((action) => action === failingAction);
    });
    afterEach(async () => {
      failingAction = undefined;
      await fixture.database.maintenanceOrder.deleteMany({
        where: { vesselId: { in: vessels } },
      });
      await fixture.clean();
      await fixture.database.userRoleAssignment.deleteMany({
        where: { userId: { in: users } },
      });
      await fixture.database.user.deleteMany({ where: { id: { in: users } } });
      users.length = 0;
      vessels.length = 0;
    });
    afterAll(async () => {
      await fixture?.app.close();
    });
    const input = {
      title: 'Inspect cooling pump',
      category: 'INSPECTION',
      priority: 'NORMAL',
    };
    async function createOrder() {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      const created = await fixture.send(path, input).expect(201);
      return { vesselId, path, id: (created.body as { id: string }).id };
    }
    function put(path: string, body: object, token = 'local.operations-manager') {
      const correlation = `maintenance-test-${randomUUID()}`;
      fixture.correlations.push(correlation);
      return request(fixture.server)
        .put(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Correlation-Id', correlation)
        .send(body);
    }
    function get(path: string, token = 'local.auditor') {
      return request(fixture.server).get(path).set('Authorization', `Bearer ${token}`);
    }
    it('creates an Open order retrievable by an Auditor in its vessel', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      const created = await fixture
        .send(path, {
          title: '  Inspect cooling pump  ',
          category: 'INSPECTION',
          priority: 'NORMAL',
        })
        .expect(201);
      const order = created.body as { id: string };
      const detail = await request(fixture.server)
        .get(`${path}/${order.id}`)
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(detail.body).toMatchObject({
        id: order.id,
        vesselId,
        title: 'Inspect cooling pump',
        status: 'OPEN',
        revision: 1,
        assignee: null,
        targetDate: null,
      });
    });
    it('records an eligible responsible user and a strict optional calendar date', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const me = await request(fixture.server)
        .get('/api/v1/access/me')
        .set('Authorization', 'Bearer local.operations-manager')
        .expect(200);
      const assigneeId = (me.body as { id: string }).id;
      const created = await fixture
        .send(`/api/v1/vessels/${vesselId}/maintenance-orders`, {
          title: 'Service cooling pump',
          category: 'PREVENTIVE',
          priority: 'HIGH',
          assigneeId,
          targetDate: '2026-02-28',
        })
        .expect(201);
      expect(created.body).toMatchObject({
        assignee: { id: assigneeId },
        targetDate: '2026-02-28',
      });
    });
    it('allows only one concurrent edit from the same revision and preserves the winner', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      const input = {
        title: 'Inspect cooling pump',
        category: 'INSPECTION',
        priority: 'NORMAL',
      };
      const response = await fixture.send(path, input).expect(201);
      const id = (response.body as { id: string }).id;
      const correlation = `maintenance-test-${randomUUID()}`;
      fixture.correlations.push(correlation);
      const edit = (title: string) =>
        request(fixture.server)
          .put(`${path}/${id}`)
          .set('Authorization', 'Bearer local.operations-manager')
          .set('X-Correlation-Id', correlation)
          .send({ ...input, title, expectedRevision: 1 });
      const edits = await Promise.all([
        edit('Inspect impeller'),
        edit('Inspect coupling'),
      ]);
      expect(edits.map((result) => result.status).sort()).toEqual([200, 409]);
      const winner = edits.find((result) => result.status === 200)!;
      const loser = edits.find((result) => result.status === 409)!;
      expect(loser.body).toMatchObject({ code: 'MAINTENANCE_STALE_WRITE' });
      const current = await request(fixture.server)
        .get(`${path}/${id}`)
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(current.body).toMatchObject({
        title: (winner.body as { title: string }).title,
        revision: 2,
      });
      const events = await fixture.database.auditEvent.findMany({
        where: { entityId: id },
      });
      expect(events.map((event) => event.action).sort()).toEqual([
        'MAINTENANCE_ORDER_CREATED',
        'MAINTENANCE_ORDER_UPDATED',
      ]);
    });
    it('filters before paginating a vessel-scoped stable list of 20 orders', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      const ids: string[] = [];
      for (let index = 0; index < 21; index++) {
        const created = await fixture
          .send(path, {
            title: `Inspect pump ${index}`,
            category: 'INSPECTION',
            priority: index === 0 ? 'HIGH' : 'NORMAL',
          })
          .expect(201);
        ids.unshift((created.body as { id: string }).id);
      }
      const read = (query: string) =>
        request(fixture.server)
          .get(`${path}${query}`)
          .set('Authorization', 'Bearer local.auditor')
          .expect(200);
      const first = await read('?page=1');
      expect(first.body).toMatchObject({ total: 21, pageSize: 20, totalPages: 2 });
      expect(
        (first.body as { items: { id: string }[] }).items.map((order) => order.id),
      ).toEqual(ids.slice(0, 20));
      const filtered = await read('?priority=HIGH&status=OPEN');
      expect(filtered.body).toMatchObject({
        total: 1,
        totalPages: 1,
        items: [{ id: ids[20] }],
      });
      const second = await read('?page=2');
      expect(
        (second.body as { items: { id: string }[] }).items.map((order) => order.id),
      ).toEqual(ids.slice(20));
    });
    it('offers a bounded eligible-user selector without external identity or email', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const result = await request(fixture.server)
        .get(`/api/v1/vessels/${vesselId}/maintenance-orders/assignees?page=1`)
        .set('Authorization', 'Bearer local.operations-manager')
        .expect(200);
      const page = result.body as {
        items: { id: string; displayName: string }[];
        pageSize: number;
      };
      expect(page.pageSize).toBe(20);
      expect(page.items.length).toBeGreaterThan(0);
      expect(
        page.items.every(
          (item) => Object.keys(item).sort().join(',') === 'displayName,id',
        ),
      ).toBe(true);
    });
    it('keeps the generated web contract synchronized with published OpenAPI', async () => {
      const document = SwaggerModule.createDocument(
        fixture.app,
        new DocumentBuilder().build(),
      );
      const root = '/api/v1/vessels/{vesselId}/maintenance-orders';
      const expected = await format(
        `// Generated from Maintenance OpenAPI; checked by maintenance.postgres.integration.spec.ts.\nexport type MaintenanceOrder = ${openApiResponseType(document, `${root}/{orderId}`)};\nexport type MaintenancePage = ${openApiResponseType(document, root)};\nexport type MaintenanceAssigneePage = ${openApiResponseType(document, `${root}/assignees`)};\n`,
        { parser: 'typescript', singleQuote: true, printWidth: 88 },
      );
      const file = resolve(
        __dirname,
        '../../web/src/features/maintenance/maintenance.types.ts',
      );
      if (process.env.UPDATE_MAINTENANCE_CONTRACT === 'true')
        writeFileSync(file, expected);
      expect(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).toBe(expected);
    });
    it.each([
      { title: ' x ' },
      { title: 'x'.repeat(121) },
      { title: null },
      { category: 'UNKNOWN' },
      { priority: null },
      { targetDate: '2026-02-29' },
      { targetDate: '0000-01-01' },
      { targetDate: '2026-1-01' },
      { targetDate: '' },
      { assigneeId: 'invalid' },
      { assigneeId: randomUUID() },
      { description: 'unexpected' },
      { status: 'CLOSED' },
      { vesselId: randomUUID() },
    ])(
      'rejects invalid or immutable creation fields %j without an order or audit',
      async (invalid) => {
        const vesselId = await fixture.vessel();
        vessels.push(vesselId);
        const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
        await fixture.send(path, { ...input, ...invalid }).expect(400);
        expect((await get(path).expect(200)).body).toMatchObject({ total: 0, items: [] });
        expect(
          await fixture.database.auditEvent.count({
            where: {
              action: 'MAINTENANCE_ORDER_CREATED',
              correlationId: { in: fixture.correlations },
            },
          }),
        ).toBe(0);
      },
    );
    it.each(['2024-02-29', '0001-01-01', '9999-12-31', null])(
      'accepts valid dates including past dates and null: %s',
      async (targetDate) => {
        const vesselId = await fixture.vessel();
        vessels.push(vesselId);
        const result = await fixture
          .send(`/api/v1/vessels/${vesselId}/maintenance-orders`, {
            ...input,
            targetDate,
          })
          .expect(201);
        expect(result.body).toMatchObject({ targetDate });
      },
    );
    it('retains reads and existing field edits on an archived vessel while denying new orders', async () => {
      const order = await createOrder();
      await fixture.database.vessel.update({
        where: { id: order.vesselId },
        data: { status: 'ARCHIVED' },
      });
      await fixture.send(order.path, input).expect(409);
      await get(`${order.path}/${order.id}`).expect(200);
      const saved = await put(`${order.path}/${order.id}`, {
        ...input,
        priority: 'HIGH',
        expectedRevision: 1,
      }).expect(200);
      expect(saved.body).toMatchObject({ priority: 'HIGH', revision: 2 });
    });
    it('serializes creation against a concurrent archive and adds no order or audit', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      let release!: () => void;
      let locked!: () => void;
      const ready = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const archive = fixture.database.$transaction(async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM vessels WHERE id = ${vesselId}::uuid FOR UPDATE`,
        );
        await transaction.vessel.update({
          where: { id: vesselId },
          data: { status: 'ARCHIVED' },
        });
        locked();
        await gate;
      });
      await ready;
      const creation = fixture.send(path, input).then((response) => response);
      try {
        let blocked = false;
        for (let attempt = 0; attempt < 100 && !blocked; attempt++) {
          const rows = await fixture.database.$queryRaw<{ count: bigint }[]>(Prisma.sql`
            SELECT COUNT(*) AS count FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
            AND (query LIKE '%maintenance_orders%' OR query LIKE '%SELECT id FROM vessels%')`);
          blocked = Number(rows[0]?.count) > 0;
          if (!blocked) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(true);
      } finally {
        release();
        await archive;
      }
      expect((await creation).status).toBe(409);
      expect((await get(path).expect(200)).body).toMatchObject({ total: 0 });
      expect(
        await fixture.database.auditEvent.count({
          where: {
            action: 'MAINTENANCE_ORDER_CREATED',
            correlationId: { in: fixture.correlations },
          },
        }),
      ).toBe(0);
    });
    it('rejects cross-vessel reads and edits and excludes other vessels from lists', async () => {
      const order = await createOrder();
      const other = await fixture.vessel();
      vessels.push(other);
      const path = `/api/v1/vessels/${other}/maintenance-orders`;
      await get(`${path}/${order.id}`).expect(404);
      await put(`${path}/${order.id}`, { ...input, expectedRevision: 1 }).expect(404);
      expect((await get(path).expect(200)).body).toMatchObject({ total: 0, items: [] });
    });
    it('does not increment or audit unchanged writes and still rejects stale no-ops', async () => {
      const order = await createOrder();
      const path = `${order.path}/${order.id}`;
      expect(
        (await put(path, { ...input, expectedRevision: 1 }).expect(200)).body,
      ).toMatchObject({ revision: 1 });
      await put(path, { ...input, priority: 'HIGH', expectedRevision: 1 }).expect(200);
      await put(path, { ...input, priority: 'HIGH', expectedRevision: 1 }).expect(409);
      expect((await get(path).expect(200)).body).toMatchObject({
        priority: 'HIGH',
        revision: 2,
      });
      expect(
        await fixture.database.auditEvent.count({ where: { entityId: order.id } }),
      ).toBe(2);
    });
    it.each([undefined, null, 0, -1, 1.5, '1', 2147483647])(
      'requires a valid explicit expected revision (%s)',
      async (expectedRevision) => {
        const order = await createOrder();
        await put(`${order.path}/${order.id}`, { ...input, expectedRevision }).expect(
          400,
        );
      },
    );
    it.each(['CLOSED', 'CANCELLED'] as const)(
      'rejects field edits to final orders (%s)',
      async (status) => {
        const order = await createOrder();
        await fixture.database.maintenanceOrder.update({
          where: { id: order.id },
          data: { status },
        });
        await put(`${order.path}/${order.id}`, {
          ...input,
          title: 'Changed title',
          expectedRevision: 1,
        }).expect(409);
        expect((await get(`${order.path}/${order.id}`).expect(200)).body).toMatchObject({
          title: input.title,
          revision: 1,
          status,
        });
      },
    );
    it('rechecks assignee eligibility while retaining later-ineligible assignments on other field edits', async () => {
      const order = await createOrder();
      const path = `${order.path}/${order.id}`;
      const role = await fixture.database.role.findUniqueOrThrow({
        where: { code: 'OPERATIONS_MANAGER' },
      });
      const id = randomUUID();
      users.push(id);
      await fixture.database.user.create({
        data: {
          id,
          displayName: 'Synthetic Maintenance Owner',
          email: `${id}@example.invalid`,
          externalSubject: `maintenance-test:${id}`,
          roleAssignments: { create: { roleId: role.id, source: 'SYSTEM_SEED' } },
        },
      });
      await put(path, {
        ...input,
        assigneeId: id,
        targetDate: '2026-11-01',
        expectedRevision: 1,
      }).expect(200);
      await fixture.database.user.update({ where: { id }, data: { status: 'INACTIVE' } });
      const selector = await get(
        `${order.path}/assignees`,
        'local.operations-manager',
      ).expect(200);
      expect(
        (selector.body as { items: { id: string }[] }).items.some(
          (item) => item.id === id,
        ),
      ).toBe(false);
      const saved = await put(path, {
        ...input,
        title: 'Inspect impeller',
        assigneeId: id,
        expectedRevision: 2,
      }).expect(200);
      expect(saved.body).toMatchObject({
        assignee: { id, displayName: 'Synthetic Maintenance Owner' },
        revision: 3,
      });
      await put(path, {
        ...input,
        assigneeId: null,
        targetDate: null,
        expectedRevision: 3,
      }).expect(200);
      await put(path, { ...input, assigneeId: id, expectedRevision: 4 }).expect(400);
      expect((await get(path).expect(200)).body).toMatchObject({
        assignee: null,
        targetDate: null,
        revision: 4,
      });
    });
    it.each(['local.auditor', 'local.inactive', 'invalid', ''])(
      'denies protected writes and selector access for %s',
      async (token) => {
        const order = await createOrder();
        const expected =
          token === 'local.auditor' || token === 'local.inactive' ? 403 : 401;
        await fixture.send(order.path, input, token).expect(expected);
        await put(
          `${order.path}/${order.id}`,
          { ...input, expectedRevision: 1 },
          token,
        ).expect(expected);
        await get(`${order.path}/assignees`, token).expect(expected);
        if (token !== 'local.auditor') {
          await get(order.path, token).expect(expected);
          await get(`${order.path}/${order.id}`, token).expect(expected);
        }
      },
    );
    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'does not grant implicit maintenance access to %s',
      async (role) => {
        const order = await createOrder();
        fixture.restrictReader([role]);
        await get(order.path).expect(403);
        await get(`${order.path}/${order.id}`).expect(403);
        await put(
          `${order.path}/${order.id}`,
          { ...input, expectedRevision: 1 },
          'local.auditor',
        ).expect(403);
      },
    );
    it('rolls back both creation and revision changes if audit fails', async () => {
      const vesselId = await fixture.vessel();
      vessels.push(vesselId);
      const path = `/api/v1/vessels/${vesselId}/maintenance-orders`;
      failingAction = 'MAINTENANCE_ORDER_CREATED';
      await fixture.send(path, input).expect(500);
      expect((await get(path).expect(200)).body).toMatchObject({ total: 0 });
      failingAction = undefined;
      const created = await fixture.send(path, input).expect(201);
      const id = (created.body as { id: string }).id;
      failingAction = 'MAINTENANCE_ORDER_UPDATED';
      await put(`${path}/${id}`, {
        ...input,
        priority: 'HIGH',
        expectedRevision: 1,
      }).expect(500);
      expect((await get(`${path}/${id}`).expect(200)).body).toMatchObject({
        priority: 'NORMAL',
        revision: 1,
      });
      expect(await fixture.database.auditEvent.count({ where: { entityId: id } })).toBe(
        1,
      );
    });
  },
);
