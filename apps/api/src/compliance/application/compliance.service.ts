import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import {
  CertificateArchivedError,
  CertificateNotFoundError,
  CertificateReferenceConflictError,
  CertificateTypeNotFoundError,
  deriveComplianceSnapshot,
  normalizeCertificateText,
  normalizeCertificateTypeCode,
  parseCalendarDate,
  type ComplianceSnapshot,
} from '../domain/certificate';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../ports/compliance.repository';

export interface RegisterCertificateCommand {
  readonly vesselId: string;
  readonly certificateTypeCode: string;
  readonly referenceNumber: string;
  readonly issuer: string;
  readonly issuedOn: string;
  readonly expiresOn: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface UpdateCertificateCommand extends RegisterCertificateCommand {
  readonly certificateId: string;
}

export interface ArchiveCertificateCommand {
  readonly vesselId: string;
  readonly certificateId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly fleet: FleetService,
    @Inject(COMPLIANCE_REPOSITORY)
    private readonly compliance: ComplianceRepository,
  ) {}

  async workspace(vesselId: string): Promise<ComplianceSnapshot> {
    await this.fleet.findRecordById(vesselId);
    return this.snapshot(vesselId, new Date());
  }

  async register(command: RegisterCertificateCommand): Promise<ComplianceSnapshot> {
    const vessel = await this.fleet.findRecordById(command.vesselId);
    if (vessel.status === 'ARCHIVED') {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'VESSEL_ARCHIVED',
        'Archived vessels do not accept new certificates.',
      );
    }

    const values = this.certificateValues(command);

    try {
      await this.compliance.createWithAudit({
        vesselId: command.vesselId,
        ...values,
        actorUserId: command.actorUserId,
        correlationId: command.correlationId,
      });
    } catch (error) {
      this.rethrowCertificateError(error);
    }

    return this.snapshot(command.vesselId, new Date());
  }

  async update(command: UpdateCertificateCommand): Promise<ComplianceSnapshot> {
    const vessel = await this.fleet.findRecordById(command.vesselId);
    if (vessel.status === 'ARCHIVED') {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'VESSEL_ARCHIVED',
        'Archived vessels do not accept certificate changes.',
      );
    }

    try {
      await this.compliance.updateWithAudit({
        vesselId: command.vesselId,
        certificateId: command.certificateId,
        ...this.certificateValues(command),
        actorUserId: command.actorUserId,
        correlationId: command.correlationId,
      });
    } catch (error) {
      this.rethrowCertificateError(error);
    }
    return this.snapshot(command.vesselId, new Date());
  }

  async archive(command: ArchiveCertificateCommand): Promise<ComplianceSnapshot> {
    await this.fleet.findRecordById(command.vesselId);
    try {
      await this.compliance.archiveWithAudit(command);
    } catch (error) {
      this.rethrowCertificateError(error);
    }
    return this.snapshot(command.vesselId, new Date());
  }

  private certificateValues(command: RegisterCertificateCommand) {
    const issuedOn = parseCalendarDate(command.issuedOn);
    const expiresOn = parseCalendarDate(command.expiresOn);
    if (!issuedOn || !expiresOn) {
      const fieldErrors = {
        ...(!issuedOn ? { issuedOn: ['Enter a valid calendar date.'] } : {}),
        ...(!expiresOn ? { expiresOn: ['Enter a valid calendar date.'] } : {}),
      };
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CERTIFICATE_DATE_INVALID',
        'Use valid calendar dates in YYYY-MM-DD format.',
        fieldErrors,
      );
    }
    if (issuedOn.getTime() > expiresOn.getTime()) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CERTIFICATE_DATE_RANGE_INVALID',
        'Issued on must be on or before expires on.',
        {
          issuedOn: ['Issued on must be on or before expires on.'],
          expiresOn: ['Expires on must be on or after issued on.'],
        },
      );
    }
    return {
      certificateTypeCode: normalizeCertificateTypeCode(command.certificateTypeCode),
      referenceNumber: normalizeCertificateText(command.referenceNumber),
      issuer: normalizeCertificateText(command.issuer),
      issuedOn,
      expiresOn,
    };
  }

  private rethrowCertificateError(error: unknown): never {
    if (error instanceof CertificateReferenceConflictError) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'CERTIFICATE_REFERENCE_CONFLICT',
        error.message,
        { referenceNumber: ['Use a unique reference for this vessel and type.'] },
      );
    }
    if (error instanceof CertificateTypeNotFoundError) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CERTIFICATE_TYPE_INVALID',
        error.message,
        { certificateTypeCode: [error.message] },
      );
    }
    if (error instanceof CertificateNotFoundError) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'CERTIFICATE_NOT_FOUND',
        error.message,
      );
    }
    if (error instanceof CertificateArchivedError) {
      throw new ApiException(HttpStatus.CONFLICT, 'CERTIFICATE_ARCHIVED', error.message);
    }
    throw error;
  }

  private async snapshot(vesselId: string, asOf: Date): Promise<ComplianceSnapshot> {
    const data = await this.compliance.findWorkspaceData(vesselId);
    return deriveComplianceSnapshot({ ...data, asOf });
  }
}
