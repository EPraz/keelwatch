import { ApiProperty } from '@nestjs/swagger';
import type {
  ComplianceQueueItem,
  ComplianceQueuePage,
} from '../domain/compliance-queue';
import type { ComplianceStatus } from '../domain/certificate';

class ComplianceQueueVesselResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty()
  readonly registryNumber!: string;
}

class ComplianceQueueItemResponseDto {
  @ApiProperty({ type: ComplianceQueueVesselResponseDto })
  readonly vessel!: ComplianceQueueVesselResponseDto;

  @ApiProperty({ enum: ['MISSING', 'EXPIRED', 'EXPIRING_SOON', 'VALID'] })
  readonly status!: ComplianceStatus;

  @ApiProperty()
  readonly reason!: string;

  @ApiProperty({ format: 'date', nullable: true })
  readonly nextExpiryOn!: string | null;

  static from(item: ComplianceQueueItem): ComplianceQueueItemResponseDto {
    return item;
  }
}

class ComplianceCountsResponseDto {
  @ApiProperty()
  readonly MISSING!: number;

  @ApiProperty()
  readonly EXPIRED!: number;

  @ApiProperty()
  readonly EXPIRING_SOON!: number;

  @ApiProperty()
  readonly VALID!: number;
}

export class ComplianceQueueResponseDto {
  @ApiProperty({ format: 'date' })
  readonly asOf!: string;

  @ApiProperty({ type: [ComplianceQueueItemResponseDto] })
  readonly items!: readonly ComplianceQueueItemResponseDto[];

  @ApiProperty({ type: ComplianceCountsResponseDto })
  readonly counts!: ComplianceCountsResponseDto;

  @ApiProperty()
  readonly totalVessels!: number;

  @ApiProperty()
  readonly page!: number;

  @ApiProperty()
  readonly pageSize!: number;

  @ApiProperty()
  readonly total!: number;

  @ApiProperty()
  readonly totalPages!: number;

  static from(page: ComplianceQueuePage): ComplianceQueueResponseDto {
    return {
      ...page,
      items: page.items.map((item) => ComplianceQueueItemResponseDto.from(item)),
    };
  }
}
