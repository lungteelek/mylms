import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReplanDto {
  @IsString()
  courseId!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  goalCompletionDate?: string;
}
