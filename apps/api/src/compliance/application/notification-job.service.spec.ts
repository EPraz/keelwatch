import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { FleetService } from '../../fleet/application/fleet.service';
import type { VesselRecord } from '../../fleet/domain/vessel';
import type { CertificateTypeRecord } from '../domain/certificate';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../ports/compliance.repository';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/notification.repository';
import { NotificationJobService } from './notification-job.service';

const vessel: VesselRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
};
const type: CertificateTypeRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};

async function createSubject() {
  const markRunning = vi.fn<NotificationRepository['markRunning']>();
  const complete = vi.fn<NotificationRepository['complete']>();
  const fail = vi.fn<NotificationRepository['fail']>();
  const findQueueData = vi.fn<ComplianceRepository['findQueueData']>();
  const listActiveRecords = vi.fn().mockResolvedValue([vessel]);
  const module = await Test.createTestingModule({
    providers: [
      NotificationJobService,
      { provide: FleetService, useValue: { listActiveRecords } },
      { provide: COMPLIANCE_REPOSITORY, useValue: { findQueueData } },
      {
        provide: NOTIFICATION_REPOSITORY,
        useValue: { markRunning, complete, fail },
      },
    ],
  }).compile();
  return {
    service: module.get(NotificationJobService),
    markRunning,
    complete,
    fail,
    findQueueData,
    listActiveRecords,
    close: () => module.close(),
  };
}

describe('NotificationJobService', () => {
  it('derives current conditions and completes a claimed run', async () => {
    const subject = await createSubject();
    subject.markRunning.mockResolvedValue(true);
    subject.findQueueData.mockResolvedValue({
      certificateTypes: [type],
      certificates: [],
    });
    subject.complete.mockResolvedValue({} as never);

    await subject.service.runNow('50000000-0000-4000-8000-000000000001');

    expect(subject.complete).toHaveBeenCalledWith(
      '50000000-0000-4000-8000-000000000001',
      [expect.objectContaining({ status: 'MISSING', vesselId: vessel.id })],
    );
    expect(subject.fail).not.toHaveBeenCalled();
    await subject.close();
  });

  it('records a stable failure code without leaking the internal error', async () => {
    const subject = await createSubject();
    subject.markRunning.mockResolvedValue(true);
    subject.findQueueData.mockRejectedValue(new Error('Synthetic internal detail.'));
    subject.fail.mockResolvedValue({} as never);

    await subject.service.runNow('50000000-0000-4000-8000-000000000002');

    expect(subject.fail).toHaveBeenCalledWith(
      '50000000-0000-4000-8000-000000000002',
      'COMPLIANCE_NOTIFICATION_JOB_FAILED',
    );
    expect(subject.complete).not.toHaveBeenCalled();
    await subject.close();
  });
});
