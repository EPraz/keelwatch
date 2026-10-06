import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ComplianceStatus } from '../domain/certificate';

const STATUSES: readonly ComplianceStatus[] = [
  'MISSING',
  'EXPIRED',
  'EXPIRING_SOON',
  'VALID',
];

export class ListComplianceQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be a whole number.' })
  @Min(1, { message: 'Page must be at least 1.' })
  readonly page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be a whole number.' })
  @Min(1, { message: 'Page size must be at least 1.' })
  @Max(100, { message: 'Page size must be at most 100.' })
  readonly pageSize: number = 20;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES, { message: 'Status must be a supported compliance status.' })
  readonly status?: ComplianceStatus;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(80)
  readonly search?: string;
}
