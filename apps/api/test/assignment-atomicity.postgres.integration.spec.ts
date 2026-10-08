import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assignmentFixture } from './assignment-postgres.fixture';

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Assignment transactional integrity',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    let failingAction: string | undefined;
    beforeAll(async () => {
      fixture = await assignmentFixture((action) => action === failingAction);
    });
    afterEach(async () => {
      failingAction = undefined;
      await fixture.clean();
    });
    afterAll(async () => fixture.app.close());
    it('rolls back creation and cancellation through HTTP when the audit boundary fails', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const input = {
        crewNumber: member.crewNumber,
        role: 'DEMO_DECK',
        startsOn: '2040-01-01',
        endsOn: '2040-01-02',
      };
      failingAction = 'CREW_ASSIGNMENT_CREATED';
      const failed = await fixture.send(fixture.path(vessel), input).expect(500);
      expect(failed.body).not.toHaveProperty('stack');
      expect(
        await fixture.database.crewAssignment.count({ where: { vesselId: vessel } }),
      ).toBe(0);
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: vessel, action: failingAction },
        }),
      ).toBe(0);
      failingAction = undefined;
      const created = await fixture.send(fixture.path(vessel), input).expect(201);
      const id = (created.body as { id: string }).id;
      failingAction = 'CREW_ASSIGNMENT_CANCELLED';
      await fixture
        .send(`${fixture.path(vessel)}/${id}/cancellation`, { reason: 'PLAN_CHANGED' })
        .expect(500);
      const record = await fixture.database.crewAssignment.findUniqueOrThrow({
        where: { id },
      });
      expect(record).toMatchObject({
        cancelledAt: null,
        cancelledById: null,
        cancellationReason: null,
      });
      expect(
        await fixture.database.auditEvent.count({
          where: { entityId: vessel, action: failingAction },
        }),
      ).toBe(0);
      await fixture.send(fixture.path(vessel), input).expect(409);
    });
    it('rejects inconsistent cancellation metadata and invalid calendar periods in the database', async () => {
      const vessel = await fixture.vessel();
      const member = await fixture.member();
      const created = await fixture
        .send(fixture.path(vessel), {
          crewNumber: member.crewNumber,
          role: 'DEMO_SUPPORT',
          startsOn: '2040-01-01',
          endsOn: '2040-01-02',
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      await expect(
        fixture.database.$executeRaw(
          Prisma.sql`UPDATE crew_assignments SET cancelled_at = NOW() WHERE id = ${id}::uuid`,
        ),
      ).rejects.toThrow();
      await expect(
        fixture.database.$executeRaw(
          Prisma.sql`UPDATE crew_assignments SET starts_on = DATE '2040-01-03' WHERE id = ${id}::uuid`,
        ),
      ).rejects.toThrow();
      await expect(
        fixture.database.$executeRaw(
          Prisma.sql`UPDATE crew_assignments SET ends_on = DATE '10000-01-01' WHERE id = ${id}::uuid`,
        ),
      ).rejects.toThrow();
      await expect(
        fixture.database.$executeRaw(
          Prisma.sql`UPDATE crew_assignments SET starts_on = DATE '0001-01-01 BC' WHERE id = ${id}::uuid`,
        ),
      ).rejects.toThrow();
    });
  },
);
