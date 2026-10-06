import type { CrewMemberRecord } from '../domain/crew-member';
import type { QualificationKind, QualificationRecord } from '../domain/qualification';

export const QUALIFICATION_REPOSITORY = Symbol('QUALIFICATION_REPOSITORY');
export interface RecordQualificationInput {
  readonly crewMemberId: string;
  readonly kind: QualificationKind;
  readonly referenceNumber: string;
  readonly validFrom: Date;
  readonly expiresOn: Date;
  readonly actorUserId: string;
  readonly correlationId: string;
}
export interface QualificationRepository {
  findMember(id: string): Promise<CrewMemberRecord | null>;
  list(
    crewMemberId: string,
    skip: number,
    take: number,
  ): Promise<{
    readonly items: readonly QualificationRecord[];
    readonly total: number;
  }>;
  createWithAudit(input: RecordQualificationInput): Promise<QualificationRecord>;
}
