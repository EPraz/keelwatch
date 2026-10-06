import { ApiProperty } from '@nestjs/swagger';
import { formatCalendarDate } from '../domain/certificate';
import type {
  ComplianceNotificationRecord,
  NotificationConditionStatus,
  NotificationJobRunRecord,
  NotificationJobStatus,
  NotificationWatch,
} from '../domain/notification';

export class NotificationJobRunResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'] })
  readonly status!: NotificationJobStatus;

  @ApiProperty({ format: 'date-time' })
  readonly queuedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  readonly startedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  readonly completedAt!: string | null;

  @ApiProperty()
  readonly createdCount!: number;

  @ApiProperty()
  readonly skippedCount!: number;

  @ApiProperty()
  readonly resolvedCount!: number;

  @ApiProperty({ nullable: true })
  readonly failureCode!: string | null;

  static from(run: NotificationJobRunRecord): NotificationJobRunResponseDto {
    return {
      ...run,
      queuedAt: run.queuedAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  }
}

class ComplianceNotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ format: 'uuid' })
  readonly vesselId!: string;

  @ApiProperty()
  readonly vesselName!: string;

  @ApiProperty()
  readonly registryNumber!: string;

  @ApiProperty()
  readonly certificateTypeName!: string;

  @ApiProperty({ enum: ['MISSING', 'EXPIRED', 'EXPIRING_SOON'] })
  readonly status!: NotificationConditionStatus;

  @ApiProperty()
  readonly reason!: string;

  @ApiProperty({ format: 'date' })
  readonly asOf!: string;

  @ApiProperty({ format: 'date-time' })
  readonly createdAt!: string;

  static from(record: ComplianceNotificationRecord) {
    return {
      id: record.id,
      vesselId: record.vesselId,
      vesselName: record.vesselName,
      registryNumber: record.registryNumber,
      certificateTypeName: record.certificateTypeName,
      status: record.status,
      reason: record.reason,
      asOf: formatCalendarDate(record.asOf),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export class NotificationWatchResponseDto {
  @ApiProperty({ type: [ComplianceNotificationResponseDto] })
  readonly items!: readonly ComplianceNotificationResponseDto[];

  @ApiProperty()
  readonly total!: number;

  @ApiProperty({ type: NotificationJobRunResponseDto, nullable: true })
  readonly latestRun!: NotificationJobRunResponseDto | null;

  static from(watch: NotificationWatch): NotificationWatchResponseDto {
    return {
      items: watch.items.map((item) => ComplianceNotificationResponseDto.from(item)),
      total: watch.total,
      latestRun: watch.latestRun
        ? NotificationJobRunResponseDto.from(watch.latestRun)
        : null,
    };
  }
}
