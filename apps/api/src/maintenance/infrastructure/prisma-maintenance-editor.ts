import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MaintenanceAssigneeDirectory } from '../../access/application/maintenance-assignee.directory';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { ApiException } from '../../common/http/api-exception';
import type { UpdateMaintenanceDto } from '../http/maintenance.dto';

const editableFields = [
  'title',
  'category',
  'priority',
  'assigneeId',
  'targetDate',
] as const;

@Injectable()
export class PrismaMaintenanceEditor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignees: MaintenanceAssigneeDirectory,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}

  update(
    vesselId: string,
    orderId: string,
    body: UpdateMaintenanceDto,
    targetDate: Date | null | undefined,
    actorUserId: string,
    correlationId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      // Lock the scoped order before reading its revision, including no-op requests.
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM maintenance_orders WHERE id = ${orderId}::uuid AND vessel_id = ${vesselId}::uuid FOR UPDATE`,
      );
      const current = await transaction.maintenanceOrder.findFirst({
        where: { id: orderId, vesselId },
        include: { assignee: { select: { id: true, displayName: true } } },
      });
      if (!current)
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'MAINTENANCE_ORDER_NOT_FOUND',
          'No maintenance order was found in this vessel.',
        );
      if (current.revision !== body.expectedRevision)
        throw new ApiException(
          HttpStatus.CONFLICT,
          'MAINTENANCE_STALE_WRITE',
          'This order changed. Review current values before saving again.',
        );
      if (current.status === 'CLOSED' || current.status === 'CANCELLED')
        throw new ApiException(
          HttpStatus.CONFLICT,
          'MAINTENANCE_ORDER_FINAL',
          'Final orders cannot be edited.',
        );
      const next = {
        title: body.title,
        category: body.category,
        priority: body.priority,
        assigneeId: body.assigneeId === undefined ? current.assigneeId : body.assigneeId,
        targetDate: targetDate === undefined ? current.targetDate : targetDate,
      };
      const value = (field: (typeof editableFields)[number], record: typeof next) => {
        const item = record[field];
        return item instanceof Date ? item.toISOString().slice(0, 10) : (item ?? '');
      };
      const changed = editableFields.filter(
        (field) => value(field, next) !== value(field, current),
      );
      if (!changed.length) return current;
      if (
        changed.includes('assigneeId') &&
        next.assigneeId &&
        !(await this.assignees.findEligible(next.assigneeId, transaction))
      )
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'MAINTENANCE_ASSIGNEE_INELIGIBLE',
          'Choose an active user permitted to manage maintenance.',
          { assigneeId: ['Choose an eligible responsible user.'] },
        );
      const saved = await transaction.maintenanceOrder.update({
        where: { id: orderId, revision: body.expectedRevision },
        data: { ...next, revision: { increment: 1 } },
        include: { assignee: { select: { id: true, displayName: true } } },
      });
      const changes: Record<string, string> = {};
      for (const field of changed) {
        changes[`old_${field}`] = value(field, current);
        changes[`new_${field}`] = value(field, next);
      }
      await this.audit.append(transaction, {
        actorUserId,
        correlationId,
        action: 'MAINTENANCE_ORDER_UPDATED',
        entityType: 'MAINTENANCE_ORDER',
        entityId: orderId,
        metadata: {
          vesselId,
          changedFields: changed.join(','),
          revision: String(saved.revision),
          ...changes,
        },
      });
      return saved;
    });
  }
}
