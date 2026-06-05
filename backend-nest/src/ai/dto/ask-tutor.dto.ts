import { IsOptional, IsString } from 'class-validator';

export class AskTutorDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonNodeId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  question!: string;
}
