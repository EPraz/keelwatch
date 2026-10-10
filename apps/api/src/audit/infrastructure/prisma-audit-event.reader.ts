import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuditHistoryReader } from '../application/audit-history.reader';
import type {
  AuditActivityRecord,
  AuditEventReader,
} from '../application/audit-event.reader';

function readChangedFields(metadata: unknown): readonly string[] {
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    Array.isArray(metadata) ||
    !('changedFields' in metadata) ||
    typeof metadata.changedFields !== 'string'
  ) {
    return [];
  }

  return metadata.changedFields.split(',').filter(Boolean);
}

@Injectable()
export class PrismaAuditEventReader implements AuditEventReader, AuditHistoryReader {
  constructor(private readonly prisma: PrismaService) {}

  async pageForEntity(input: Parameters<AuditHistoryReader['pageForEntity']>[0]) {
    const scope = {
      entityType: input.entityType,
      entityId: input.entityId,
      action: { in: [...input.actions] },
      metadata: { path: ['vesselId'], equals: input.vesselId },
    };
    const anchor = input.cursor
      ? await this.prisma.auditEvent.findFirst({
          where: { ...scope, id: input.cursor },
          select: { id: true, occurredAt: true },
        })
      : null;
    if (input.cursor && !anchor) return null;
    const events = await this.prisma.auditEvent.findMany({
      where: {
        ...scope,
        ...(anchor
          ? {
              OR: [
                { occurredAt: { lt: anchor.occurredAt } },
                { occurredAt: anchor.occurredAt, id: { lt: anchor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 21,
      select: {
        id: true,
        action: true,
        occurredAt: true,
        metadata: true,
        actor: { select: { displayName: true } },
      },
    });
    return {
      items: events.slice(0, 20).map((event) => ({
        id: event.id,
        action: event.action,
        occurredAt: event.occurredAt,
        actorDisplayName: event.actor.displayName,
        metadata: event.metadata,
      })),
      nextCursor: events.length > 20 ? events[19]!.id : null,
    };
  }

  async listForEntity(input: {
    readonly entityType: string;
    readonly entityId: string;
    readonly take: number;
  }): Promise<readonly AuditActivityRecord[]> {
    const where =
      input.entityType === 'VESSEL'
        ? {
            OR: [
              { entityType: 'VESSEL', entityId: input.entityId },
              {
                entityType: { in: ['CERTIFICATE', 'CERTIFICATE_DOCUMENT'] },
                metadata: { path: ['vesselId'], equals: input.entityId },
              },
            ],
          }
        : { entityType: input.entityType, entityId: input.entityId };
    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: input.take,
      include: { actor: { select: { displayName: true } } },
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actorDisplayName: event.actor.displayName,
      occurredAt: event.occurredAt,
      changedFields: readChangedFields(event.metadata),
    }));
  }
}
