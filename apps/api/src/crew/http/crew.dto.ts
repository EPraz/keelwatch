import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCrewDto {
  @ApiProperty({ example: 'Jordan Vale', minLength: 2, maxLength: 120 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  readonly displayName!: string;

  @ApiProperty({ example: 'KW-C-000001', pattern: '^KW-C-[0-9]{6}$' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^KW-C-[0-9]{6}$/u, { message: 'Use the demo format KW-C-######.' })
  readonly crewNumber!: string;
}

export class CrewQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  readonly page: number = 1;
}

export class CrewMemberResponseDto {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly displayName!: string;
  @ApiProperty() readonly crewNumber!: string;
  @ApiProperty({ format: 'date-time' }) readonly createdAt!: string;
}

export class CrewPageResponseDto {
  @ApiProperty({ type: [CrewMemberResponseDto] })
  readonly items!: readonly CrewMemberResponseDto[];
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly pageSize!: number;
  @ApiProperty() readonly totalPages!: number;
}
