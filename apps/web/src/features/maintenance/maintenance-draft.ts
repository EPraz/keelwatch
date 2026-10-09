import type { MaintenanceOrder } from './maintenance.types';
import type { MaintenanceInput } from './maintenance.api';

export const maintenanceFieldLabels = {
  title: 'Order title',
  category: 'Category',
  priority: 'Priority',
  assigneeId: 'Responsible user',
  targetDate: 'Target date',
};
export type MaintenanceField = keyof MaintenanceInput;
export function maintenanceDraft(order?: MaintenanceOrder): MaintenanceInput {
  return {
    title: order?.title ?? '',
    category: order?.category ?? 'PREVENTIVE',
    priority: order?.priority ?? 'NORMAL',
    assigneeId: order?.assignee?.id ?? null,
    targetDate: order?.targetDate ?? null,
  };
}
export function validateMaintenanceDraft(draft: MaintenanceInput) {
  const errors: Record<string, readonly string[]> = {};
  if (draft.title.trim().length < 2 || draft.title.trim().length > 120)
    errors.title = ['Use 2–120 characters.'];
  if (draft.targetDate) {
    const date = new Date(`${draft.targetDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(draft.targetDate) ||
      draft.targetDate.startsWith('0000-') ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== draft.targetDate
    )
      errors.targetDate = ['Use a valid calendar date.'];
  }
  return errors;
}
