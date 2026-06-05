import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GenerateExercisesDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonNodeId?: string;

  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @IsInt()
  @Min(1)
  count!: number;

  @IsIn(['multiple_choice', 'short_answer'])
  type!: 'multiple_choice' | 'short_answer';
}
