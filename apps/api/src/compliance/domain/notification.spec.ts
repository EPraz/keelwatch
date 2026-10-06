import { describe, expect, it } from 'vitest';
import type { VesselRecord } from '../../fleet/domain/vessel';
import type { CertificateRecord, CertificateTypeRecord } from './certificate';
import { deriveNotificationConditions } from './notification';

const type: CertificateTypeRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};
const vessel: VesselRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
};

function certificate(expiresOn: string): CertificateRecord {
  return {
    id: '40000000-0000-4000-8000-000000000001',
    vesselId: vessel.id,
    certificateTypeId: type.id,
    certificateTypeCode: type.code,
    certificateTypeName: type.name,
    referenceNumber: 'SE-0001',
    issuer: 'Northstar Safety Registry',
    issuedOn: new Date('2026-09-01T00:00:00.000Z'),
    expiresOn: new Date(`${expiresOn}T00:00:00.000Z`),
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    archivedAt: null,
  };
}

function conditions(certificates: readonly CertificateRecord[]) {
  return deriveNotificationConditions({
    vessels: [vessel],
    certificateTypes: [type],
    certificates,
    asOf: new Date('2026-10-04T18:00:00.000Z'),
  });
}

describe('notification conditions', () => {
  it('creates a stable missing condition without evidence', () => {
    expect(conditions([])).toEqual([
      expect.objectContaining({
        status: 'MISSING',
        conditionKey: `${vessel.id}:${type.id}:MISSING:none`,
        asOf: new Date('2026-10-04T00:00:00.000Z'),
      }),
    ]);
  });

  it('keys an expiring condition to its evidence and excludes valid evidence', () => {
    const expiring = certificate('2026-10-20');
    expect(conditions([expiring])).toEqual([
      expect.objectContaining({
        status: 'EXPIRING_SOON',
        conditionKey: `${vessel.id}:${type.id}:EXPIRING_SOON:${expiring.id}`,
      }),
    ]);
    expect(conditions([certificate('2027-10-20')])).toEqual([]);
  });
});
