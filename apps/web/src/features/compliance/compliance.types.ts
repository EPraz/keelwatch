export type ComplianceStatus = 'MISSING' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';

export interface CertificateType {
  readonly code: string;
  readonly name: string;
  readonly isRequired: boolean;
}

export interface Certificate {
  readonly id: string;
  readonly certificateTypeCode: string;
  readonly certificateTypeName: string;
  readonly referenceNumber: string;
  readonly issuer: string;
  readonly issuedOn: string;
  readonly expiresOn: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ComplianceRequirement {
  readonly certificateType: CertificateType;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly certificate: Certificate | null;
}

export interface ComplianceWorkspace {
  readonly asOf: string;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly requirements: readonly ComplianceRequirement[];
  readonly certificates: readonly Certificate[];
  readonly certificateTypes: readonly CertificateType[];
}

export interface ComplianceQueueItem {
  readonly vessel: {
    readonly id: string;
    readonly name: string;
    readonly registryNumber: string;
  };
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly nextExpiryOn: string | null;
}

export interface ComplianceQueuePage {
  readonly asOf: string;
  readonly items: readonly ComplianceQueueItem[];
  readonly counts: Readonly<Record<ComplianceStatus, number>>;
  readonly totalVessels: number;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ComplianceQueueQuery {
  readonly page: number;
  readonly pageSize?: number;
  readonly status?: ComplianceStatus;
  readonly search?: string;
}

export type NotificationJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface NotificationJobRun {
  readonly id: string;
  readonly status: NotificationJobStatus;
  readonly queuedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdCount: number;
  readonly skippedCount: number;
  readonly resolvedCount: number;
  readonly failureCode: string | null;
}

export interface ComplianceNotification {
  readonly id: string;
  readonly vesselId: string;
  readonly vesselName: string;
  readonly registryNumber: string;
  readonly certificateTypeName: string;
  readonly status: Exclude<ComplianceStatus, 'VALID'>;
  readonly reason: string;
  readonly asOf: string;
  readonly createdAt: string;
}

export interface NotificationWatch {
  readonly items: readonly ComplianceNotification[];
  readonly total: number;
  readonly latestRun: NotificationJobRun | null;
}

export interface CreateCertificateInput {
  readonly certificateTypeCode: string;
  readonly referenceNumber: string;
  readonly issuer: string;
  readonly issuedOn: string;
  readonly expiresOn: string;
}

export interface ComplianceApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly correlationId?: string;
}
