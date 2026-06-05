import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLessonNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
