import { ApiProperty } from '@nestjs/swagger';
import type {
  CertificateRecord,
  CertificateTypeRecord,
  ComplianceRequirement,
  ComplianceSnapshot,
  ComplianceStatus,
} from '../domain/certificate';
import { formatCalendarDate } from '../domain/certificate';

export class CertificateTypeResponseDto {
  @ApiProperty({ example: 'SAFETY_EQUIPMENT' })
  readonly code!: string;

  @ApiProperty({ example: 'Safety equipment certificate' })
  readonly name!: string;

  @ApiProperty({ example: true })
  readonly isRequired!: boolean;

  static from(record: CertificateTypeRecord): CertificateTypeResponseDto {
    return { code: record.code, name: record.name, isRequired: record.isRequired };
  }
}

export class CertificateResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'SAFETY_EQUIPMENT' })
  readonly certificateTypeCode!: string;

  @ApiProperty({ example: 'Safety equipment certificate' })
  readonly certificateTypeName!: string;

  @ApiProperty({ example: 'SE-2026-0001' })
  readonly referenceNumber!: string;

  @ApiProperty({ example: 'Northstar Safety Registry' })
  readonly issuer!: string;

  @ApiProperty({ format: 'date' })
  readonly issuedOn!: string;

  @ApiProperty({ format: 'date' })
  readonly expiresOn!: string;

  @ApiProperty({ format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  readonly updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  readonly archivedAt!: string | null;

  static from(record: CertificateRecord): CertificateResponseDto {
    return {
      id: record.id,
      certificateTypeCode: record.certificateTypeCode,
      certificateTypeName: record.certificateTypeName,
      referenceNumber: record.referenceNumber,
      issuer: record.issuer,
      issuedOn: formatCalendarDate(record.issuedOn),
      expiresOn: formatCalendarDate(record.expiresOn),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      archivedAt: record.archivedAt?.toISOString() ?? null,
    };
  }
}

export class ComplianceRequirementResponseDto {
  @ApiProperty({ type: CertificateTypeResponseDto })
  readonly certificateType!: CertificateTypeResponseDto;

  @ApiProperty({ enum: ['MISSING', 'EXPIRED', 'EXPIRING_SOON', 'VALID'] })
  readonly status!: ComplianceStatus;

  @ApiProperty()
  readonly reason!: string;

  @ApiProperty({ type: CertificateResponseDto, nullable: true })
  readonly certificate!: CertificateResponseDto | null;

  static from(record: ComplianceRequirement): ComplianceRequirementResponseDto {
    return {
      certificateType: CertificateTypeResponseDto.from(record.certificateType),
      status: record.status,
      reason: record.reason,
      certificate: record.certificate
        ? CertificateResponseDto.from(record.certificate)
        : null,
    };
  }
}

export class ComplianceWorkspaceResponseDto {
  @ApiProperty({ format: 'date' })
  readonly asOf!: string;

  @ApiProperty({ enum: ['MISSING', 'EXPIRED', 'EXPIRING_SOON', 'VALID'] })
  readonly status!: ComplianceStatus;

  @ApiProperty()
  readonly reason!: string;

  @ApiProperty({ type: [ComplianceRequirementResponseDto] })
  readonly requirements!: readonly ComplianceRequirementResponseDto[];

  @ApiProperty({ type: [CertificateResponseDto] })
  readonly certificates!: readonly CertificateResponseDto[];

  @ApiProperty({ type: [CertificateTypeResponseDto] })
  readonly certificateTypes!: readonly CertificateTypeResponseDto[];

  static from(snapshot: ComplianceSnapshot): ComplianceWorkspaceResponseDto {
    return {
      asOf: snapshot.asOf,
      status: snapshot.status,
      reason: snapshot.reason,
      requirements: snapshot.requirements.map((record) =>
        ComplianceRequirementResponseDto.from(record),
      ),
      certificates: snapshot.certificates.map((record) =>
        CertificateResponseDto.from(record),
      ),
      certificateTypes: snapshot.certificateTypes.map((record) =>
        CertificateTypeResponseDto.from(record),
      ),
    };
  }
}
