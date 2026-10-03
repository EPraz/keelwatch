export type VesselStatus = 'ACTIVE' | 'ARCHIVED';

export interface VesselRecord {
  readonly id: string;
  readonly name: string;
  readonly registryNumber: string;
  readonly status: VesselStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function normalizeVesselName(name: string): string {
  return name.trim();
}

export function normalizeRegistryNumber(registryNumber: string): string {
  return registryNumber.trim().toUpperCase();
}

export class VesselRegistryConflictError extends Error {
  constructor() {
    super('A vessel with this registry number already exists.');
    this.name = 'VesselRegistryConflictError';
  }
}
