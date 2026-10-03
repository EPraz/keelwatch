import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
export class PrismaAuditEventReader implements AuditEventReader {
  constructor(private readonly prisma: PrismaService) {}

  async listForEntity(input: {
    readonly entityType: string;
    readonly entityId: string;
    readonly take: number;
  }): Promise<readonly AuditActivityRecord[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: { entityType: input.entityType, entityId: input.entityId },
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
