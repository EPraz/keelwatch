import { ApiProperty } from '@nestjs/swagger';
import { ASSIGNMENT_ROLES, type AssignmentRole } from '../domain/assignment';
import { QUALIFICATION_KINDS, type QualificationKind } from '../domain/qualification';
import {
  EVALUATION_STATUSES,
  type EvaluationStatus,
} from '../domain/requirement-evaluation';

class CoverageGapDto {
  @ApiProperty({ format: 'date' }) readonly startsOn!: string;
  @ApiProperty({ format: 'date' }) readonly endsOn!: string;
}
class RequirementResultDto {
  @ApiProperty({ enum: QUALIFICATION_KINDS }) readonly kind!: QualificationKind;
  @ApiProperty() readonly kindLabel!: string;
  @ApiProperty({ enum: EVALUATION_STATUSES }) readonly status!: EvaluationStatus;
  @ApiProperty({
    enum: ['NO_RECORDS', 'COVERAGE_GAP', 'COVERAGE_ENDING_SOON', 'FULL_PERIOD_COVERED'],
  })
  readonly reasonCode!: string;
  @ApiProperty() readonly reason!: string;
  @ApiProperty({ type: CoverageGapDto, nullable: true })
  readonly firstGap!: CoverageGapDto | null;
  @ApiProperty({ type: String, format: 'date', nullable: true })
  readonly coverageEndsOn!: string | null;
}
export class RequirementEvaluationDto {
  @ApiProperty({ format: 'uuid' }) readonly vesselId!: string;
  @ApiProperty({ format: 'uuid' }) readonly crewMemberId!: string;
  @ApiProperty() readonly crewNumber!: string;
  @ApiProperty() readonly displayName!: string;
  @ApiProperty({ enum: ASSIGNMENT_ROLES }) readonly role!: AssignmentRole;
  @ApiProperty({ format: 'date' }) readonly startsOn!: string;
  @ApiProperty({ format: 'date' }) readonly endsOn!: string;
  @ApiProperty({ format: 'date-time' }) readonly consultedAt!: string;
  @ApiProperty({ enum: EVALUATION_STATUSES }) readonly status!: EvaluationStatus;
  @ApiProperty({ type: [RequirementResultDto] })
  readonly requirements!: readonly RequirementResultDto[];
}
