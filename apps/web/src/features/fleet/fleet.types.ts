export interface Vessel {
  readonly id: string;
  readonly name: string;
  readonly registryNumber: string;
  readonly status: 'ACTIVE' | 'ARCHIVED';
  readonly createdAt: string;
}

export interface VesselActivity {
  readonly id: string;
  readonly action: string;
  readonly actorDisplayName: string;
  readonly occurredAt: string;
  readonly changedFields: readonly string[];
}

export interface VesselDetail extends Vessel {
  readonly updatedAt: string;
  readonly activity: readonly VesselActivity[];
}

export interface VesselPage {
  readonly items: readonly Vessel[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CreateVesselInput {
  readonly name: string;
  readonly registryNumber: string;
}

export type UpdateVesselInput = CreateVesselInput;

export interface FleetApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly correlationId?: string;
}
