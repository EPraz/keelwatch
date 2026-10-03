import { Module } from '@nestjs/common';
import { AUDIT_EVENT_READER } from './application/audit-event.reader';
import { AUDIT_EVENT_WRITER } from './application/audit-event.writer';
import { PrismaAuditEventReader } from './infrastructure/prisma-audit-event.reader';
import { PrismaAuditEventWriter } from './infrastructure/prisma-audit-event.writer';

@Module({
  providers: [
    PrismaAuditEventWriter,
    PrismaAuditEventReader,
    { provide: AUDIT_EVENT_WRITER, useExisting: PrismaAuditEventWriter },
    { provide: AUDIT_EVENT_READER, useExisting: PrismaAuditEventReader },
  ],
  exports: [AUDIT_EVENT_READER, AUDIT_EVENT_WRITER],
})
export class AuditModule {}
