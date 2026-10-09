import { HttpStatus } from '@nestjs/common';
import type { MaintenanceStatus } from '@prisma/client';
import { ApiException } from '../../common/http/api-exception';

export type MaintenanceAction =
  'PLAN' | 'START' | 'BLOCK' | 'RESUME' | 'CLOSE' | 'CANCEL';
const edges: Record<
  MaintenanceAction,
  { from: readonly MaintenanceStatus[]; to: MaintenanceStatus }
> = {
  PLAN: { from: ['OPEN'], to: 'PLANNED' },
  START: { from: ['PLANNED'], to: 'IN_PROGRESS' },
  BLOCK: { from: ['IN_PROGRESS'], to: 'BLOCKED' },
  RESUME: { from: ['BLOCKED'], to: 'IN_PROGRESS' },
  CLOSE: { from: ['IN_PROGRESS'], to: 'CLOSED' },
  CANCEL: { from: ['OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED'], to: 'CANCELLED' },
};

export function maintenanceTransition(
  status: MaintenanceStatus,
  action: MaintenanceAction,
  reasonCode?: string,
) {
  if (status === 'CLOSED' || status === 'CANCELLED')
    throw new ApiException(
      HttpStatus.CONFLICT,
      'MAINTENANCE_ORDER_FINAL',
      'Final orders cannot be changed.',
    );
  const edge = edges[action];
  if (!edge.from.includes(status))
    throw new ApiException(
      HttpStatus.CONFLICT,
      'MAINTENANCE_TRANSITION_INVALID',
      'This action is unavailable in the current state.',
    );
  const reasons =
    action === 'BLOCK'
      ? ['AWAITING_RESOURCES', 'COORDINATION_REQUIRED']
      : action === 'CANCEL'
        ? ['INCORRECT_RECORD', 'WORK_NO_LONGER_REQUIRED']
        : [];
  if (
    reasons.length
      ? !reasonCode || !reasons.includes(reasonCode)
      : reasonCode !== undefined
  )
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'MAINTENANCE_REASON_INVALID',
      'Choose a valid reason for this action.',
      {
        reasonCode: [
          'Choose a valid reason for this action; other actions take no reason.',
        ],
      },
    );
  return { status: edge.to, reasonCode: reasonCode ?? null };
}
