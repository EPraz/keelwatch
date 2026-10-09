import type { MaintenanceOrder, MaintenanceTransitionInput } from './maintenance.types';
export type MaintenanceAction = MaintenanceTransitionInput['action'];
export const lifecycleActions: Record<
  MaintenanceOrder['status'],
  readonly MaintenanceAction[]
> = {
  OPEN: ['PLAN', 'CANCEL'],
  PLANNED: ['START', 'CANCEL'],
  IN_PROGRESS: ['BLOCK', 'CLOSE', 'CANCEL'],
  BLOCKED: ['RESUME', 'CANCEL'],
  CLOSED: [],
  CANCELLED: [],
};
export const actionLabels: Record<MaintenanceAction, string> = {
  PLAN: 'Plan order',
  START: 'Start work',
  BLOCK: 'Block work',
  RESUME: 'Resume work',
  CLOSE: 'Close order',
  CANCEL: 'Cancel order',
};
export const lifecycleReasons = {
  BLOCK: ['AWAITING_RESOURCES', 'COORDINATION_REQUIRED'],
  CANCEL: ['INCORRECT_RECORD', 'WORK_NO_LONGER_REQUIRED'],
} as const;
