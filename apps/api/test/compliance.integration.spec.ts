import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FleetService } from '../src/fleet/application/fleet.service';
import { NotificationJobService } from '../src/compliance/application/notification-job.service';
import type { VesselRecord } from '../src/fleet/domain/vessel';
import {
  CertificateArchivedError,
  CertificateNotFoundError,
  CertificateReferenceConflictError,
  type CertificateRecord,
  type CertificateTypeRecord,
} from '../src/compliance/domain/certificate';
import {
  COMPLIANCE_REPOSITORY,
  type ArchiveCertificateRecordInput,
  type ComplianceRepository,
  type CreateCertificateRecordInput,
  type UpdateCertificateRecordInput,
} from '../src/compliance/ports/compliance.repository';

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
const notificationRun = {
  id: '50000000-0000-4000-8000-000000000001',
  status: 'SUCCEEDED' as const,
  queuedAt: new Date('2026-10-04T12:00:00.000Z'),
  startedAt: new Date('2026-10-04T12:00:01.000Z'),
  completedAt: new Date('2026-10-04T12:00:02.000Z'),
  createdCount: 1,
  skippedCount: 0,
  resolvedCount: 0,
  failureCode: null,
};

class MemoryComplianceRepository implements ComplianceRepository {
  certificates: CertificateRecord[] = [];
  auditCount = 0;

  reset(): void {
    this.certificates = [];
    this.auditCount = 0;
  }

  createWithAudit(input: CreateCertificateRecordInput): Promise<CertificateRecord> {
    if (
      this.certificates.some(
        (item) =>
          item.vesselId === input.vesselId &&
          item.certificateTypeCode === input.certificateTypeCode &&
          item.referenceNumber === input.referenceNumber,
      )
    ) {
      throw new CertificateReferenceConflictError();
    }
    const certificate: CertificateRecord = {
      id: `40000000-0000-4000-8000-${String(this.certificates.length + 1).padStart(12, '0')}`,
      vesselId: input.vesselId,
      certificateTypeId: certificateType.id,
      certificateTypeCode: certificateType.code,
      certificateTypeName: certificateType.name,
      referenceNumber: input.referenceNumber,
      issuer: input.issuer,
      issuedOn: input.issuedOn,
      expiresOn: input.expiresOn,
      createdAt: new Date('2026-10-03T12:00:00.000Z'),
      updatedAt: new Date('2026-10-03T12:00:00.000Z'),
      archivedAt: null,
    };
    this.certificates.unshift(certificate);
    this.auditCount += 1;
    return Promise.resolve(certificate);
  }

  updateWithAudit(input: UpdateCertificateRecordInput): Promise<CertificateRecord> {
    const index = this.certificates.findIndex(
      (item) => item.id === input.certificateId && item.vesselId === input.vesselId,
    );
    const current = this.certificates[index];
    if (!current) throw new CertificateNotFoundError();
    if (current.archivedAt) throw new CertificateArchivedError();
    if (
      this.certificates.some(
        (item) =>
          item.id !== current.id &&
          item.vesselId === input.vesselId &&
          item.certificateTypeCode === input.certificateTypeCode &&
          item.referenceNumber === input.referenceNumber,
      )
    ) {
      throw new CertificateReferenceConflictError();
    }
    const certificate: CertificateRecord = {
      ...current,
      certificateTypeCode: input.certificateTypeCode,
      referenceNumber: input.referenceNumber,
      issuer: input.issuer,
      issuedOn: input.issuedOn,
      expiresOn: input.expiresOn,
      updatedAt: new Date('2026-10-04T12:00:00.000Z'),
    };
    this.certificates[index] = certificate;
    this.auditCount += 1;
    return Promise.resolve(certificate);
  }

  archiveWithAudit(input: ArchiveCertificateRecordInput): Promise<CertificateRecord> {
    const index = this.certificates.findIndex(
      (item) => item.id === input.certificateId && item.vesselId === input.vesselId,
    );
    const current = this.certificates[index];
    if (!current) throw new CertificateNotFoundError();
    if (current.archivedAt) throw new CertificateArchivedError();
    const archivedAt = new Date('2026-10-04T12:00:00.000Z');
    const certificate = { ...current, archivedAt, updatedAt: archivedAt };
    this.certificates[index] = certificate;
    this.auditCount += 1;
    return Promise.resolve(certificate);
  }

