import type { CertificateRecord, CertificateTypeRecord } from '../domain/certificate';

export const COMPLIANCE_REPOSITORY = Symbol('COMPLIANCE_REPOSITORY');

export interface CreateCertificateRecordInput {
  readonly vesselId: string;
  readonly certificateTypeCode: string;
  readonly referenceNumber: string;
  readonly issuer: string;
  readonly issuedOn: Date;
  readonly expiresOn: Date;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface UpdateCertificateRecordInput extends CreateCertificateRecordInput {
  readonly certificateId: string;
}

export interface ArchiveCertificateRecordInput {
  readonly vesselId: string;
  readonly certificateId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface ComplianceWorkspaceData {
  readonly certificateTypes: readonly CertificateTypeRecord[];
  readonly certificates: readonly CertificateRecord[];
}

export interface ComplianceRepository {
  createWithAudit(input: CreateCertificateRecordInput): Promise<CertificateRecord>;
  updateWithAudit(input: UpdateCertificateRecordInput): Promise<CertificateRecord>;
  archiveWithAudit(input: ArchiveCertificateRecordInput): Promise<CertificateRecord>;
  findWorkspaceData(vesselId: string): Promise<ComplianceWorkspaceData>;
  findQueueData(vesselIds: readonly string[]): Promise<ComplianceWorkspaceData>;
}
