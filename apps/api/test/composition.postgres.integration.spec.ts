import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';
import { randomUUID } from 'node:crypto';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { openApiResponseType } from './requirement-evaluation-contract';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Crew composition over HTTP/PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    beforeAll(async () => {
      fixture = await assignmentFixture();
    });
    afterEach(async () => fixture.clean());
    afterAll(async () => fixture.app.close());
    const path = (vesselId: string) => `/api/v1/vessels/${vesselId}/crew-composition`;
    function read(
      vesselId: string,
      query: object = {},
      token: string | null = 'local.auditor',
    ) {
      const action = request(fixture.server).get(path(vesselId)).query(query);
      return token ? action.set('Authorization', `Bearer ${token}`) : action;
    }
    async function plan(
      vesselId: string,
      crewNumber: string,
      role = 'DEMO_SUPPORT',
      startsOn = '2040-01-01',
      endsOn = '2040-01-31',
    ) {
      return fixture
        .send(fixture.path(vesselId), { crewNumber, role, startsOn, endsOn })
        .expect(201);
    }
    async function qualification(
      memberId: string,
      referenceNumber: string,
      validFrom: string,
      expiresOn: string,
    ) {
      return fixture
        .send(`/api/v1/crew-members/${memberId}/qualifications`, {
          kind: 'DEMO_SAFETY',
          referenceNumber,
          validFrom,
          expiresOn,
        })
        .expect(201);
    }
    it.each([null, 'local.inactive'])(
      'denies unauthenticated/inactive consultation for %s',
      async (token) => {
        const vessel = await fixture.vessel();
        await read(vessel, {}, token).expect(token ? 403 : 401);
      },
    );
    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'denies unrelated %s identities',
      async (role) => {
        const vessel = await fixture.vessel();
        fixture.restrictReader([role]);
        await read(vessel).expect(403);
      },
    );
    it.each(['crew:read', 'fleet:read'] as const)(
      'requires the independent %s permission',
      async (permission) => {
        const narrow = await assignmentFixture(undefined, [permission]);
        try {
          const vessel = await narrow.vessel();
          await request(narrow.server)
            .get(path(vessel))
            .set('Authorization', 'Bearer local.auditor')
            .expect(403);
        } finally {
          await narrow.clean();
          await narrow.app.close();
        }
      },
    );
    it.each([
      { date: '0000-01-01' },
      { date: '10000-01-01' },
      { date: '2026-02-29' },
      { date: '' },
      { date: '2040-01-01T00:00:00Z' },
      { role: 'OPERATIONS_MANAGER' },
      { role: '' },
      { page: 0 },
      { page: 1.5 },
      { page: 10001 },
      { status: 'COVERED' },
    ])('returns safe validation for %j', async (query) => {
      const vessel = await fixture.vessel();
      const response = await read(vessel, query).expect(400);
      expect(response.body).toMatchObject({
        fieldErrors: expect.any(Object) as unknown,
        correlationId: expect.any(String) as unknown,
      });
      expect(response.body).not.toHaveProperty('stack');
    });
    it('defaults to server UTC today and permits both operational readers and archived-vessel reads', async () => {
      const vessel = await fixture.vessel('ARCHIVED');
      const before = new Date().toISOString().slice(0, 10);
      for (const token of ['local.auditor', 'local.operations-manager']) {
        const response = await read(vessel, {}, token).expect(200);
        expect([before, new Date().toISOString().slice(0, 10)]).toContain(
          (response.body as { date: string }).date,
        );
        expect(response.body).toMatchObject({
          vessel: { id: vessel, status: 'ARCHIVED' },
          items: [],
          total: 0,
          role: null,
        });
      }
      await read(randomUUID()).expect(404);
    });
    it('scopes by vessel and function, removes cancelled plans and retains original history', async () => {
      const vessel = await fixture.vessel();
      const otherVessel = await fixture.vessel();
      const deck = await fixture.member();
      const support = await fixture.member();
      const other = await fixture.member();
      const deckPlan = await plan(vessel, deck.crewNumber, 'DEMO_DECK');
      await plan(vessel, support.crewNumber);
      await plan(otherVessel, other.crewNumber);
      expect((await read(vessel, { date: '2040-01-15' }).expect(200)).body).toMatchObject(
        { total: 2 },
      );
      expect(
        (await read(vessel, { date: '2040-01-15', role: 'DEMO_DECK' }).expect(200)).body,
      ).toMatchObject({
        total: 1,
        items: [
          {
            crewMemberId: deck.id,
            role: 'DEMO_DECK',
            requirements: [{ kind: 'DEMO_SAFETY' }, { kind: 'DEMO_DECK' }],
          },
        ],
      });
      expect(
        (await read(vessel, { date: '2040-01-15', role: 'DEMO_SUPPORT' }).expect(200))
          .body,
      ).toMatchObject({ total: 1, items: [{ crewMemberId: support.id }] });
      const id = (deckPlan.body as { id: string }).id;
      await fixture
        .send(`${fixture.path(vessel)}/${id}/cancellation`, { reason: 'PLAN_CHANGED' })
        .expect(201);
      expect(
        (await read(vessel, { date: '2040-01-15', role: 'DEMO_DECK' }).expect(200)).body,
      ).toMatchObject({ items: [], total: 0 });
      const history = await request(fixture.server)
        .get(fixture.path(vessel))
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(history.body).toMatchObject({
        total: 2,
        items: expect.arrayContaining([
          expect.objectContaining({ id, status: 'CANCELLED' }),
        ]) as unknown,
      });
      await fixture.database.vessel.update({
        where: { id: vessel },
        data: { status: 'ARCHIVED' },
      });
      expect((await read(vessel, { date: '2040-01-15' }).expect(200)).body).toMatchObject(
        { vessel: { status: 'ARCHIVED' }, total: 1 },
      );
    });
    it.each(['0001-01-01', '2000-02-29', '9999-12-31'])(
      'includes a one-day plan only on %s',
      async (date) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        await plan(vessel, member.crewNumber, 'DEMO_SUPPORT', date, date);
        expect((await read(vessel, { date }).expect(200)).body).toMatchObject({
          total: 1,
          items: [{ startsOn: date, endsOn: date }],
        });
        expect(
          (
            await read(vessel, {
              date:
                date === '0001-01-01'
                  ? '0001-01-02'
                  : date === '9999-12-31'
                    ? '9999-12-30'
                    : '2000-03-01',
            }).expect(200)
          ).body,
        ).toMatchObject({ total: 0 });
      },
    );
    it('filters before deterministic pagination and reports empty out-of-range pages honestly', async () => {
      const vessel = await fixture.vessel();
      const ids: string[] = [];
      for (let index = 0; index < 22; index += 1) {
        const member = await fixture.member();
        const response = await plan(
          vessel,
          member.crewNumber,
          index < 21 ? 'DEMO_DECK' : 'DEMO_SUPPORT',
        );
        const id = (response.body as { id: string }).id;
        ids.push(id);
        await fixture.database.crewAssignment.update({
          where: { id },
          data: {
            createdAt: new Date(
              `2040-02-01T00:00:${String(index).padStart(2, '0')}.000Z`,
            ),
          },
        });
      }
      const first = await read(vessel, { date: '2040-01-01', role: 'DEMO_DECK' }).expect(
        200,
      );
      expect(first.body).toMatchObject({ total: 21, totalPages: 2, pageSize: 20 });
      expect(
        (first.body as { items: { assignmentId: string }[] }).items.map(
          (item) => item.assignmentId,
        ),
      ).toEqual(ids.slice(1, 21).reverse());
      expect(
        (
          await read(vessel, { date: '2040-01-01', role: 'DEMO_DECK', page: 2 }).expect(
            200,
          )
        ).body,
      ).toMatchObject({ total: 21, page: 2, items: [{ assignmentId: ids[0] }] });
      expect(
        (await read(vessel, { date: '2040-01-01', role: 'DEMO_SUPPORT' }).expect(200))
          .body,
      ).toMatchObject({ total: 1, totalPages: 1, items: [{ assignmentId: ids[21] }] });
      expect(
        (await read(vessel, { date: '2040-01-01', page: 3 }).expect(200)).body,
      ).toMatchObject({ total: 22, totalPages: 2, page: 3, items: [] });
      // Equal creation instants still have a stable identity tie-breaker.
      await fixture.database.crewAssignment.updateMany({
        where: { vesselId: vessel },
        data: { createdAt: new Date('2040-02-01T00:00:00Z') },
      });
      const tied = await read(vessel, { date: '2040-01-01' }).expect(200);
      expect(
        (tied.body as { items: { assignmentId: string }[] }).items.map(
          (item) => item.assignmentId,
        ),
      ).toEqual([...ids].sort().reverse().slice(0, 20));
    });
    it('uses renewals beyond history page one and newly registered evidence without read-side mutations', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      await plan(vessel, member.crewNumber);
      await qualification(member.id, 'KW-Q-000001', '2040-01-01', '2040-01-15');
      expect((await read(vessel, { date: '2040-01-05' }).expect(200)).body).toMatchObject(
        { items: [{ status: 'INCOMPLETE' }] },
      );
      for (let index = 2; index <= 22; index += 1)
        await qualification(
          member.id,
          `KW-Q-${String(index).padStart(6, '0')}`,
          '2040-01-16',
          '2040-03-02',
        );
      const before = await Promise.all([
        fixture.database.crewAssignment.findMany({ where: { vesselId: vessel } }),
        fixture.database.crewQualification.findMany({
          where: { crewMemberId: member.id },
          orderBy: { id: 'asc' },
        }),
        fixture.database.auditEvent.findMany({
          where: { correlationId: { in: fixture.correlations } },
          orderBy: { id: 'asc' },
        }),
      ]);
      expect((await read(vessel, { date: '2040-01-05' }).expect(200)).body).toMatchObject(
        {
          items: [
            {
              status: 'COVERED',
              requirements: [{ coverageEndsOn: '2040-03-02', firstGap: null }],
            },
          ],
        },
      );
      expect(
        await Promise.all([
          fixture.database.crewAssignment.findMany({ where: { vesselId: vessel } }),
          fixture.database.crewQualification.findMany({
            where: { crewMemberId: member.id },
            orderBy: { id: 'asc' },
          }),
          fixture.database.auditEvent.findMany({
            where: { correlationId: { in: fixture.correlations } },
            orderBy: { id: 'asc' },
          }),
        ]),
      ).toEqual(before);
    });
    it('keeps the generated composition response synchronized with its protected OpenAPI contract', async () => {
      const document = SwaggerModule.createDocument(
        fixture.app,
        new DocumentBuilder().build(),
      );
      const type = openApiResponseType(
        document,
        '/api/v1/vessels/{vesselId}/crew-composition',
      );
      const expected = await format(
        `// Generated from composition OpenAPI; do not edit manually.\n// Checked by composition.postgres.integration.spec.ts.\nexport type CrewComposition = ${type};\n`,
        { parser: 'typescript', singleQuote: true, printWidth: 88 },
      );
      const file = resolve(__dirname, '../../web/src/features/crew/composition.types.ts');
      if (process.env.UPDATE_COMPOSITION_CONTRACT === 'true')
        writeFileSync(file, expected);
      expect(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).toBe(expected);
      expect(
        document.paths['/api/v1/vessels/{vesselId}/crew-composition']?.get?.security,
      ).toEqual([{ bearer: [] }]);
    });
    it('includes both plan boundaries and evaluates the whole plan rather than the selected day', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const plan = await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber,
          role: 'DEMO_SUPPORT',
          startsOn: '2040-01-01',
          endsOn: '2040-01-31',
        })
        .expect(201);
      await fixture
        .send(`/api/v1/crew-members/${member.id}/qualifications`, {
          kind: 'DEMO_SAFETY',
          referenceNumber: 'KW-Q-000001',
          validFrom: '2040-01-01',
          expiresOn: '2040-01-15',
        })
        .expect(201);
      for (const date of ['2040-01-01', '2040-01-31']) {
        const response = await read(vessel, { date }).expect(200);
        expect(response.body).toMatchObject({
          date,
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          items: [
            {
              assignmentId: (plan.body as { id: string }).id,
              crewMemberId: member.id,
              status: 'INCOMPLETE',
              startsOn: '2040-01-01',
              endsOn: '2040-01-31',
              requirements: [
                { firstGap: { startsOn: '2040-01-16', endsOn: '2040-01-31' } },
              ],
            },
          ],
        });
      }
      for (const date of ['2039-12-31', '2040-02-01'])
        expect((await read(vessel, { date }).expect(200)).body).toMatchObject({
          items: [],
          total: 0,
        });
    });
  },
);