  findWorkspaceData(vesselId: string) {
    return Promise.resolve({
      certificateTypes: [certificateType],
      certificates: this.certificates.filter((item) => item.vesselId === vesselId),
    });
  }

  findQueueData(vesselIds: readonly string[]) {
    return Promise.resolve({
      certificateTypes: [certificateType],
      certificates: this.certificates.filter((item) => vesselIds.includes(item.vesselId)),
    });
  }
}

describe('Compliance API contract and authorization', () => {
  let app: INestApplication;
  let httpServer: Server;
  const compliance = new MemoryComplianceRepository();
  const bodyOf = (response: Response): Record<string, unknown> =>
    response.body as Record<string, unknown>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.ACCESS_STORE = 'memory';
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    const [{ AppModule }, { configureApplication }] = await Promise.all([
      import('../src/app.module'),
      import('../src/configure-application'),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FleetService)
      .useValue({
        findRecordById: () => Promise.resolve(vessel),
        listActiveRecords: () => Promise.resolve([vessel]),
      })
      .overrideProvider(COMPLIANCE_REPOSITORY)
      .useValue(compliance)
      .overrideProvider(NotificationJobService)
      .useValue({
        watch: () => Promise.resolve({ items: [], total: 0, latestRun: notificationRun }),
        enqueue: () => Promise.resolve(notificationRun),
        findRun: () => Promise.resolve(notificationRun),
      })
      .compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => compliance.reset());
  afterAll(async () => app.close());

  it('shows missing required evidence to an Auditor with a server asOf date', async () => {
    const response = await request(httpServer)
      .get(`/api/v1/vessels/${vessel.id}/compliance`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);

    const body = bodyOf(response);
    expect(body.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(body.status).toBe('MISSING');
    expect(body.reason).toBe('Safety equipment certificate is missing.');
    expect(body.certificates).toEqual([]);
  });

  it('returns an authorized, filterable compliance queue', async () => {
    const missing = await request(httpServer)
      .get('/api/v1/compliance?status=MISSING&search=northwind')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);

    expect(bodyOf(missing)).toMatchObject({
      totalVessels: 1,
      total: 1,
      page: 1,
      counts: { MISSING: 1, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
      items: [
        {
          vessel: { id: vessel.id, registryNumber: vessel.registryNumber },
          status: 'MISSING',
          reason: 'Safety equipment certificate is missing.',
        },
      ],
    });

    await request(httpServer)
      .get('/api/v1/compliance?status=UNKNOWN')
      .set('Authorization', 'Bearer local.auditor')
      .expect(400);
    await request(httpServer).get('/api/v1/compliance').expect(401);
  });

  it('lets a manager create evidence and returns the recalculated workspace', async () => {
    const response = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .set('X-Correlation-Id', 'certificate-contract-create')
      .send({
        certificateTypeCode: 'safety_equipment',
        referenceNumber: ' SE-2026-0001 ',
        issuer: ' Northstar Safety Registry ',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);

    expect(bodyOf(response)).toMatchObject({
      status: 'VALID',
      certificates: [
        {
          certificateTypeCode: 'SAFETY_EQUIPMENT',
          referenceNumber: 'SE-2026-0001',
          issuer: 'Northstar Safety Registry',
        },
      ],
    });
    expect(compliance.auditCount).toBe(1);
  });

  it('rejects impossible and reversed dates without a record or event', async () => {
    await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-INVALID-DATE',
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-02-30',
        expiresOn: '2027-09-01',
      })
      .expect(400);
    const reversed = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-REVERSED',
        issuer: 'Northstar Safety Registry',
        issuedOn: '2027-09-02',
        expiresOn: '2027-09-01',
      })
      .expect(400);

    expect(bodyOf(reversed)).toMatchObject({
      code: 'CERTIFICATE_DATE_RANGE_INVALID',
      fieldErrors: {
        issuedOn: ['Issued on must be on or before expires on.'],
        expiresOn: ['Expires on must be on or after issued on.'],
      },
    });
    expect(compliance.certificates).toHaveLength(0);
    expect(compliance.auditCount).toBe(0);
  });

  it('returns a stable conflict for the same vessel, type, and reference', async () => {
    const payload = {
      certificateTypeCode: 'SAFETY_EQUIPMENT',
      referenceNumber: 'SE-2026-DUPLICATE',
      issuer: 'Northstar Safety Registry',
      issuedOn: '2026-09-01',
      expiresOn: '2099-09-01',
    };
    await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(payload)
      .expect(201);
    const response = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(payload)
      .expect(409);

    expect(bodyOf(response)).toMatchObject({
      code: 'CERTIFICATE_REFERENCE_CONFLICT',
      fieldErrors: {
        referenceNumber: ['Use a unique reference for this vessel and type.'],
      },
    });
    expect(compliance.certificates).toHaveLength(1);
    expect(compliance.auditCount).toBe(1);
  });

  it('edits and archives a certificate while preserving its history', async () => {
    const payload = {
      certificateTypeCode: 'SAFETY_EQUIPMENT',
      referenceNumber: 'SE-LIFECYCLE',
      issuer: 'Northstar Safety Registry',
      issuedOn: '2026-09-01',
      expiresOn: '2099-09-01',
    };
    const created = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send(payload)
      .expect(201);
    const certificateId = (bodyOf(created).certificates as readonly { id: string }[])[0]!
      .id;

    const updated = await request(httpServer)
      .put(`/api/v1/vessels/${vessel.id}/certificates/${certificateId}`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({ ...payload, issuer: 'Northstar Registry Updated' })
      .expect(200);
    expect(bodyOf(updated)).toMatchObject({
      status: 'VALID',
      certificates: [
        { id: certificateId, issuer: 'Northstar Registry Updated', archivedAt: null },
      ],
    });

    const archived = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates/${certificateId}/archive`)
      .set('Authorization', 'Bearer local.operations-manager')
      .expect(200);
    const archivedBody = bodyOf(archived);
    const archivedCertificates = archivedBody.certificates as readonly {
      readonly id: string;
      readonly archivedAt: unknown;
    }[];
    expect(archivedBody.status).toBe('MISSING');
    expect(archivedCertificates[0]?.id).toBe(certificateId);
    expect(typeof archivedCertificates[0]?.archivedAt).toBe('string');
    await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates/${certificateId}/archive`)
      .set('Authorization', 'Bearer local.operations-manager')
      .expect(409);
    expect(compliance.auditCount).toBe(3);
  });

  it('denies an Auditor certificate lifecycle writes', async () => {
    const created = await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.operations-manager')
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-READ-ONLY-LIFECYCLE',
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(201);
    const certificateId = (bodyOf(created).certificates as readonly { id: string }[])[0]!
      .id;

    await request(httpServer)
      .put(`/api/v1/vessels/${vessel.id}/certificates/${certificateId}`)
      .set('Authorization', 'Bearer local.auditor')
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-READ-ONLY-LIFECYCLE',
        issuer: 'Forbidden Update',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(403);
    await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates/${certificateId}/archive`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(403);
    expect(compliance.certificates[0]).toMatchObject({
      issuer: 'Northstar Safety Registry',
      archivedAt: null,
    });
    expect(compliance.auditCount).toBe(1);
  });

  it('denies an Auditor before a certificate or event is written', async () => {
    await request(httpServer)
      .post(`/api/v1/vessels/${vessel.id}/certificates`)
      .set('Authorization', 'Bearer local.auditor')
      .send({
        certificateTypeCode: 'SAFETY_EQUIPMENT',
        referenceNumber: 'SE-READ-ONLY',
        issuer: 'Northstar Safety Registry',
        issuedOn: '2026-09-01',
        expiresOn: '2099-09-01',
      })
      .expect(403);

    expect(compliance.certificates).toHaveLength(0);
    expect(compliance.auditCount).toBe(0);
  });

  it('requires authentication before compliance data is returned', async () => {
    await request(httpServer).get(`/api/v1/vessels/${vessel.id}/compliance`).expect(401);
  });

  it('exposes notification runs read-only and denies Auditor triggers', async () => {
    const watch = await request(httpServer)
      .get('/api/v1/compliance/notifications')
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
    expect(bodyOf(watch)).toMatchObject({
      total: 0,
      latestRun: { id: notificationRun.id, status: 'SUCCEEDED', createdCount: 1 },
    });

    await request(httpServer)
      .post('/api/v1/compliance/notification-jobs')
      .set('Authorization', 'Bearer local.auditor')
      .expect(403);
    await request(httpServer)
      .post('/api/v1/compliance/notification-jobs')
      .set('Authorization', 'Bearer local.operations-manager')
      .expect(202)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: notificationRun.id, status: 'SUCCEEDED' });
      });
    await request(httpServer)
      .get(`/api/v1/compliance/notification-jobs/${notificationRun.id}`)
      .set('Authorization', 'Bearer local.auditor')
      .expect(200);
  });
});
