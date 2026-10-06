import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDateString, IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeCode({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateCertificateDto {
  @ApiProperty({ example: 'SAFETY_EQUIPMENT' })
  @Transform(normalizeCode)
  @IsString({ message: 'Select a certificate type.' })
  @Matches(/^[A-Z][A-Z0-9_]{1,79}$/u, { message: 'Select a certificate type.' })
  readonly certificateTypeCode!: string;

  @ApiProperty({ example: 'SE-2026-0001', minLength: 1, maxLength: 80 })
  @Transform(trimString)
  @IsString({ message: 'Enter a certificate reference.' })
  @MinLength(1, { message: 'Enter a certificate reference.' })
  @MaxLength(80, { message: 'Reference must contain at most 80 characters.' })
  readonly referenceNumber!: string;

  @ApiProperty({ example: 'Northstar Safety Registry', minLength: 2, maxLength: 120 })
  @Transform(trimString)
  @IsString({ message: 'Enter an issuer.' })
  @MinLength(2, { message: 'Issuer must contain at least 2 characters.' })
  @MaxLength(120, { message: 'Issuer must contain at most 120 characters.' })
  readonly issuer!: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsString({ message: 'Enter issued on as a calendar date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/u, { message: 'Use YYYY-MM-DD.' })
  @IsDateString({ strict: true }, { message: 'Enter a valid calendar date.' })
  readonly issuedOn!: string;

  @ApiProperty({ example: '2027-09-01', format: 'date' })
  @IsString({ message: 'Enter expires on as a calendar date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/u, { message: 'Use YYYY-MM-DD.' })
  @IsDateString({ strict: true }, { message: 'Enter a valid calendar date.' })
  readonly expiresOn!: string;
}
