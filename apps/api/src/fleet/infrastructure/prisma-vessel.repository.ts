import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Vessel } from '@prisma/client';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { PrismaService } from '../../database/prisma.service';
import { VesselRegistryConflictError, type VesselRecord } from '../domain/vessel';
import type {
  CreateVesselRecordInput,
  ListVesselsInput,
  UpdateVesselRecordInput,
  VesselListRecord,
  VesselRepository,
} from '../ports/vessel.repository';

function toVesselRecord(vessel: Vessel): VesselRecord {
  return {
    id: vessel.id,
    name: vessel.name,
    registryNumber: vessel.registryNumber,
    status: vessel.status,
    createdAt: vessel.createdAt,
    updatedAt: vessel.updatedAt,
  };
}

@Injectable()
export class PrismaVesselRepository implements VesselRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_EVENT_WRITER)
    private readonly audit: AuditEventWriter,
  ) {}

  async createWithAudit(input: CreateVesselRecordInput): Promise<VesselRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const vessel = await transaction.vessel.create({
          data: {
            name: input.name,
            registryNumber: input.registryNumber,
            createdById: input.actorUserId,
          },
        });

        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'VESSEL_CREATED',
          entityType: 'VESSEL',
          entityId: vessel.id,
          metadata: {
            name: vessel.name,
            registryNumber: vessel.registryNumber,
          },
          correlationId: input.correlationId,
        });

        return toVesselRecord(vessel);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new VesselRegistryConflictError();
      }
      throw error;
    }
  }

  async list(input: ListVesselsInput): Promise<VesselListRecord> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vessel.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.vessel.count(),
    ]);

    return { items: items.map(toVesselRecord), total };
  }

  async findById(
    id: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<VesselRecord | null> {
    if (transaction)
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM vessels WHERE id = ${id}::uuid FOR UPDATE`,
      );
    const vessel = await (transaction ?? this.prisma).vessel.findUnique({
      where: { id },
    });
    return vessel ? toVesselRecord(vessel) : null;
  }

  async listActive(): Promise<readonly VesselRecord[]> {
    const vessels = await this.prisma.vessel.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return vessels.map(toVesselRecord);
  }

  async updateWithAudit(input: UpdateVesselRecordInput): Promise<VesselRecord | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.vessel.findUnique({ where: { id: input.id } });
        if (!current) return null;

        const changedFields = [
          ...(current.name === input.name ? [] : ['name']),
          ...(current.registryNumber === input.registryNumber ? [] : ['registryNumber']),
        ];
        if (changedFields.length === 0) return toVesselRecord(current);

        const vessel = await transaction.vessel.update({
          where: { id: input.id },
          data: { name: input.name, registryNumber: input.registryNumber },
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'VESSEL_UPDATED',
          entityType: 'VESSEL',
          entityId: vessel.id,
          metadata: { changedFields: changedFields.join(',') },
          correlationId: input.correlationId,
        });
        return toVesselRecord(vessel);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new VesselRegistryConflictError();
      }
      throw error;
    }
  }
}
