import type { Prisma } from '@prisma/client';

export const AUDIT_EVENT_WRITER = Symbol('AUDIT_EVENT_WRITER');

export interface AuditEventInput {
  readonly actorUserId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly correlationId: string;
}

export interface AuditEventWriter {
  append(transaction: Prisma.TransactionClient, event: AuditEventInput): Promise<void>;
}
