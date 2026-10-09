import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  IsUUID,
  ValidateIf,
  MaxLength,
  MinLength,
} from 'class-validator';
export class MaintenancePaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  readonly page: number = 1;
}

export class CreateMaintenanceDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  readonly title!: string;
  @ApiProperty({ enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'] })
  @IsIn(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'])
  readonly category!: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  @ApiProperty({ enum: ['LOW', 'NORMAL', 'HIGH'] })
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  readonly priority!: 'LOW' | 'NORMAL' | 'HIGH';
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  readonly assigneeId?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  readonly targetDate?: string | null;
}

export class UpdateMaintenanceDto extends CreateMaintenanceDto {
  @ApiProperty({ minimum: 1, maximum: 2147483646 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  readonly expectedRevision!: number;
}

export class TransitionMaintenanceDto {
  @ApiProperty({ enum: ['PLAN', 'START', 'BLOCK', 'RESUME', 'CLOSE', 'CANCEL'] })
  @IsIn(['PLAN', 'START', 'BLOCK', 'RESUME', 'CLOSE', 'CANCEL'])
  readonly action!: 'PLAN' | 'START' | 'BLOCK' | 'RESUME' | 'CLOSE' | 'CANCEL';
  @ApiPropertyOptional({
    enum: [
      'AWAITING_RESOURCES',
      'COORDINATION_REQUIRED',
      'INCORRECT_RECORD',
      'WORK_NO_LONGER_REQUIRED',
    ],
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn([
    'AWAITING_RESOURCES',
    'COORDINATION_REQUIRED',
    'INCORRECT_RECORD',
    'WORK_NO_LONGER_REQUIRED',
  ])
  readonly reasonCode?: string;
  @ApiProperty({ minimum: 1, maximum: 2147483646 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  readonly expectedRevision!: number;
}

export class MaintenanceAssigneeDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly displayName!: string;
}
export class MaintenanceAssigneePageDto {
  @ApiProperty({ type: [MaintenanceAssigneeDto] })
  readonly items!: readonly MaintenanceAssigneeDto[];
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly totalPages!: number;
}

export class MaintenanceOrderDto {
  @ApiPropertyOptional() readonly vesselName?: string;
  @ApiPropertyOptional() readonly vesselRegistryNumber?: string;
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ format: 'uuid' }) readonly vesselId!: string;
  @ApiProperty() readonly title!: string;
  @ApiProperty({ enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'] })
  readonly category!: string;
  @ApiProperty({ enum: ['LOW', 'NORMAL', 'HIGH'] }) readonly priority!: string;
  @ApiProperty({
    enum: ['OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED'],
  })
  readonly status!: string;
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
  @ApiProperty({ type: MaintenanceAssigneeDto, nullable: true })
  readonly assignee!: MaintenanceAssigneeDto | null;
  @ApiProperty({ type: String, format: 'date', nullable: true }) readonly targetDate!:
    string | null;
  @ApiProperty() readonly revision!: number;
  @ApiProperty({ format: 'date-time' }) readonly createdAt!: string;
  @ApiProperty({ format: 'date-time' }) readonly updatedAt!: string;
}

export class MaintenanceQueryDto extends MaintenancePaginationDto {
  @ApiPropertyOptional({
    enum: ['OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED'])
  readonly status?:
    'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'CLOSED' | 'CANCELLED';
  @ApiPropertyOptional({ enum: ['LOW', 'NORMAL', 'HIGH'] })
  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  readonly priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export class MaintenancePageDto {
  @ApiProperty({ type: [MaintenanceOrderDto] })
  readonly items!: readonly MaintenanceOrderDto[];
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly totalPages!: number;
}
