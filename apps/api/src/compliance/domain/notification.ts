import type { VesselRecord } from '../../fleet/domain/vessel';
import {
  deriveComplianceSnapshot,
  utcCalendarDate,
  type CertificateRecord,
  type CertificateTypeRecord,
} from './certificate';

export type NotificationConditionStatus = 'MISSING' | 'EXPIRED' | 'EXPIRING_SOON';
export type NotificationJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface NotificationCondition {
  readonly vesselId: string;
  readonly certificateTypeId: string;
  readonly conditionKey: string;
  readonly status: NotificationConditionStatus;
  readonly reason: string;
  readonly asOf: Date;
}

export interface ComplianceNotificationRecord extends NotificationCondition {
  readonly id: string;
  readonly vesselName: string;
  readonly registryNumber: string;
  readonly certificateTypeName: string;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
}

export interface NotificationJobRunRecord {
  readonly id: string;
  readonly status: NotificationJobStatus;
  readonly queuedAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdCount: number;
  readonly skippedCount: number;
  readonly resolvedCount: number;
  readonly failureCode: string | null;
}

export interface NotificationWatch {
  readonly items: readonly ComplianceNotificationRecord[];
  readonly total: number;
  readonly latestRun: NotificationJobRunRecord | null;
}

export function deriveNotificationConditions(input: {
  readonly vessels: readonly VesselRecord[];
  readonly certificateTypes: readonly CertificateTypeRecord[];
  readonly certificates: readonly CertificateRecord[];
  readonly asOf: Date;
}): readonly NotificationCondition[] {
  const asOf = utcCalendarDate(input.asOf);
  return input.vessels.flatMap((vessel) => {
    const snapshot = deriveComplianceSnapshot({
      certificateTypes: input.certificateTypes,
      certificates: input.certificates.filter((item) => item.vesselId === vessel.id),
      asOf,
    });
    return snapshot.requirements.flatMap((requirement) => {
      if (requirement.status === 'VALID') return [];
      const evidenceKey = requirement.certificate?.id ?? 'none';
      return [
        {
          vesselId: vessel.id,
          certificateTypeId: requirement.certificateType.id,
          conditionKey: [
            vessel.id,
            requirement.certificateType.id,
            requirement.status,
            evidenceKey,
          ].join(':'),
          status: requirement.status,
          reason: requirement.reason,
          asOf,
        },
      ];
    });
  });
}
