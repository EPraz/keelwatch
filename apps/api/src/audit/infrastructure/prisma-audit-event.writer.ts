import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AuditEventInput,
  AuditEventWriter,
} from '../application/audit-event.writer';

@Injectable()
export class PrismaAuditEventWriter implements AuditEventWriter {
  async append(
    transaction: Prisma.TransactionClient,
    event: AuditEventInput,
  ): Promise<void> {
    await transaction.auditEvent.create({
      data: {
        actorUserId: event.actorUserId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: { ...event.metadata },
        correlationId: event.correlationId,
      },
    });
  }
}
