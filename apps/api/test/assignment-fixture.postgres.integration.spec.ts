import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type * as Crypto from 'node:crypto';
import { assignmentFixture } from './assignment-postgres.fixture';

const candidates = vi.hoisted(() => ({ values: [] as number[] }));
vi.mock('node:crypto', async (original) => {
  const actual = await original<typeof Crypto>();
  return {
    ...actual,
    randomInt: (min: number, max: number) =>
      candidates.values.shift() ?? actual.randomInt(min, max),
  };
});

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Assignment fixture isolation',
  () => {
    let fixture: Awaited<ReturnType<typeof assignmentFixture>>;
    beforeAll(async () => {
      fixture = await assignmentFixture();
    });
    afterEach(async () => {
      candidates.values = [];
      await fixture.clean();
    });
    afterAll(async () => fixture.app.close());

    it('skips occupied references without replacing existing vessel or profile records', async () => {
      const firstVessel = await fixture.vessel();
      const vesselBefore = await fixture.database.vessel.findUniqueOrThrow({
        where: { id: firstVessel },
      });
      candidates.values.push(Number(vesselBefore.registryNumber.slice(3)));
      const secondVessel = await fixture.vessel();
      expect(secondVessel).not.toBe(firstVessel);
      expect(
        await fixture.database.vessel.findUniqueOrThrow({ where: { id: firstVessel } }),
      ).toEqual(vesselBefore);
      const firstMember = await fixture.member();
      const memberBefore = await fixture.database.crewMember.findUniqueOrThrow({
        where: { id: firstMember.id },
      });
      candidates.values.push(Number(firstMember.crewNumber.slice(5)));
      const secondMember = await fixture.member();
      expect(secondMember.crewNumber).not.toBe(firstMember.crewNumber);
      expect(
        await fixture.database.crewMember.findUniqueOrThrow({
          where: { id: firstMember.id },
        }),
      ).toEqual(memberBefore);
    });
  },
);
