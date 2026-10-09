import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ASSIGNMENT_ROLES, type AssignmentRole } from '../domain/assignment';
import { CrewQueryDto } from './crew.dto';
import { RequirementEvaluationDto } from './requirement-evaluation.dto';

export class CompositionQueryDto extends CrewQueryDto {
  @ApiPropertyOptional({
    format: 'date',
    description:
      'Defaults to server UTC today. Inclusive plan membership, not historical approval.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  readonly date?: string;
  @ApiPropertyOptional({ enum: ASSIGNMENT_ROLES })
  @IsOptional()
  @IsIn(ASSIGNMENT_ROLES)
  readonly role?: AssignmentRole;
}
class CompositionVesselDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] }) readonly status!: string;
}
class CompositionItemDto extends RequirementEvaluationDto {
  @ApiProperty({ format: 'uuid' }) readonly assignmentId!: string;
  @ApiProperty() readonly roleLabel!: string;
}
export class CompositionPageDto {
  @ApiProperty({ type: CompositionVesselDto }) readonly vessel!: CompositionVesselDto;
  @ApiProperty({ format: 'date' }) readonly date!: string;
  @ApiProperty({ type: String, enum: ASSIGNMENT_ROLES, nullable: true })
  readonly role!: AssignmentRole | null;
  @ApiProperty({ format: 'date-time' }) readonly consultedAt!: string;
  @ApiProperty({ type: [CompositionItemDto] })
  readonly items!: readonly CompositionItemDto[];
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly totalPages!: number;
}
