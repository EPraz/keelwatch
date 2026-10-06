import type {
  CertificateType,
  ComplianceNotification,
  ComplianceNotificationRun,
  Vessel,
} from '@prisma/client';
import type {
  ComplianceNotificationRecord,
  NotificationJobRunRecord,
} from '../domain/notification';

export function toNotificationJobRun(
  run: ComplianceNotificationRun,
): NotificationJobRunRecord {
  return {
    id: run.id,
    status: run.status,
    queuedAt: run.queuedAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdCount: run.createdCount,
    skippedCount: run.skippedCount,
    resolvedCount: run.resolvedCount,
    failureCode: run.failureCode,
  };
}

export function toComplianceNotification(
  record: ComplianceNotification & {
    readonly vessel: Vessel;
    readonly certificateType: CertificateType;
  },
): ComplianceNotificationRecord {
  return {
    id: record.id,
    vesselId: record.vesselId,
    vesselName: record.vessel.name,
    registryNumber: record.vessel.registryNumber,
    certificateTypeId: record.certificateTypeId,
    certificateTypeName: record.certificateType.name,
    conditionKey: record.conditionKey,
    status: record.status,
    reason: record.reason,
    asOf: record.asOf,
    createdAt: record.createdAt,
    resolvedAt: record.resolvedAt,
  };
}
