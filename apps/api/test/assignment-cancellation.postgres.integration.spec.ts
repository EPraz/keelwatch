import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Assignment cancellation HTTP + PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    beforeAll(async () => {
      fixture = await assignmentFixture();
    });
    afterEach(async () => fixture.clean());
    afterAll(async () => fixture.app.close());
    it('invalidates the whole plan, preserves its history and frees the original period', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const input = {
        crewNumber: member.crewNumber,
        role: 'DEMO_DECK',
        startsOn: '2040-02-01',
        endsOn: '2040-02-15',
      };
      const creation = await fixture.send(fixture.path(vessel), input).expect(201);
      const plan = creation.body as { id: string };
      const cancellation = await fixture
        .send(`${fixture.path(vessel)}/${plan.id}/cancellation`, {
          reason: 'INCORRECT_RECORD',
        })
        .expect(201);
      expect(cancellation.body).toMatchObject({
        ...(creation.body as object),
        status: 'CANCELLED',
        cancellation: { reason: 'INCORRECT_RECORD', reasonLabel: 'Incorrect record' },
      });
      const events = await fixture.database.auditEvent.findMany({
        where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CANCELLED' },
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.metadata).toEqual({
        assignmentId: plan.id,
        crewNumber: member.crewNumber,
        reason: 'INCORRECT_RECORD',
        role: input.role,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
      });
      await fixture.send(fixture.path(vessel), input).expect(201);
      const history = await request(fixture.server)
        .get(fixture.path(vessel))
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(history.body).toMatchObject({ total: 2 });
      expect((history.body as { items: object[] }).items).toContainEqual(
        cancellation.body,
      );
    });

    it('handles same-reason concurrent retries without changing the first cancellation and rejects a new reason', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const creation = await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber,
          role: 'DEMO_SUPPORT',
          startsOn: '2040-01-01',
          endsOn: '2040-01-15',
        })
        .expect(201);
      const path = `${fixture.path(vessel)}/${(creation.body as { id: string }).id}/cancellation`;
      const results = await Promise.all([
        fixture.send(path, { reason: 'PLAN_CHANGED' }),
        fixture.send(path, { reason: 'PLAN_CHANGED' }),
      ]);
      expect(results.map((result) => result.status)).toEqual([201, 201]);
      expect(results[0]?.body).toEqual(results[1]?.body);
      const before = await fixture.database.crewAssignment.findUniqueOrThrow({
        where: { id: (creation.body as { id: string }).id },
      });
      await fixture.send(path, { reason: 'PLAN_CHANGED' }).expect(201);
      await fixture.send(path, { reason: 'INCORRECT_RECORD' }).expect(409);
      expect(
        await fixture.database.crewAssignment.findUniqueOrThrow({
          where: { id: before.id },
        }),
      ).toEqual(before);
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CANCELLED' },
        }),
      ).toBe(1);
    });

    it('linearizes cancel/create races without overlapping active reservations or duplicate events', async () => {
      const vessel = await fixture.vessel();
      const other = await fixture.vessel();
      const member = await fixture.member();
      const input = {
        crewNumber: member.crewNumber,
        role: 'DEMO_DECK',
        startsOn: '2040-01-01',
        endsOn: '2040-01-15',
      };
      const creation = await fixture.send(fixture.path(vessel), input).expect(201);
      const path = `${fixture.path(vessel)}/${(creation.body as { id: string }).id}/cancellation`;
      const [cancel, create] = await Promise.all([
        fixture.send(path, { reason: 'PLAN_CHANGED' }),
        fixture.send(fixture.path(other), input),
      ]);
      expect(cancel.status).toBe(201);
      expect([201, 409]).toContain(create.status);
      if (create.status === 409)
        await fixture.send(fixture.path(other), input).expect(201);
      expect(
        await fixture.database.crewAssignment.count({
          where: { crewMemberId: member.id, cancelledAt: null },
        }),
      ).toBe(1);
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CANCELLED' },
        }),
      ).toBe(1);
    });

    it.each(['2000-01-01', new Date().toISOString().slice(0, 10), '2040-01-01'])(
      'cancels past/current/future plans on archived vessels: %s',
      async (date) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        const creation = await fixture
          .send(fixture.path(vessel), {
            crewNumber: member.crewNumber,
            role: 'DEMO_DECK',
            startsOn: date,
            endsOn: date,
          })
          .expect(201);
        await fixture.database.vessel.update({
          where: { id: vessel },
          data: { status: 'ARCHIVED' },
        });
        const cancelled = await fixture
          .send(
            `${fixture.path(vessel)}/${(creation.body as { id: string }).id}/cancellation`,
            { reason: 'INCORRECT_RECORD' },
          )
          .expect(201);
        expect(cancelled.body).toMatchObject({
          status: 'CANCELLED',
          startsOn: date,
          endsOn: date,
        });
      },
    );

    it('rejects invalid/unowned cancellation fields and wrong-vessel requests without writes', async () => {
      const vessel = await fixture.vessel();
      const other = await fixture.vessel();
      const member = await fixture.member();
      const created = await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber,
          role: 'DEMO_DECK',
          startsOn: '2040-01-01',
          endsOn: '2040-01-02',
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      const path = `${fixture.path(vessel)}/${id}/cancellation`;
      for (const invalid of [
        {},
        { reason: 'free text' },
        { reason: 'PLAN_CHANGED', note: 'anything' },
        { reason: 'PLAN_CHANGED', cancelledById: randomUUID() },
      ])
        await fixture.send(path, invalid).expect(400);
      await fixture
        .send(`${fixture.path(other)}/${id}/cancellation`, { reason: 'PLAN_CHANGED' })
        .expect(404);
      await fixture
        .send(`${fixture.path(vessel)}/${randomUUID()}/cancellation`, {
          reason: 'PLAN_CHANGED',
        })
        .expect(404);
      for (const token of [undefined, 'local.auditor', 'local.inactive']) {
        const action = request(fixture.server).post(path);
        if (token) action.set('Authorization', `Bearer ${token}`);
        await action.send({ reason: 'PLAN_CHANGED' }).expect(token ? 403 : 401);
      }
      expect(
        await fixture.database.crewAssignment.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({ cancelledAt: null });
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CANCELLED' },
        }),
      ).toBe(0);
    });
  },
);
