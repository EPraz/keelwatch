import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';
import { randomUUID } from 'node:crypto';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { requirementEvaluationContract } from './requirement-evaluation-contract';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Draft requirement evaluation over HTTP/PostgreSQL',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    beforeAll(async () => {
      fixture = await assignmentFixture();
    });
    afterEach(async () => fixture.clean());
    afterAll(async () => fixture.app.close());

    it('keeps the generated web response contract synchronized with OpenAPI', async () => {
      const document = SwaggerModule.createDocument(
        fixture.app,
        new DocumentBuilder().build(),
      );
      const expected = await format(requirementEvaluationContract(document), {
        parser: 'typescript',
        singleQuote: true,
        printWidth: 88,
      });
      const file = resolve(
        __dirname,
        '../../web/src/features/crew/requirement-evaluation.types.ts',
      );
      if (process.env.UPDATE_EVALUATION_CONTRACT === 'true')
        writeFileSync(file, expected);
      expect(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).toBe(expected);
    });

    it.each(['crew:read', 'fleet:read'] as const)(
      'denies a synthetic reader missing just %s',
      async (permission) => {
        const narrow = await assignmentFixture(undefined, [permission]);
        try {
          const vessel = await narrow.vessel();
          const member = await narrow.member();
          await request(narrow.server)
            .get(`${narrow.path(vessel)}/requirement-evaluation`)
            .query({
              crewNumber: member.crewNumber,
              role: 'DEMO_SUPPORT',
              startsOn: '2040-01-01',
              endsOn: '2040-01-31',
            })
            .set('Authorization', 'Bearer local.auditor')
            .expect(403);
        } finally {
          await narrow.clean();
          await narrow.app.close();
        }
      },
    );

    function read(
      vessel: string,
      crewNumber: string,
      overrides: object = {},
      token: string | null = 'local.auditor',
    ) {
      const action = request(fixture.server)
        .get(`${fixture.path(vessel)}/requirement-evaluation`)
        .query({
          crewNumber,
          role: 'DEMO_SUPPORT',
          startsOn: '2040-01-01',
          endsOn: '2040-01-31',
          ...overrides,
        });
      return token ? action.set('Authorization', `Bearer ${token}`) : action;
    }

    it.each([null, 'local.inactive'])(
      'rejects unauthenticated/inactive reads for %s',
      async (token) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        await read(vessel, member.crewNumber, {}, token).expect(token ? 403 : 401);
      },
    );

    it.each(['COMPLIANCE_OFFICER', 'PLATFORM_ADMINISTRATOR'] as const)(
      'denies %s direct reads with no Crew visibility',
      async (role) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        fixture.restrictReader([role]);
        await read(vessel, member.crewNumber).expect(403);
      },
    );

    it.each([
      { startsOn: '0000-01-01' },
      { startsOn: '2026-02-29' },
      { startsOn: '10000-01-01' },
      { startsOn: '2040-02-01' },
      { endsOn: '2040-01-31T00:00:00Z' },
      { role: 'OPERATIONS_MANAGER' },
      { status: 'COVERED' },
      { crewNumber: 'bad' },
    ])('rejects malformed or client-supplied results: %j', async (invalid) => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const response = await read(vessel, member.crewNumber, invalid).expect(400);
      expect(response.body).toMatchObject({
        correlationId: expect.any(String) as unknown,
        fieldErrors: expect.any(Object) as unknown,
      });
    });

    it('returns safe not-found errors and permits advisory reads on archived vessels', async () => {
      const vessel = await fixture.vessel('ARCHIVED');
      const member = await fixture.member();
      await read(vessel, member.crewNumber).expect(200);
      await read(randomUUID(), member.crewNumber).expect(404);
      const missing = await read(vessel, 'KW-C-000000').expect(404);
      expect(missing.body).toMatchObject({
        code: 'CREW_MEMBER_NOT_FOUND',
        fieldErrors: { crewNumber: expect.any(Array) as unknown },
      });
    });

    it('recalculates from newly recorded qualifications, preserving retained rows and audited writes', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const other = await fixture.member();
      await fixture
        .send(`/api/v1/crew-members/${other.id}/qualifications`, {
          kind: 'DEMO_SAFETY',
          referenceNumber: 'KW-Q-000001',
          validFrom: '0001-01-01',
          expiresOn: '9999-12-31',
        })
        .expect(201);
      await fixture
        .send(`/api/v1/crew-members/${member.id}/qualifications`, {
          kind: 'DEMO_DECK',
          referenceNumber: 'KW-Q-000002',
          validFrom: '0001-01-01',
          expiresOn: '9999-12-31',
        })
        .expect(201);
      expect((await read(vessel, member.crewNumber).expect(200)).body).toMatchObject({
        status: 'INCOMPLETE',
      });
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
          referenceNumber: 'KW-Q-000003',
          validFrom: '2040-01-01',
          expiresOn: '2040-03-02',
        })
        .expect(201);
      const before = await Promise.all([
        fixture.database.crewQualification.findMany({
          where: { crewMemberId: { in: [member.id, other.id] } },
          orderBy: { id: 'asc' },
        }),
        fixture.database.crewAssignment.findMany({
          where: { vesselId: vessel },
          orderBy: { id: 'asc' },
        }),
        fixture.database.auditEvent.findMany({
          where: { correlationId: { in: fixture.correlations } },
          orderBy: { id: 'asc' },
        }),
      ]);
      const response = await read(vessel, member.crewNumber).expect(200);
      expect(response.body).toMatchObject({
        status: 'COVERED',
        consultedAt: expect.any(String) as unknown,
        requirements: [{ coverageEndsOn: '2040-03-02' }],
      });
      expect(Object.keys(response.body as object).sort()).toEqual(
        [
          'vesselId',
          'crewMemberId',
          'crewNumber',
          'displayName',
          'role',
          'startsOn',
          'endsOn',
          'consultedAt',
          'status',
          'requirements',
        ].sort(),
      );
      expect(
        await Promise.all([
          fixture.database.crewQualification.findMany({
            where: { crewMemberId: { in: [member.id, other.id] } },
            orderBy: { id: 'asc' },
          }),
          fixture.database.crewAssignment.findMany({
            where: { vesselId: vessel },
            orderBy: { id: 'asc' },
          }),
          fixture.database.auditEvent.findMany({
            where: { correlationId: { in: fixture.correlations } },
            orderBy: { id: 'asc' },
          }),
        ]),
      ).toEqual(before);
      const history = await request(fixture.server)
        .get(fixture.path(vessel))
        .set('Authorization', 'Bearer local.auditor')
        .expect(200);
      expect(history.body).toMatchObject({
        items: [{ id: (plan.body as { id: string }).id }],
      });
    });

    it.each([
      ['0001-01-01', '9999-12-31'],
      ['2000-02-29', '2000-02-29'],
      ['9999-12-31', '9999-12-31'],
    ])(
      'evaluates valid extreme dates %s through %s over HTTP',
      async (startsOn, endsOn) => {
        const vessel = await fixture.vessel();
        const member = await fixture.member();
        expect(
          (await read(vessel, member.crewNumber, { startsOn, endsOn }).expect(200)).body,
        ).toMatchObject({
          startsOn,
          endsOn,
          requirements: [{ firstGap: { startsOn, endsOn } }],
        });
      },
    );

    it('publishes a structured evaluation response and closed input contract in OpenAPI', () => {
      const document = SwaggerModule.createDocument(
        fixture.app,
        new DocumentBuilder().build(),
      );
      const operation =
        document.paths[
          '/api/v1/vessels/{vesselId}/crew-assignments/requirement-evaluation'
        ]?.get;
      expect(operation?.responses['200']).toMatchObject({
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RequirementEvaluationDto' },
          },
        },
      });
      expect(document.components?.schemas?.RequirementEvaluationDto).toMatchObject({
        properties: {
          requirements: { type: 'array' },
          status: { enum: ['INCOMPLETE', 'WARNING', 'COVERED'] },
        },
      });
    });

    it('combines consecutive renewals beyond page one and reports the effective warning margin', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      for (let index = 0; index < 21; index += 1) {
        await fixture
          .send(`/api/v1/crew-members/${member.id}/qualifications`, {
            kind: 'DEMO_SAFETY',
            referenceNumber: `KW-Q-${String(index).padStart(6, '0')}`,
            validFrom: index === 0 ? '2040-01-01' : '2040-01-16',
            expiresOn: index === 0 ? '2040-01-15' : '2040-03-02',
          })
          .expect(201);
      }
      const read = await request(fixture.server)
        .get(`${fixture.path(vessel)}/requirement-evaluation`)
        .query({
          crewNumber: member.crewNumber,
          role: 'DEMO_SUPPORT',
          startsOn: '2040-01-01',
          endsOn: '2040-01-31',
        })
        .set('Authorization', 'Bearer local.operations-manager')
        .expect(200);
      expect(read.body).toMatchObject({
        status: 'COVERED',
        requirements: [
          {
            kind: 'DEMO_SAFETY',
            status: 'COVERED',
            firstGap: null,
            coverageEndsOn: '2040-03-02',
          },
        ],
      });
    });

    it('explains missing demo requirements without creating a plan or audit event', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const read = await request(fixture.server)
        .get(`${fixture.path(vessel)}/requirement-evaluation`)
        .query({
          crewNumber: member.crewNumber,
          role: 'DEMO_DECK',
          startsOn: '2040-01-01',
          endsOn: '2040-01-31',
        })
        .set('Authorization', 'Bearer local.auditor')
        .set('X-Correlation-Id', 'evaluation-read-test')
        .expect(200);
      expect(read.body).toMatchObject({
        vesselId: vessel,
        crewMemberId: member.id,
        crewNumber: member.crewNumber,
        status: 'INCOMPLETE',
        startsOn: '2040-01-01',
        endsOn: '2040-01-31',
        requirements: ['DEMO_SAFETY', 'DEMO_DECK'].map((kind) => ({
          kind,
          status: 'INCOMPLETE',
          reasonCode: 'NO_RECORDS',
          firstGap: { startsOn: '2040-01-01', endsOn: '2040-01-31' },
        })),
      });
      expect(
        await fixture.database.crewAssignment.count({ where: { vesselId: vessel } }),
      ).toBe(0);
      expect(
        await fixture.database.auditEvent.count({
          where: { correlationId: 'evaluation-read-test' },
        }),
      ).toBe(0);
    });
  },
);
