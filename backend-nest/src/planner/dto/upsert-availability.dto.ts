import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsInt()
  @Min(0)
  startMinute!: number;

  @IsInt()
  @Min(1)
  endMinute!: number;

  @IsInt()
  @Min(1)
  preferredMinutes!: number;
}

export class UpsertAvailabilityDto {
  @IsString()
  timezone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}
