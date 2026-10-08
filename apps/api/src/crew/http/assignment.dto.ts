import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import {
  ASSIGNMENT_ROLES,
  CANCELLATION_REASONS,
  type AssignmentRole,
  type CancellationReason,
} from '../domain/assignment';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'KW-C-000001', pattern: '^KW-C-[0-9]{6}$' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^KW-C-[0-9]{6}$/u)
  readonly crewNumber!: string;
  @ApiProperty({ enum: ASSIGNMENT_ROLES })
  @IsIn(ASSIGNMENT_ROLES)
  readonly role!: AssignmentRole;
  @ApiProperty({ format: 'date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  readonly startsOn!: string;
  @ApiProperty({ format: 'date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  readonly endsOn!: string;
}
export class CancelAssignmentDto {
  @ApiProperty({ enum: CANCELLATION_REASONS })
  @IsIn(CANCELLATION_REASONS)
  readonly reason!: CancellationReason;
}
class AssignmentCancellationDto {
  @ApiProperty({ enum: CANCELLATION_REASONS }) readonly reason!: CancellationReason;
  @ApiProperty() readonly reasonLabel!: string;
  @ApiProperty({ format: 'date-time' }) readonly cancelledAt!: string;
}
export class AssignmentResponseDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ format: 'uuid' }) readonly crewMemberId!: string;
  @ApiProperty() readonly crewNumber!: string;
  @ApiProperty() readonly displayName!: string;
  @ApiProperty({ enum: ASSIGNMENT_ROLES }) readonly role!: AssignmentRole;
  @ApiProperty() readonly roleLabel!: string;
  @ApiProperty({ format: 'date' }) readonly startsOn!: string;
  @ApiProperty({ format: 'date' }) readonly endsOn!: string;
  @ApiProperty({ format: 'date-time' }) readonly createdAt!: string;
  @ApiProperty({ enum: ['SCHEDULED', 'CURRENT', 'ENDED', 'CANCELLED'] })
  readonly status!: string;
  @ApiProperty({ format: 'date' }) readonly asOf!: string;
  @ApiProperty({ type: AssignmentCancellationDto, nullable: true })
  readonly cancellation!: AssignmentCancellationDto | null;
}
class AssignmentVesselDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly name!: string;
  @ApiProperty() readonly registryNumber!: string;
  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] }) readonly status!: string;
}
export class AssignmentWorkspaceDto {
  @ApiProperty({ type: AssignmentVesselDto }) readonly vessel!: AssignmentVesselDto;
  @ApiProperty({ type: [AssignmentResponseDto] })
  readonly items!: readonly AssignmentResponseDto[];
  @ApiProperty({ format: 'date' }) readonly asOf!: string;
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly totalPages!: number;
}
