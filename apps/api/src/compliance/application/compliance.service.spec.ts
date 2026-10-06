import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import type { VesselRecord } from '../../fleet/domain/vessel';
import {
  CertificateReferenceConflictError,
  type CertificateTypeRecord,
} from '../domain/certificate';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../ports/compliance.repository';
import { ComplianceService } from './compliance.service';

const vessel: VesselRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: new Date('2026-10-02T12:00:00.000Z'),
  updatedAt: new Date('2026-10-02T12:00:00.000Z'),
};
const certificateType: CertificateTypeRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};

async function createSubject() {
  const findRecordById = vi.fn().mockResolvedValue(vessel);
  const createWithAudit = vi.fn<ComplianceRepository['createWithAudit']>();
  const findWorkspaceData = vi
    .fn<ComplianceRepository['findWorkspaceData']>()
    .mockResolvedValue({ certificateTypes: [certificateType], certificates: [] });
  const module = await Test.createTestingModule({
    providers: [
      ComplianceService,
      { provide: FleetService, useValue: { findRecordById } },
      {
        provide: COMPLIANCE_REPOSITORY,
        useValue: { createWithAudit, findWorkspaceData },
      },
    ],
  }).compile();
  return {
    service: module.get(ComplianceService),
    createWithAudit,
    findWorkspaceData,
    close: () => module.close(),
  };
}

const command = {
  vesselId: vessel.id,
  certificateTypeCode: ' safety_equipment ',
  referenceNumber: ' SE-2026-0001 ',
  issuer: ' Northstar Safety Registry ',
  issuedOn: '2026-09-01',
  expiresOn: '2027-09-01',
  actorUserId: '00000000-0000-4000-8000-000000000001',
  correlationId: 'certificate-create-unit',
};

describe('ComplianceService', () => {
  it('normalizes a valid command before the atomic write', async () => {
    const subject = await createSubject();
    subject.createWithAudit.mockResolvedValue({} as never);

    await subject.service.register(command);
    expect(subject.createWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-2026-0001',
        issuer: 'Northstar Safety Registry',
        issuedOn: new Date('2026-09-01T00:00:00.000Z'),
        expiresOn: new Date('2027-09-01T00:00:00.000Z'),
      }),
    );
    await subject.close();
  });

  it('rejects reversed dates before any repository write', async () => {
    const subject = await createSubject();
    const result = subject.service.register({
      ...command,
      issuedOn: '2027-09-02',
    });

    await expect(result).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(subject.createWithAudit).not.toHaveBeenCalled();
    await subject.close();
  });

  it('maps a relevant duplicate to the stable conflict contract', async () => {
    const subject = await createSubject();
    subject.createWithAudit.mockRejectedValue(new CertificateReferenceConflictError());
    const result = subject.service.register(command);

    await expect(result).rejects.toBeInstanceOf(ApiException);
    await expect(result).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    await subject.close();
  });
});
