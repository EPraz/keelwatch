import { Transform, type TransformFnParams } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  QUALIFICATION_KINDS,
  type QualificationKind,
  type QualificationStatus,
} from '../domain/qualification';
import { CrewMemberResponseDto } from './crew.dto';

export class RecordQualificationDto {
  @ApiProperty({ enum: QUALIFICATION_KINDS })
  @IsIn(QUALIFICATION_KINDS)
  readonly kind!: QualificationKind;

  @ApiProperty({ example: 'KW-Q-000001', pattern: '^KW-Q-[0-9]{6}$' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^KW-Q-[0-9]{6}$/u)
  readonly referenceNumber!: string;

  @ApiProperty({ format: 'date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  readonly validFrom!: string;

  @ApiProperty({ format: 'date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  readonly expiresOn!: string;
}

export class QualificationResponseDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ enum: QUALIFICATION_KINDS }) readonly kind!: QualificationKind;
  @ApiProperty() readonly kindLabel!: string;
  @ApiProperty() readonly referenceNumber!: string;
  @ApiProperty({ format: 'date' }) readonly validFrom!: string;
  @ApiProperty({ format: 'date' }) readonly expiresOn!: string;
  @ApiProperty({ format: 'date-time' }) readonly createdAt!: string;
  @ApiProperty({ enum: ['NOT_YET_VALID', 'EXPIRED', 'EXPIRING_SOON', 'VALID'] })
  readonly status!: QualificationStatus;
  @ApiProperty() readonly reason!: string;
  @ApiProperty({ format: 'date' }) readonly asOf!: string;
}
export class QualificationWorkspaceDto {
  @ApiProperty({ type: CrewMemberResponseDto }) readonly member!: CrewMemberResponseDto;
  @ApiProperty({ type: [QualificationResponseDto] })
  readonly items!: readonly QualificationResponseDto[];
  @ApiProperty({ format: 'date' }) readonly asOf!: string;
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly totalPages!: number;
}
