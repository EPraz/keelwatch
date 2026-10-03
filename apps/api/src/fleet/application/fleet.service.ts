import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_EVENT_READER,
  type AuditActivityRecord,
  type AuditEventReader,
} from '../../audit/application/audit-event.reader';
import { ApiException } from '../../common/http/api-exception';
import {
  normalizeRegistryNumber,
  normalizeVesselName,
  VesselRegistryConflictError,
  type VesselRecord,
} from '../domain/vessel';
import { VESSEL_REPOSITORY, type VesselRepository } from '../ports/vessel.repository';

export interface RegisterVesselCommand {
  readonly name: string;
  readonly registryNumber: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface ListVesselsQuery {
  readonly page: number;
  readonly pageSize: number;
}

export interface VesselPage {
  readonly items: readonly VesselRecord[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface VesselDetail {
  readonly vessel: VesselRecord;
  readonly activity: readonly AuditActivityRecord[];
}

export interface UpdateVesselCommand extends RegisterVesselCommand {
  readonly id: string;
}

@Injectable()
export class FleetService {
  constructor(
    @Inject(VESSEL_REPOSITORY)
    private readonly vessels: VesselRepository,
    @Inject(AUDIT_EVENT_READER)
    private readonly activity: AuditEventReader,
  ) {}

  async register(command: RegisterVesselCommand): Promise<VesselRecord> {
    try {
      return await this.vessels.createWithAudit({
        name: normalizeVesselName(command.name),
        registryNumber: normalizeRegistryNumber(command.registryNumber),
        actorUserId: command.actorUserId,
        correlationId: command.correlationId,
      });
    } catch (error) {
      if (error instanceof VesselRegistryConflictError) {
        throw this.registryConflict(error);
      }
      throw error;
    }
  }

  async list(query: ListVesselsQuery): Promise<VesselPage> {
    const result = await this.vessels.list({
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async findById(id: string): Promise<VesselDetail> {
    const vessel = await this.vessels.findById(id);
    if (!vessel) throw this.notFound();

    return {
      vessel,
      activity: await this.activity.listForEntity({
        entityType: 'VESSEL',
        entityId: id,
        take: 20,
      }),
    };
  }

  async update(command: UpdateVesselCommand): Promise<VesselRecord> {
    try {
      const vessel = await this.vessels.updateWithAudit({
        id: command.id,
        name: normalizeVesselName(command.name),
        registryNumber: normalizeRegistryNumber(command.registryNumber),
        actorUserId: command.actorUserId,
        correlationId: command.correlationId,
      });
      if (!vessel) throw this.notFound();
      return vessel;
    } catch (error) {
      if (error instanceof VesselRegistryConflictError) {
        throw this.registryConflict(error);
      }
      throw error;
    }
  }

  private registryConflict(error: VesselRegistryConflictError): ApiException {
    return new ApiException(
      HttpStatus.CONFLICT,
      'VESSEL_REGISTRY_NUMBER_CONFLICT',
      error.message,
      { registryNumber: ['Use a unique registry number.'] },
    );
  }

  private notFound(): ApiException {
    return new ApiException(
      HttpStatus.NOT_FOUND,
      'VESSEL_NOT_FOUND',
      'The requested vessel was not found.',
    );
  }
}
