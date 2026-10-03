import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class UpdateVesselDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Name must be text.' })
  @Length(2, 120, {
    message: 'Name must contain between 2 and 120 characters.',
  })
  readonly name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Registry number must be text.' })
  @Matches(/^KW-[0-9]{6}$/u, { message: 'Use the demo format KW-######.' })
  readonly registryNumber!: string;
}
