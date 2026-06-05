import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GenerateStudyPlanDto {
  @IsString()
  courseId!: string;

  @IsDateString()
  goalCompletionDate!: string;

  @IsOptional()
  @IsString()
  strategy?: string;
}
