import type { AuditHistoryRecord } from '../../audit/application/audit-history.reader';
import { isUUID } from 'class-validator';

const fields = [
  'title',
  'category',
  'priority',
  'status',
  'assigneeId',
  'targetDate',
] as const;
const reasons = [
  'AWAITING_RESOURCES',
  'COORDINATION_REQUIRED',
  'INCORRECT_RECORD',
  'WORK_NO_LONGER_REQUIRED',
];
const choices = {
  category: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'],
  priority: ['LOW', 'NORMAL', 'HIGH'],
  status: ['OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED'],
};
export const maintenanceHistoryActions = [
  'MAINTENANCE_ORDER_CREATED',
  'MAINTENANCE_ORDER_UPDATED',
  'MAINTENANCE_ORDER_TRANSITIONED',
];

function knownValue(field: (typeof fields)[number], value: string | null) {
  if (!value) return null;
  if (field === 'category' || field === 'priority' || field === 'status')
    return choices[field].includes(value) ? value : null;
  if (field === 'assigneeId') return isUUID(value) ? value : null;
  if (field === 'targetDate') {
    const date = new Date(`${value}T00:00:00.000Z`);
    return /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
      !value.startsWith('0000-') &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
      ? value
      : null;
  }
  return value.length >= 2 ? value : null;
}

export function maintenanceHistoryView(event: AuditHistoryRecord) {
  const metadata =
    typeof event.metadata === 'object' &&
    event.metadata !== null &&
    !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
  const value = (key: string) =>
    typeof metadata[key] === 'string' && metadata[key].length <= 120
      ? metadata[key] || null
      : null;
  const changes = fields
    .filter(
      (field) =>
        event.action === 'MAINTENANCE_ORDER_CREATED' ||
        (event.action === 'MAINTENANCE_ORDER_UPDATED' &&
          typeof metadata.changedFields === 'string' &&
          metadata.changedFields.split(',').includes(field)) ||
        (event.action === 'MAINTENANCE_ORDER_TRANSITIONED' && field === 'status'),
    )
    .map((field) => ({
      field,
      oldValue:
        event.action === 'MAINTENANCE_ORDER_CREATED'
          ? null
          : knownValue(field, value(`old_${field}`)),
      newValue: knownValue(
        field,
        value(event.action === 'MAINTENANCE_ORDER_CREATED' ? field : `new_${field}`),
      ),
    }));
  const reasonCode = value('reasonCode');
  return {
    id: event.id,
    action: event.action,
    actorDisplayName: event.actorDisplayName,
    occurredAt: event.occurredAt.toISOString(),
    changes,
    reasonCode: reasonCode && reasons.includes(reasonCode) ? reasonCode : null,
  };
}
