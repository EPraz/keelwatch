import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  AUDIT_EVENT_READER,
  type AuditEventReader,
} from '../../audit/application/audit-event.reader';
import { ApiException } from '../../common/http/api-exception';
import { VesselRegistryConflictError, type VesselRecord } from '../domain/vessel';
import { VESSEL_REPOSITORY, type VesselRepository } from '../ports/vessel.repository';
import { FleetService } from './fleet.service';

const vessel: VesselRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: new Date('2026-10-02T12:00:00.000Z'),
  updatedAt: new Date('2026-10-02T12:00:00.000Z'),
};

async function createSubject() {
  const createWithAudit = vi.fn<VesselRepository['createWithAudit']>();
  const findById = vi.fn<VesselRepository['findById']>();
  const list = vi.fn<VesselRepository['list']>();
  const updateWithAudit = vi.fn<VesselRepository['updateWithAudit']>();
  const listForEntity = vi.fn<AuditEventReader['listForEntity']>();
  const repository: VesselRepository = {
    createWithAudit,
    findById,
    list,
    updateWithAudit,
  };
  const module = await Test.createTestingModule({
    providers: [
      FleetService,
      { provide: VESSEL_REPOSITORY, useValue: repository },
      { provide: AUDIT_EVENT_READER, useValue: { listForEntity } },
    ],
  }).compile();

  return {
    service: module.get(FleetService),
    createWithAudit,
    findById,
    list,
    updateWithAudit,
    listForEntity,
    close: () => module.close(),
  };
}

describe('FleetService', () => {
  it('normalizes vessel input before the atomic repository write', async () => {
    const subject = await createSubject();
    subject.createWithAudit.mockResolvedValue(vessel);

    await expect(
      subject.service.register({
        name: '  MV Northwind  ',
        registryNumber: ' kw-000001 ',
        actorUserId: '00000000-0000-4000-8000-000000000001',
        correlationId: 'test-register-vessel',
      }),
    ).resolves.toEqual(vessel);
    expect(subject.createWithAudit).toHaveBeenCalledWith({
      name: 'MV Northwind',
      registryNumber: 'KW-000001',
      actorUserId: '00000000-0000-4000-8000-000000000001',
      correlationId: 'test-register-vessel',
    });

    await subject.close();
  });

  it('maps a unique registry violation to the stable conflict contract', async () => {
    const subject = await createSubject();
    subject.createWithAudit.mockRejectedValue(new VesselRegistryConflictError());

    const result = subject.service.register({
      name: 'MV Northwind',
      registryNumber: 'KW-000001',
      actorUserId: '00000000-0000-4000-8000-000000000001',
      correlationId: 'test-duplicate-vessel',
    });

    await expect(result).rejects.toBeInstanceOf(ApiException);
    await expect(result).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    await subject.close();
  });

  it('returns stable pagination metadata', async () => {
    const subject = await createSubject();
    subject.list.mockResolvedValue({
      items: [vessel],
      total: 21,
    });

    await expect(subject.service.list({ page: 2, pageSize: 20 })).resolves.toEqual({
      items: [vessel],
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });
    expect(subject.list).toHaveBeenCalledWith({ skip: 20, take: 20 });
    await subject.close();
  });

  it('returns vessel detail with sanitized activity', async () => {
    const subject = await createSubject();
    subject.findById.mockResolvedValue(vessel);
    subject.listForEntity.mockResolvedValue([
      {
        id: '20000000-0000-4000-8000-000000000001',
        action: 'VESSEL_CREATED',
        actorDisplayName: 'Morgan Reed',
        occurredAt: vessel.createdAt,
        changedFields: [],
      },
    ]);

    await expect(subject.service.findById(vessel.id)).resolves.toMatchObject({
      vessel,
      activity: [{ action: 'VESSEL_CREATED', actorDisplayName: 'Morgan Reed' }],
    });
    expect(subject.listForEntity).toHaveBeenCalledWith({
      entityType: 'VESSEL',
      entityId: vessel.id,
      take: 20,
    });
    await subject.close();
  });

  it('returns a stable not-found error for missing detail', async () => {
    const subject = await createSubject();
    subject.findById.mockResolvedValue(null);

    await expect(subject.service.findById(vessel.id)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    expect(subject.listForEntity).not.toHaveBeenCalled();
    await subject.close();
  });

  it('normalizes edits before the atomic repository write', async () => {
    const subject = await createSubject();
    subject.updateWithAudit.mockResolvedValue(vessel);

    await subject.service.update({
      id: vessel.id,
      name: '  MV Northwind  ',
      registryNumber: ' kw-000001 ',
      actorUserId: '00000000-0000-4000-8000-000000000001',
      correlationId: 'test-update-vessel',
    });
    expect(subject.updateWithAudit).toHaveBeenCalledWith({
      id: vessel.id,
      name: 'MV Northwind',
      registryNumber: 'KW-000001',
      actorUserId: '00000000-0000-4000-8000-000000000001',
      correlationId: 'test-update-vessel',
    });
    await subject.close();
  });
});
