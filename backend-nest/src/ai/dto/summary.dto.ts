import { IsIn, IsOptional, IsString } from 'class-validator';

export class SummaryDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonNodeId?: string;

  @IsOptional()
  @IsIn(['bullet', 'paragraph'])
  format?: 'bullet' | 'paragraph';
}
