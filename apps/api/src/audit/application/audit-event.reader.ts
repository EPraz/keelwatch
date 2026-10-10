export const AUDIT_EVENT_READER = Symbol('AUDIT_EVENT_READER');

export interface AuditActivityRecord {
  readonly id: string;
  readonly action: string;
  readonly actorDisplayName: string;
  readonly occurredAt: Date;
  readonly changedFields: readonly string[];
}

export interface AuditEventReader {
  listForEntity(input: {
    readonly entityType: string;
    readonly entityId: string;
    readonly take: number;
    readonly includeMaintenance?: boolean;
  }): Promise<readonly AuditActivityRecord[]>;
}
