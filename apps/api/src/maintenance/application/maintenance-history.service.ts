import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_HISTORY_READER,
  type AuditHistoryReader,
} from '../../audit/application/audit-history.reader';
import { ApiException } from '../../common/http/api-exception';
import { MaintenanceService } from './maintenance.service';
import {
  maintenanceHistoryActions,
  maintenanceHistoryView,
} from './maintenance-history-values';
import { MaintenanceAssigneeDirectory } from '../../access/application/maintenance-assignee.directory';

@Injectable()
export class MaintenanceHistoryService {
  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly assignees: MaintenanceAssigneeDirectory,
    @Inject(AUDIT_HISTORY_READER) private readonly audit: AuditHistoryReader,
  ) {}
  async list(vesselId: string, orderId: string, cursor?: string) {
    await this.maintenance.detail(vesselId, orderId);
    const page = await this.audit.pageForEntity({
      entityType: 'MAINTENANCE_ORDER',
      entityId: orderId,
      vesselId,
      actions: maintenanceHistoryActions,
      cursor,
    });
    if (!page)
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'MAINTENANCE_HISTORY_CURSOR_INVALID',
        'Choose a history page belonging to this order.',
      );
    const items = page.items.map(maintenanceHistoryView);
    const ids = [
      ...new Set(
        items.flatMap((event) =>
          event.changes.flatMap((change) =>
            change.field === 'assigneeId'
              ? [change.oldValue, change.newValue].filter(
                  (value): value is string => value !== null,
                )
              : [],
          ),
        ),
      ),
    ];
    const names = new Map(
      (await this.assignees.historyNames(ids)).map((user) => [user.id, user.displayName]),
    );
    const display = (id: string | null) =>
      id ? (names.get(id) ?? 'Unavailable responsible user') : null;
    return {
      items: items.map((event) => ({
        ...event,
        changes: event.changes.map((change) =>
          change.field === 'assigneeId'
            ? {
                ...change,
                oldValue: display(change.oldValue),
                newValue: display(change.newValue),
              }
            : change,
        ),
      })),
      pageSize: 5,
      nextCursor: page.nextCursor,
    };
  }
}
