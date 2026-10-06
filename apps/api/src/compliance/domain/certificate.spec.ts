import { describe, expect, it } from 'vitest';
import {
  deriveComplianceSnapshot,
  parseCalendarDate,
  type CertificateRecord,
  type CertificateTypeRecord,
} from './certificate';

const safetyEquipment: CertificateTypeRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};
const asOf = new Date('2026-10-03T18:45:00.000Z');

function certificate(expiresOn: string, idSuffix = '1'): CertificateRecord {
  return {
    id: `40000000-0000-4000-8000-${idSuffix.padStart(12, '0')}`,
    vesselId: '10000000-0000-4000-8000-000000000001',
    certificateTypeId: safetyEquipment.id,
    certificateTypeCode: safetyEquipment.code,
    certificateTypeName: safetyEquipment.name,
    referenceNumber: `SE-2026-${idSuffix}`,
    issuer: 'Northstar Safety Registry',
    issuedOn: new Date('2026-09-01T00:00:00.000Z'),
    expiresOn: new Date(`${expiresOn}T00:00:00.000Z`),
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    archivedAt: null,
  };
}

function statusFor(certificates: readonly CertificateRecord[]) {
  return deriveComplianceSnapshot({
    certificateTypes: [safetyEquipment],
    certificates,
    asOf,
  });
}

describe('calendar date parsing', () => {
  it('accepts real calendar dates and rejects impossible or instant values', () => {
    expect(parseCalendarDate('2028-02-29')?.toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
    expect(parseCalendarDate('2026-02-29')).toBeNull();
    expect(parseCalendarDate('2026-02-30')).toBeNull();
    expect(parseCalendarDate('2026-10-03T12:00:00Z')).toBeNull();
  });
});

describe('derived compliance status', () => {
  it('marks a required type without evidence as missing', () => {
    expect(statusFor([])).toMatchObject({
      asOf: '2026-10-03',
      status: 'MISSING',
      reason: 'Safety equipment certificate is missing.',
    });
  });

  it('marks evidence that expired before asOf as expired', () => {
    expect(statusFor([certificate('2026-10-02')])).toMatchObject({
      status: 'EXPIRED',
      reason: 'Safety equipment certificate expired on 2026-10-02.',
    });
  });

  it.each([
    ['2026-10-03', 0],
    ['2026-11-02', 30],
  ])('includes %s at %i days in expiring soon', (expiresOn, days) => {
    const snapshot = statusFor([certificate(expiresOn)]);
    expect(snapshot.status).toBe('EXPIRING_SOON');
    expect(snapshot.reason).toContain(`expires in ${days} days`);
  });

  it('marks 31 days remaining as valid', () => {
    expect(statusFor([certificate('2026-11-03')])).toMatchObject({
      status: 'VALID',
      reason: 'Safety equipment certificate is valid until 2026-11-03.',
    });
  });

  it('uses the certificate with the latest expiry while preserving history', () => {
    const expired = certificate('2026-10-01', '1');
    const current = certificate('2026-11-03', '2');
    expect(statusFor([expired, current])).toMatchObject({
      status: 'VALID',
      certificates: [expired, current],
      requirements: [{ certificate: current }],
    });
  });

  it('keeps future-issued evidence in history without applying it today', () => {
    const future = {
      ...certificate('2027-10-04', '3'),
      issuedOn: new Date('2026-10-04T00:00:00.000Z'),
    };

    expect(statusFor([future])).toMatchObject({
      status: 'MISSING',
      certificates: [future],
      requirements: [{ certificate: null }],
    });
  });

  it('keeps archived evidence in history without applying it', () => {
    const archived = {
      ...certificate('2027-10-04', '4'),
      archivedAt: new Date('2026-10-03T12:00:00.000Z'),
    };

    expect(statusFor([archived])).toMatchObject({
      status: 'MISSING',
      certificates: [archived],
      requirements: [{ certificate: null }],
    });
  });
});
