import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ApiException } from '../../common/http/api-exception';
import { MaintenanceAssigneeDirectory } from '../../access/application/maintenance-assignee.directory';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import type { TransitionMaintenanceDto } from '../http/maintenance.dto';
import { maintenanceTransition } from '../domain/maintenance-lifecycle';

@Injectable()
export class PrismaMaintenanceLifecycle {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignees: MaintenanceAssigneeDirectory,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}
  transition(
    vesselId: string,
    orderId: string,
    body: TransitionMaintenanceDto,
    actorUserId: string,
    correlationId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
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
          'This order changed. Review current values before acting again.',
        );
      const next = maintenanceTransition(current.status, body.action, body.reasonCode);
      if (body.action === 'PLAN' && !current.targetDate)
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'MAINTENANCE_PLAN_INCOMPLETE',
          'Set a target date before planning.',
          { targetDate: ['Set a target date before planning.'] },
        );
      if (
        ['PLAN', 'START', 'RESUME'].includes(body.action) &&
        (!current.assigneeId ||
          !(await this.assignees.findEligible(current.assigneeId, transaction)))
      )
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'MAINTENANCE_ASSIGNEE_INELIGIBLE',
          'Choose an eligible responsible user before this action.',
          { assigneeId: ['Choose an eligible responsible user.'] },
        );
      const saved = await transaction.maintenanceOrder.update({
        where: { id: orderId, revision: body.expectedRevision },
        data: { ...next, revision: { increment: 1 } },
        include: { assignee: { select: { id: true, displayName: true } } },
      });
      await this.audit.append(transaction, {
        actorUserId,
        correlationId,
        action: 'MAINTENANCE_ORDER_TRANSITIONED',
        entityType: 'MAINTENANCE_ORDER',
        entityId: orderId,
        metadata: {
          vesselId,
          old_status: current.status,
          new_status: saved.status,
          reasonCode: next.reasonCode ?? '',
          revision: String(saved.revision),
          action: body.action,
        },
      });
      return saved;
    });
  }
}
