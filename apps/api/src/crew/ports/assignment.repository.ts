import type {
  AssignmentRecord,
  AssignmentRole,
  CancellationReason,
} from '../domain/assignment';
export const ASSIGNMENT_REPOSITORY = Symbol('ASSIGNMENT_REPOSITORY');
export interface CreateAssignmentInput {
  readonly vesselId: string;
  readonly crewNumber: string;
  readonly role: AssignmentRole;
  readonly startsOn: Date;
  readonly endsOn: Date;
  readonly actorUserId: string;
  readonly correlationId: string;
}
export interface CancelAssignmentInput {
  readonly vesselId: string;
  readonly assignmentId: string;
  readonly reason: CancellationReason;
  readonly actorUserId: string;
  readonly correlationId: string;
}
export interface AssignmentRepository {
  composition(
    vesselId: string,
    date: Date,
    role: AssignmentRole | undefined,
    skip: number,
    take: number,
  ): Promise<{
    items: readonly AssignmentRecord[];
    total: number;
  }>;
  createWithAudit(input: CreateAssignmentInput): Promise<AssignmentRecord>;
  cancelWithAudit(input: CancelAssignmentInput): Promise<AssignmentRecord>;
  list(
    vesselId: string,
    skip: number,
    take: number,
  ): Promise<{
    items: readonly AssignmentRecord[];
    total: number;
  }>;
}
