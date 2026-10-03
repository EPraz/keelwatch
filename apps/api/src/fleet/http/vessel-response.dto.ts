import { ApiProperty } from '@nestjs/swagger';
import type { VesselDetail, VesselPage } from '../application/fleet.service';
import type { VesselRecord, VesselStatus } from '../domain/vessel';

export class VesselResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'MV Northwind' })
  readonly name!: string;

  @ApiProperty({ example: 'KW-000001' })
  readonly registryNumber!: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  readonly status!: VesselStatus;

  @ApiProperty({ format: 'date-time' })
  readonly createdAt!: string;

  static from(record: VesselRecord): VesselResponseDto {
    return {
      id: record.id,
      name: record.name,
      registryNumber: record.registryNumber,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export class VesselListResponseDto {
  @ApiProperty({ type: [VesselResponseDto] })
  readonly items!: readonly VesselResponseDto[];

  @ApiProperty({ example: 1 })
  readonly page!: number;

  @ApiProperty({ example: 20 })
  readonly pageSize!: number;

  @ApiProperty({ example: 1 })
  readonly total!: number;

  @ApiProperty({ example: 1 })
  readonly totalPages!: number;

  static from(page: VesselPage): VesselListResponseDto {
    return {
      items: page.items.map((item) => VesselResponseDto.from(item)),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}

export class VesselActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'VESSEL_UPDATED' })
  readonly action!: string;

  @ApiProperty({ example: 'Morgan Reed' })
  readonly actorDisplayName!: string;

  @ApiProperty({ format: 'date-time' })
  readonly occurredAt!: string;

  @ApiProperty({ type: [String], example: ['name'] })
  readonly changedFields!: readonly string[];
}

export class VesselDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'MV Northwind' })
  readonly name!: string;

  @ApiProperty({ example: 'KW-000001' })
  readonly registryNumber!: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  readonly status!: VesselStatus;

  @ApiProperty({ format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  readonly updatedAt!: string;

  @ApiProperty({ type: [VesselActivityResponseDto] })
  readonly activity!: readonly VesselActivityResponseDto[];

  static from(detail: VesselDetail): VesselDetailResponseDto {
    return {
      ...VesselResponseDto.from(detail.vessel),
      updatedAt: detail.vessel.updatedAt.toISOString(),
      activity: detail.activity.map((event) => ({
        id: event.id,
        action: event.action,
        actorDisplayName: event.actorDisplayName,
        occurredAt: event.occurredAt.toISOString(),
        changedFields: event.changedFields,
      })),
    };
  }
}
