import type { CrewMember } from './crew.api';

export interface QualificationInput {
  readonly kind: string;
  readonly referenceNumber: string;
  readonly validFrom: string;
  readonly expiresOn: string;
}
export interface Qualification extends QualificationInput {
  readonly id: string;
  readonly kindLabel: string;
  readonly createdAt: string;
  readonly status: 'NOT_YET_VALID' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';
  readonly reason: string;
  readonly asOf: string;
}
export interface QualificationWorkspace {
  readonly member: CrewMember;
  readonly asOf: string;
  readonly items: readonly Qualification[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
}
