import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MaintenanceHistoryQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  readonly cursor?: string;
}
export class MaintenanceHistoryChangeDto {
  @ApiProperty({
    enum: ['title', 'category', 'priority', 'status', 'assigneeId', 'targetDate'],
  })
  readonly field!: string;
  @ApiProperty({ type: String, nullable: true }) readonly oldValue!: string | null;
  @ApiProperty({ type: String, nullable: true }) readonly newValue!: string | null;
}
export class MaintenanceHistoryEventDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({
    enum: [
      'MAINTENANCE_ORDER_CREATED',
      'MAINTENANCE_ORDER_UPDATED',
      'MAINTENANCE_ORDER_TRANSITIONED',
    ],
  })
  readonly action!: string;
  @ApiProperty() readonly actorDisplayName!: string;
  @ApiProperty({ format: 'date-time' }) readonly occurredAt!: string;
  @ApiProperty({ type: [MaintenanceHistoryChangeDto] })
  readonly changes!: readonly MaintenanceHistoryChangeDto[];
  @ApiProperty({
    type: String,
    nullable: true,
    enum: [
      'AWAITING_RESOURCES',
      'COORDINATION_REQUIRED',
      'INCORRECT_RECORD',
      'WORK_NO_LONGER_REQUIRED',
    ],
  })
  readonly reasonCode!: string | null;
}
export class MaintenanceHistoryPageDto {
  @ApiProperty({ type: [MaintenanceHistoryEventDto] })
  readonly items!: readonly MaintenanceHistoryEventDto[];
  @ApiProperty({ enum: [5] }) readonly pageSize!: number;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) readonly nextCursor!:
    string | null;
}
