// Generated from Maintenance OpenAPI; checked by maintenance.postgres.integration.spec.ts.
export type MaintenanceOrder = {
  readonly vesselName?: string;
  readonly vesselRegistryNumber?: string;
  readonly id: string;
  readonly vesselId: string;
  readonly title: string;
  readonly category: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  readonly priority: 'LOW' | 'NORMAL' | 'HIGH';
  readonly status:
    'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'CLOSED' | 'CANCELLED';
  readonly reasonCode:
    | 'AWAITING_RESOURCES'
    | 'COORDINATION_REQUIRED'
    | 'INCORRECT_RECORD'
    | 'WORK_NO_LONGER_REQUIRED'
    | null;
  readonly assignee: { readonly id: string; readonly displayName: string } | null;
  readonly targetDate: string | null;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type MaintenancePage = {
  readonly items: readonly {
    readonly vesselName?: string;
    readonly vesselRegistryNumber?: string;
    readonly id: string;
    readonly vesselId: string;
    readonly title: string;
    readonly category: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
    readonly priority: 'LOW' | 'NORMAL' | 'HIGH';
    readonly status:
      'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'CLOSED' | 'CANCELLED';
    readonly reasonCode:
      | 'AWAITING_RESOURCES'
      | 'COORDINATION_REQUIRED'
      | 'INCORRECT_RECORD'
      | 'WORK_NO_LONGER_REQUIRED'
      | null;
    readonly assignee: { readonly id: string; readonly displayName: string } | null;
    readonly targetDate: string | null;
    readonly revision: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
};
export type MaintenanceAssigneePage = {
  readonly items: readonly { readonly id: string; readonly displayName: string }[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
};
export type MaintenanceTransitionInput = {
  readonly action: 'PLAN' | 'START' | 'BLOCK' | 'RESUME' | 'CLOSE' | 'CANCEL';
  readonly reasonCode?:
    | 'AWAITING_RESOURCES'
    | 'COORDINATION_REQUIRED'
    | 'INCORRECT_RECORD'
    | 'WORK_NO_LONGER_REQUIRED';
  readonly expectedRevision: number;
};
