import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsIn(['course_only', 'tenant_wide'])
  visibility?: 'course_only' | 'tenant_wide';
}
