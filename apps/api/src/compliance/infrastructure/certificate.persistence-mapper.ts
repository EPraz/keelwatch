import { Prisma, type Certificate, type CertificateType } from '@prisma/client';
import type { CertificateRecord, CertificateTypeRecord } from '../domain/certificate';
import type { UpdateCertificateRecordInput } from '../ports/compliance.repository';

export function toCertificateTypeRecord(type: CertificateType): CertificateTypeRecord {
  return {
    id: type.id,
    code: type.code,
    name: type.name,
    isRequired: type.isRequired,
  };
}

export function toCertificateRecord(
  certificate: Certificate & {
    readonly certificateType: CertificateType;
  },
): CertificateRecord {
  return {
    id: certificate.id,
    vesselId: certificate.vesselId,
    certificateTypeId: certificate.certificateTypeId,
    certificateTypeCode: certificate.certificateType.code,
    certificateTypeName: certificate.certificateType.name,
    referenceNumber: certificate.referenceNumber,
    issuer: certificate.issuer,
    issuedOn: certificate.issuedOn,
    expiresOn: certificate.expiresOn,
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt,
    archivedAt: certificate.archivedAt,
  };
}

export function changedCertificateFields(
  certificate: Certificate,
  certificateTypeId: string,
  input: UpdateCertificateRecordInput,
): readonly string[] {
  return [
    ...(certificate.certificateTypeId !== certificateTypeId
      ? ['certificateTypeCode']
      : []),
    ...(certificate.referenceNumber !== input.referenceNumber ? ['referenceNumber'] : []),
    ...(certificate.issuer !== input.issuer ? ['issuer'] : []),
    ...(certificate.issuedOn.getTime() !== input.issuedOn.getTime() ? ['issuedOn'] : []),
    ...(certificate.expiresOn.getTime() !== input.expiresOn.getTime()
      ? ['expiresOn']
      : []),
  ];
}

export function isPrismaUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
