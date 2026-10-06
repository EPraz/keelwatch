import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaAuditEventWriter } from '../src/audit/infrastructure/prisma-audit-event.writer';
import { PrismaCrewRepository } from '../src/crew/infrastructure/prisma-crew.repository';
import { CrewNumberConflictError } from '../src/crew/domain/crew-member';

const envFile = resolve(__dirname, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Crew PostgreSQL integrity',
  () => {
    const database = new PrismaService();
    const repository = new PrismaCrewRepository(database, new PrismaAuditEventWriter());
    const numbers = new Set<string>();
    const correlations = new Set<string>();
    let actorUserId: string;
    beforeAll(async () => {
      actorUserId = (
        await database.user.findUniqueOrThrow({
          where: { externalSubject: 'local:operations-manager' },
        })
      ).id;
    });
    afterEach(async () => {
      await database.auditEvent.deleteMany({
        where: { correlationId: { in: [...correlations] } },
      });
      await database.crewMember.deleteMany({
        where: { crewNumber: { in: [...numbers] } },
      });
      numbers.clear();
      correlations.clear();
    });
    afterAll(async () => database.$disconnect());

    async function fixture() {
      let crewNumber: string;
      do {
        crewNumber = `KW-C-${randomInt(800000, 900000)}`;
      } while (
        numbers.has(crewNumber) ||
        (await database.crewMember.count({ where: { crewNumber } }))
      );
      numbers.add(crewNumber);
      const correlationId = `crew-pg-${randomUUID()}`;
      correlations.add(correlationId);
      return {
        displayName: 'Synthetic Crew Fixture',
        crewNumber,
        actorUserId,
        correlationId,
      };
    }

    it('commits one profile and sanitized audit event atomically', async () => {
      const input = await fixture();
      const member = await repository.createWithAudit(input);
      const events = await database.auditEvent.findMany({
        where: { correlationId: input.correlationId },
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        entityId: member.id,
        actorUserId,
        action: 'CREW_MEMBER_CREATED',
        metadata: { crewNumber: input.crewNumber },
      });
      expect((await repository.list({ skip: 0, take: 20 })).items).toContainEqual(member);
    });

    it('enforces uniqueness under concurrent creation without duplicate audit', async () => {
      const input = await fixture();
      const attempts = await Promise.allSettled([
        repository.createWithAudit(input),
        repository.createWithAudit(input),
      ]);
      expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(
        1,
      );
      const failure = attempts.find((attempt) => attempt.status === 'rejected');
      expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(
        CrewNumberConflictError,
      );
      expect(
        await database.auditEvent.count({
          where: { correlationId: input.correlationId },
        }),
      ).toBe(1);
    });

    it('rolls the profile back if audit append fails', async () => {
      const input = await fixture();
      const failing = new PrismaCrewRepository(database, {
        append: () => Promise.reject(new Error('Synthetic audit failure.')),
      });
      await expect(failing.createWithAudit(input)).rejects.toThrow(
        'Synthetic audit failure.',
      );
      expect(
        await database.crewMember.count({ where: { crewNumber: input.crewNumber } }),
      ).toBe(0);
      expect(
        await database.auditEvent.count({
          where: { correlationId: input.correlationId },
        }),
      ).toBe(0);
    });

    it('enforces normalization and length constraints below the HTTP boundary', async () => {
      const input = await fixture();
      await expect(
        database.crewMember.create({
          data: {
            displayName: ' ',
            crewNumber: input.crewNumber,
            createdById: actorUserId,
          },
        }),
      ).rejects.toThrow();
      await expect(
        database.crewMember.create({
          data: {
            displayName: input.displayName,
            crewNumber: 'invalid',
            createdById: actorUserId,
          },
        }),
      ).rejects.toThrow();
    });
  },
);
