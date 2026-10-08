import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Assignment HTTP + PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    beforeAll(async () => {
      fixture = await assignmentFixture();
    });
    afterEach(async () => fixture.clean());
    afterAll(async () => fixture.app.close());

    it('plans a profile without qualifications and returns its safe vessel history with an atomic audit', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const response = await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber.toLowerCase(),
          role: 'DEMO_DECK',
          startsOn: '2040-02-01',
          endsOn: '2040-02-01',
        })
        .expect(201);
      expect(response.body).toMatchObject({
        crewNumber: member.crewNumber,
        roleLabel: 'Deck role (demo)',
        status: 'SCHEDULED',
      });
      expect(response.body).not.toHaveProperty('createdById');
      const history = await request(fixture.server)
        .get(fixture.path(vessel))
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(history.body).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 20,
        items: [response.body],
      });
      const events = await fixture.database.auditEvent.findMany({
        where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CREATED' },
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.metadata).toEqual({
        assignmentId: (response.body as { id: string }).id,
        crewNumber: member.crewNumber,
        role: 'DEMO_DECK',
        startsOn: '2040-02-01',
        endsOn: '2040-02-01',
      });
    });

    it('serializes inclusive overlaps across vessels but permits next-day and other-member plans', async () => {
      const first = await fixture.vessel();
      const second = await fixture.vessel();
      const member = await fixture.member();
      const input = {
        crewNumber: member.crewNumber,
        role: 'DEMO_SUPPORT',
        startsOn: '2040-03-01',
        endsOn: '2040-03-15',
      };
      const responses = await Promise.all([
        fixture.send(fixture.path(first), input),
        fixture.send(fixture.path(second), input),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(responses.find((response) => response.status === 409)?.body).toMatchObject({
        code: 'CREW_ASSIGNMENT_OVERLAP',
        fieldErrors: { startsOn: ['Choose a non-overlapping period.'] },
      });
      await fixture
        .send(fixture.path(second), {
          ...input,
          startsOn: '2040-03-15',
          endsOn: '2040-03-16',
          role: 'DEMO_DECK',
        })
        .expect(409);
      await fixture
        .send(fixture.path(second), {
          ...input,
          startsOn: '2040-03-16',
          endsOn: '2040-03-16',
        })
        .expect(201);
      const other = await fixture.member();
      await fixture
        .send(fixture.path(first), { ...input, crewNumber: other.crewNumber })
        .expect(201);
      expect(
        await fixture.database.crewAssignment.count({
          where: { crewMemberId: member.id },
        }),
      ).toBe(2);
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: { in: [first, second] }, action: 'CREW_ASSIGNMENT_CREATED' },
        }),
      ).toBe(3);
    });

    it.each([undefined, 'local.inactive', 'local.auditor'])(
      'denies creation for %s without data or events',
      async (token) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        const action = request(fixture.server).post(fixture.path(vessel));
        if (token) action.set('Authorization', `Bearer ${token}`);
        await action
          .send({
            crewNumber: member.crewNumber,
            role: 'DEMO_DECK',
            startsOn: '2040-04-01',
            endsOn: '2040-04-02',
          })
          .expect(token ? 403 : 401);
        expect(
          await fixture.database.crewAssignment.count({ where: { vesselId: vessel } }),
        ).toBe(0);
        expect(
          await fixture.database.auditEvent.count({
            where: { entityId: vessel, action: 'CREW_ASSIGNMENT_CREATED' },
          }),
        ).toBe(0);
      },
    );

    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'denies unrelated/narrow %s access without assignment or audit mutation',
      async (role) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        const created = await fixture
          .send(fixture.path(vessel), {
            crewNumber: member.crewNumber,
            role: 'DEMO_DECK',
            startsOn: '2040-08-01',
            endsOn: '2040-08-02',
          })
          .expect(201);
        fixture.restrictReader([role]);
        const before = await fixture.database.crewAssignment.findMany({
          where: { vesselId: vessel },
        });
        const events = await fixture.database.auditEvent.count({
          where: { entityId: vessel },
        });
        await request(fixture.server)
          .get(fixture.path(vessel))
          .set('Authorization', 'Bearer local.auditor')
          .expect(403);
        await fixture
          .send(
            fixture.path(vessel),
            {
              crewNumber: member.crewNumber,
              role: 'DEMO_DECK',
              startsOn: '2040-09-01',
              endsOn: '2040-09-02',
            },
            'local.auditor',
          )
          .expect(403);
        await fixture
          .send(
            `${fixture.path(vessel)}/${(created.body as { id: string }).id}/cancellation`,
            { reason: 'PLAN_CHANGED' },
            'local.auditor',
          )
          .expect(403);
        expect(
          await fixture.database.crewAssignment.findMany({ where: { vesselId: vessel } }),
        ).toEqual(before);
        expect(
          await fixture.database.auditEvent.count({ where: { entityId: vessel } }),
        ).toBe(events);
      },
    );

    it.each([
      { startsOn: '0000-01-01' },
      { startsOn: '2026-02-29' },
      { startsOn: '2040-05-03' },
      { startsOn: '10000-01-01' },
      { endsOn: '2040-05-01T12:00:00Z' },
      { role: 'OPERATIONS_MANAGER' },
      { createdById: randomUUID() },
      { startsOn: null },
    ])('rejects invalid dates, functions and extra fields: %j', async (invalid) => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber,
          role: 'DEMO_DECK',
          startsOn: '2040-05-01',
          endsOn: '2040-05-02',
          ...invalid,
        })
        .expect(400);
      expect(
        await fixture.database.crewAssignment.count({ where: { vesselId: vessel } }),
      ).toBe(0);
    });

    it('rejects missing profiles/vessels and archived creation; protects reads and bounds pagination', async () => {
      const vessel = await fixture.vessel('ARCHIVED');
      const member = await fixture.member();
      const input = {
        crewNumber: member.crewNumber,
        role: 'DEMO_DECK',
        startsOn: '2040-06-01',
        endsOn: '2040-06-02',
      };
      await fixture.send(fixture.path(vessel), input).expect(409);
      await fixture.send(fixture.path(randomUUID()), input).expect(404);
      const active = await fixture.vessel();
      await fixture
        .send(fixture.path(active), { ...input, crewNumber: 'KW-C-000000' })
        .expect(404);
      await request(fixture.server).get(fixture.path(active)).expect(401);
      await request(fixture.server)
        .get(fixture.path(active))
        .set('Authorization', 'Bearer local.inactive')
        .expect(403);
      for (const page of ['0', '-1', '1.5', '10001', 'bad']) {
        await request(fixture.server)
          .get(`${fixture.path(active)}?page=${page}`)
          .set('Authorization', 'Bearer local.auditor')
          .expect(400);
      }
      const response = await request(fixture.server)
        .get(`${fixture.path(vessel)}?page=2`)
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(response.body).toMatchObject({
        page: 2,
        pageSize: 20,
        items: [],
        vessel: { status: 'ARCHIVED' },
      });
    });

    it('paginates stable newest-first history at 20 plans without losing or duplicating ties', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      for (let day = 1; day <= 21; day += 1) {
        const date = `2040-07-${String(day).padStart(2, '0')}`;
        await fixture
          .send(fixture.path(vessel), {
            crewNumber: member.crewNumber,
            role: 'DEMO_DECK',
            startsOn: date,
            endsOn: date,
          })
          .expect(201);
      }
      await fixture.database.crewAssignment.updateMany({
        where: { vesselId: vessel },
        data: { createdAt: new Date('2040-01-01T00:00:00Z') },
      });
      const expected = await fixture.database.crewAssignment.findMany({
        where: { vesselId: vessel },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      });
      const pages: string[] = [];
      for (const page of [1, 2]) {
        const response = await request(fixture.server)
          .get(`${fixture.path(vessel)}?page=${page}`)
          .set('Authorization', 'Bearer local.auditor')
          .expect(200);
        const body = response.body as { items: { id: string }[] };
        expect(response.body).toMatchObject({
          total: 21,
          totalPages: 2,
          pageSize: 20,
          page,
        });
        expect(body.items).toHaveLength(page === 1 ? 20 : 1);
        pages.push(...body.items.map((item) => item.id));
      }
      expect(pages).toEqual(expected.map((item) => item.id));
    });

    it('round-trips calendar extremes, leap days and UTC-derived current/ended states', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const today = new Date().toISOString().slice(0, 10);
      for (const [date, status] of [
        ['0001-01-01', 'ENDED'],
        ['2000-02-29', 'ENDED'],
        [today, 'CURRENT'],
        ['9999-12-31', 'SCHEDULED'],
      ]) {
        const result = await fixture
          .send(fixture.path(vessel), {
            crewNumber: member.crewNumber,
            role: 'DEMO_DECK',
            startsOn: date,
            endsOn: date,
          })
          .expect(201);
        expect(result.body).toMatchObject({
          startsOn: date,
          endsOn: date,
          status,
          asOf: today,
        });
      }
    });
  },
);
