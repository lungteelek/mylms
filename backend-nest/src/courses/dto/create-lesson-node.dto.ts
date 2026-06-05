import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLessonNodeDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsIn(['section', 'lesson', 'quiz', 'assignment'])
  nodeType!: 'section' | 'lesson' | 'quiz' | 'assignment';

  @IsString()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;
}
