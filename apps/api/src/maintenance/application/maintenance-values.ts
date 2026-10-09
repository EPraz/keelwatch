import { HttpStatus } from '@nestjs/common';
import type { MaintenanceOrder } from '@prisma/client';
import { ApiException } from '../../common/http/api-exception';

export function maintenanceDate(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    value.startsWith('0000-') ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'MAINTENANCE_DATE_INVALID',
      'Use a valid calendar date.',
      { targetDate: ['Use a valid calendar date.'] },
    );
  }
  return date;
}

export function maintenanceView(
  record: MaintenanceOrder & {
    assignee: { id: string; displayName: string } | null;
  },
) {
  return {
    id: record.id,
    vesselId: record.vesselId,
    title: record.title,
    category: record.category,
    priority: record.priority,
    status: record.status,
    assignee: record.assignee,
    targetDate: record.targetDate?.toISOString().slice(0, 10) ?? null,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
