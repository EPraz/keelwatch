import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { NotificationCondition } from '../domain/notification';
import type {
  EnqueueNotificationRunResult,
  NotificationRepository,
} from '../ports/notification.repository';
import {
  toComplianceNotification,
  toNotificationJobRun,
} from './notification.persistence-mapper';

const ACTIVE_RUN_STATUSES = ['QUEUED', 'RUNNING'] as const;

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(triggeredById: string): Promise<EnqueueNotificationRunResult> {
    try {
      const run = await this.prisma.complianceNotificationRun.create({
        data: { triggeredById },
      });
      return { run: toNotificationJobRun(run), created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const active = await this.prisma.complianceNotificationRun.findFirst({
          where: { status: { in: [...ACTIVE_RUN_STATUSES] } },
          orderBy: { queuedAt: 'desc' },
        });
        if (active) return { run: toNotificationJobRun(active), created: false };
      }
      throw error;
    }
  }

  async markRunning(id: string): Promise<boolean> {
    const result = await this.prisma.complianceNotificationRun.updateMany({
      where: { id, status: { in: [...ACTIVE_RUN_STATUSES] } },
      data: { status: 'RUNNING', startedAt: new Date(), failureCode: null },
    });
    return result.count === 1;
  }

  async complete(id: string, conditions: readonly NotificationCondition[]) {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const keys = conditions.map((condition) => condition.conditionKey);
      const resolved = await transaction.complianceNotification.updateMany({
        where: {
          resolvedAt: null,
          ...(keys.length > 0 ? { conditionKey: { notIn: keys } } : {}),
        },
        data: { resolvedAt: now },
      });
      const active = await transaction.complianceNotification.findMany({
        where: { resolvedAt: null, conditionKey: { in: keys } },
        select: { conditionKey: true },
      });
      const activeKeys = new Set(active.map((item) => item.conditionKey));
      for (const condition of conditions.filter((item) =>
        activeKeys.has(item.conditionKey),
      )) {
        await transaction.complianceNotification.updateMany({
          where: { conditionKey: condition.conditionKey, resolvedAt: null },
          data: { reason: condition.reason, asOf: condition.asOf },
        });
      }
      const created = await transaction.complianceNotification.createMany({
        data: conditions
          .filter((condition) => !activeKeys.has(condition.conditionKey))
          .map((condition) => ({ ...condition, sourceRunId: id })),
        skipDuplicates: true,
      });
      const run = await transaction.complianceNotificationRun.update({
        where: { id },
        data: {
          status: 'SUCCEEDED',
          completedAt: now,
          createdCount: created.count,
          skippedCount: conditions.length - created.count,
          resolvedCount: resolved.count,
          failureCode: null,
        },
      });
      return toNotificationJobRun(run);
    });
  }

  async fail(id: string, failureCode: string) {
    const run = await this.prisma.complianceNotificationRun.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), failureCode },
    });
    return toNotificationJobRun(run);
  }

  async findRun(id: string) {
    const run = await this.prisma.complianceNotificationRun.findUnique({ where: { id } });
    return run ? toNotificationJobRun(run) : null;
  }

  async watch() {
    const [items, total, latestRun] = await this.prisma.$transaction([
      this.prisma.complianceNotification.findMany({
        where: { resolvedAt: null },
        include: { vessel: true, certificateType: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
      }),
      this.prisma.complianceNotification.count({ where: { resolvedAt: null } }),
      this.prisma.complianceNotificationRun.findFirst({
        orderBy: [{ queuedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    return {
      items: items.map(toComplianceNotification),
      total,
      latestRun: latestRun ? toNotificationJobRun(latestRun) : null,
    };
  }
}
