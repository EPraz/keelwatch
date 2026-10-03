import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeRegistryNumber({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateVesselDto {
  @ApiProperty({ example: 'MV Northwind', minLength: 2, maxLength: 120 })
  @Transform(trimString)
  @IsString({ message: 'Enter a vessel name.' })
  @MinLength(2, { message: 'Name must contain at least 2 characters.' })
  @MaxLength(120, { message: 'Name must contain at most 120 characters.' })
  readonly name!: string;

  @ApiProperty({ example: 'KW-000001', pattern: '^KW-[0-9]{6}$' })
  @Transform(normalizeRegistryNumber)
  @IsString({ message: 'Enter a registry number.' })
  @Matches(/^KW-[0-9]{6}$/u, {
    message: 'Use the demo format KW-######.',
  })
  readonly registryNumber!: string;
}
