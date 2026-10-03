import type { VesselRecord } from '../domain/vessel';

export const VESSEL_REPOSITORY = Symbol('VESSEL_REPOSITORY');

export interface CreateVesselRecordInput {
  readonly name: string;
  readonly registryNumber: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface ListVesselsInput {
  readonly skip: number;
  readonly take: number;
}

export interface UpdateVesselRecordInput {
  readonly id: string;
  readonly name: string;
  readonly registryNumber: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface VesselListRecord {
  readonly items: readonly VesselRecord[];
  readonly total: number;
}

export interface VesselRepository {
  createWithAudit(input: CreateVesselRecordInput): Promise<VesselRecord>;
  findById(id: string): Promise<VesselRecord | null>;
  list(input: ListVesselsInput): Promise<VesselListRecord>;
  updateWithAudit(input: UpdateVesselRecordInput): Promise<VesselRecord | null>;
}
