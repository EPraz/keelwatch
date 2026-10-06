import type { CrewMemberRecord } from '../domain/crew-member';

export const CREW_REPOSITORY = Symbol('CREW_REPOSITORY');

export interface RegisterCrewInput {
  readonly displayName: string;
  readonly crewNumber: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface CrewRepository {
  createWithAudit(input: RegisterCrewInput): Promise<CrewMemberRecord>;
  list(input: { readonly skip: number; readonly take: number }): Promise<{
    readonly items: readonly CrewMemberRecord[];
    readonly total: number;
  }>;
}
