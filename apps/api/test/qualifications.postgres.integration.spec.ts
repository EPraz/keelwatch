import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaAuditEventWriter } from '../src/audit/infrastructure/prisma-audit-event.writer';
import { PrismaQualificationRepository } from '../src/crew/infrastructure/prisma-qualification.repository';
import { QualificationConflictError } from '../src/crew/domain/qualification';
const envFile = resolve(__dirname, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== 'true')(
  'Qualification PostgreSQL integrity',
  () => {
    const db = new PrismaService();
    const repository = new PrismaQualificationRepository(
      db,
      new PrismaAuditEventWriter(),
    );
    let actorUserId: string;
    let crewMemberId: string;
    let correlationId: string;
    beforeAll(async () => {
      actorUserId = (
        await db.user.findUniqueOrThrow({
          where: { externalSubject: 'local:operations-manager' },
        })
      ).id;
    });
    beforeEach(async () => {
      crewMemberId = '';
      correlationId = `qualification-pg-${randomUUID()}`;
      let crewNumber: string;
      do {
        crewNumber = `KW-C-${randomInt(900000, 999999)}`;
      } while (await db.crewMember.count({ where: { crewNumber } }));
      crewMemberId = (
        await db.crewMember.create({
          data: {
            displayName: 'Synthetic Qualification Fixture',
            crewNumber,
            createdById: actorUserId,
          },
        })
      ).id;
    });
    afterEach(async () => {
      if (correlationId) await db.auditEvent.deleteMany({ where: { correlationId } });
      if (crewMemberId) {
        await db.crewQualification.deleteMany({ where: { crewMemberId } });
        await db.crewMember.delete({ where: { id: crewMemberId } });
      }
    });
    afterAll(async () => db.$disconnect());
    function input() {
      return {
        crewMemberId,
        kind: 'DEMO_SAFETY' as const,
        referenceNumber: 'KW-Q-000001',
        validFrom: new Date('2026-10-01'),
        expiresOn: new Date('2027-10-01'),
        actorUserId,
        correlationId,
      };
    }

    it('commits a scoped record and sanitized audit event together', async () => {
      const row = await repository.createWithAudit(input());
      expect((await repository.list(crewMemberId, 0, 20)).items).toContainEqual(row);
      expect((await repository.list(randomUUID(), 0, 20)).items).toEqual([]);
      const events = await db.auditEvent.findMany({ where: { correlationId } });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        entityId: row.id,
        action: 'CREW_QUALIFICATION_RECORDED',
        metadata: { crewMemberId, kind: 'DEMO_SAFETY', referenceNumber: 'KW-Q-000001' },
      });
    });
    it('enforces concurrent uniqueness without duplicate audit', async () => {
      const attempts = await Promise.allSettled([
        repository.createWithAudit(input()),
        repository.createWithAudit(input()),
      ]);
      expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      const failure = attempts.find((item) => item.status === 'rejected');
      expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(
        QualificationConflictError,
      );
      expect(await db.auditEvent.count({ where: { correlationId } })).toBe(1);
    });
    it('rolls back the qualification when audit fails', async () => {
      const failing = new PrismaQualificationRepository(db, {
        append: () => Promise.reject(new Error('Synthetic audit failure')),
      });
      await expect(failing.createWithAudit(input())).rejects.toThrow(
        'Synthetic audit failure',
      );
      expect(await db.crewQualification.count({ where: { crewMemberId } })).toBe(0);
      expect(await db.auditEvent.count({ where: { correlationId } })).toBe(0);
    });
    it('enforces dates and reference normalization below HTTP', async () => {
      const data = {
        crewMemberId,
        kind: 'DEMO_SAFETY' as const,
        referenceNumber: 'KW-Q-000001',
        validFrom: new Date('2026-10-01'),
        expiresOn: new Date('2027-10-01'),
        createdById: actorUserId,
      };
      await expect(
        db.crewQualification.create({
          data: { ...data, expiresOn: new Date('2025-01-01') },
        }),
      ).rejects.toThrow();
      await expect(
        db.crewQualification.create({
          data: { ...data, referenceNumber: ' kw-q-000001 ' },
        }),
      ).rejects.toThrow();
      expect(await db.crewQualification.count({ where: { crewMemberId } })).toBe(0);
    });
  },
);
