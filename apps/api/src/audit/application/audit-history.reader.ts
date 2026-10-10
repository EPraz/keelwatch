export const AUDIT_HISTORY_READER = Symbol('AUDIT_HISTORY_READER');

export interface AuditHistoryRecord {
  readonly id: string;
  readonly action: string;
  readonly actorDisplayName: string;
  readonly occurredAt: Date;
  readonly metadata: unknown;
}
export interface AuditHistoryReader {
  pageForEntity(input: {
    readonly entityType: string;
    readonly entityId: string;
    readonly vesselId: string;
    readonly actions: readonly string[];
    readonly cursor?: string;
  }): Promise<{
    readonly items: readonly AuditHistoryRecord[];
    readonly nextCursor: string | null;
  } | null>;
}
