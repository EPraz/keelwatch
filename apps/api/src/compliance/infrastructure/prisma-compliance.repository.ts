import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { PrismaService } from '../../database/prisma.service';
import {
  CertificateArchivedError,
  CertificateNotFoundError,
  CertificateReferenceConflictError,
  CertificateTypeNotFoundError,
  type CertificateRecord,
} from '../domain/certificate';
import type {
  ComplianceRepository,
  ComplianceWorkspaceData,
  ArchiveCertificateRecordInput,
  CreateCertificateRecordInput,
  UpdateCertificateRecordInput,
} from '../ports/compliance.repository';
import {
  changedCertificateFields,
  isPrismaUniqueConflict,
  toCertificateRecord,
} from './certificate.persistence-mapper';
import { loadComplianceData } from './compliance-query';
@Injectable()
export class PrismaComplianceRepository implements ComplianceRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_EVENT_WRITER)
    private readonly audit: AuditEventWriter,
  ) {}

  async createWithAudit(input: CreateCertificateRecordInput): Promise<CertificateRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const certificateType = await transaction.certificateType.findUnique({
          where: { code: input.certificateTypeCode },
        });
        if (!certificateType) throw new CertificateTypeNotFoundError();

        const certificate = await transaction.certificate.create({
          data: {
            vesselId: input.vesselId,
            certificateTypeId: certificateType.id,
            referenceNumber: input.referenceNumber,
            issuer: input.issuer,
            issuedOn: input.issuedOn,
            expiresOn: input.expiresOn,
            createdById: input.actorUserId,
          },
          include: { certificateType: true },
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CERTIFICATE_CREATED',
          entityType: 'CERTIFICATE',
          entityId: certificate.id,
          metadata: {
            vesselId: input.vesselId,
            certificateTypeCode: certificateType.code,
            referenceNumber: certificate.referenceNumber,
          },
          correlationId: input.correlationId,
        });
        return toCertificateRecord(certificate);
      });
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        throw new CertificateReferenceConflictError();
      }
      throw error;
    }
  }

  async updateWithAudit(input: UpdateCertificateRecordInput): Promise<CertificateRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const [certificateType, current] = await Promise.all([
          transaction.certificateType.findUnique({
            where: { code: input.certificateTypeCode },
          }),
          transaction.certificate.findFirst({
            where: { id: input.certificateId, vesselId: input.vesselId },
            include: { certificateType: true },
          }),
        ]);
        if (!certificateType) throw new CertificateTypeNotFoundError();
        if (!current) throw new CertificateNotFoundError();
        if (current.archivedAt) throw new CertificateArchivedError();

        const fields = changedCertificateFields(current, certificateType.id, input);
        if (fields.length === 0) return toCertificateRecord(current);

        const update = await transaction.certificate.updateMany({
          where: {
            id: input.certificateId,
            vesselId: input.vesselId,
            archivedAt: null,
          },
          data: {
            certificateTypeId: certificateType.id,
            referenceNumber: input.referenceNumber,
            issuer: input.issuer,
            issuedOn: input.issuedOn,
            expiresOn: input.expiresOn,
          },
        });
        if (update.count !== 1) throw new CertificateArchivedError();
        const certificate = await transaction.certificate.findUniqueOrThrow({
          where: { id: input.certificateId },
          include: { certificateType: true },
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CERTIFICATE_UPDATED',
          entityType: 'CERTIFICATE',
          entityId: certificate.id,
          metadata: {
            vesselId: input.vesselId,
            certificateTypeCode: certificateType.code,
            referenceNumber: certificate.referenceNumber,
            changedFields: fields.join(','),
          },
          correlationId: input.correlationId,
        });
        return toCertificateRecord(certificate);
      });
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        throw new CertificateReferenceConflictError();
      }
      throw error;
    }
  }

  async archiveWithAudit(
    input: ArchiveCertificateRecordInput,
  ): Promise<CertificateRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.certificate.findFirst({
        where: { id: input.certificateId, vesselId: input.vesselId },
        include: { certificateType: true },
      });
      if (!current) throw new CertificateNotFoundError();
      if (current.archivedAt) throw new CertificateArchivedError();

      const archivedAt = new Date();
      const update = await transaction.certificate.updateMany({
        where: {
          id: input.certificateId,
          vesselId: input.vesselId,
          archivedAt: null,
        },
        data: { archivedAt },
      });
      if (update.count !== 1) throw new CertificateArchivedError();
      const certificate = await transaction.certificate.findUniqueOrThrow({
        where: { id: input.certificateId },
        include: { certificateType: true },
      });
      await this.audit.append(transaction, {
        actorUserId: input.actorUserId,
        action: 'CERTIFICATE_ARCHIVED',
        entityType: 'CERTIFICATE',
        entityId: certificate.id,
        metadata: {
          vesselId: input.vesselId,
          certificateTypeCode: certificate.certificateType.code,
          referenceNumber: certificate.referenceNumber,
        },
        correlationId: input.correlationId,
      });
      return toCertificateRecord(certificate);
    });
  }

  async findWorkspaceData(vesselId: string): Promise<ComplianceWorkspaceData> {
    return loadComplianceData(this.prisma, [vesselId]);
  }

  async findQueueData(vesselIds: readonly string[]): Promise<ComplianceWorkspaceData> {
    return loadComplianceData(this.prisma, vesselIds);
  }
}
