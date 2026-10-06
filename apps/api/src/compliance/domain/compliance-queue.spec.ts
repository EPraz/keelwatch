import { describe, expect, it } from 'vitest';
import type { VesselRecord } from '../../fleet/domain/vessel';
import type { CertificateRecord, CertificateTypeRecord } from './certificate';
import { deriveComplianceQueue } from './compliance-queue';

const type: CertificateTypeRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};

function vessel(id: string, name: string, registryNumber: string): VesselRecord {
  return {
    id,
    name,
    registryNumber,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  };
}

function certificate(vesselId: string, expiresOn: string): CertificateRecord {
  return {
    id: `40000000-0000-4000-8000-${vesselId.slice(-12)}`,
    vesselId,
    certificateTypeId: type.id,
    certificateTypeCode: type.code,
    certificateTypeName: type.name,
    referenceNumber: `SE-${vesselId.slice(-4)}`,
    issuer: 'Northstar Safety Registry',
    issuedOn: new Date('2026-09-01T00:00:00.000Z'),
    expiresOn: new Date(`${expiresOn}T00:00:00.000Z`),
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    archivedAt: null,
  };
}

const missing = vessel(
  '10000000-0000-4000-8000-000000000001',
  'MV Northwind',
  'KW-000001',
);
const valid = vessel('10000000-0000-4000-8000-000000000002', 'MV Southwind', 'KW-000002');

describe('derived compliance queue', () => {
  it('orders action first and exposes traceable counts', () => {
    const page = deriveComplianceQueue({
      vessels: [valid, missing],
      certificateTypes: [type],
      certificates: [certificate(valid.id, '2027-12-01')],
      asOf: new Date('2026-10-04T20:00:00.000Z'),
      query: { page: 1, pageSize: 20 },
    });

    expect(page).toMatchObject({
      asOf: '2026-10-04',
      totalVessels: 2,
      total: 2,
      counts: { MISSING: 1, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 1 },
      items: [
        { vessel: { id: missing.id }, status: 'MISSING', nextExpiryOn: null },
        { vessel: { id: valid.id }, status: 'VALID', nextExpiryOn: '2027-12-01' },
      ],
    });
  });

  it('combines status and text filters before pagination', () => {
    const page = deriveComplianceQueue({
      vessels: [missing, valid],
      certificateTypes: [type],
      certificates: [certificate(valid.id, '2027-12-01')],
      asOf: new Date('2026-10-04T00:00:00.000Z'),
      query: { page: 1, pageSize: 1, status: 'VALID', search: 'kw-000002' },
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.vessel.id).toBe(valid.id);
    expect(page).toMatchObject({ total: 1, totalPages: 1, pageSize: 1 });
  });
});
