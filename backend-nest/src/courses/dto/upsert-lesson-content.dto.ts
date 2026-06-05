import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertLessonContentDto {
  @IsIn(['video', 'article', 'pdf', 'external_link', 'mixed'])
  contentType!: 'video' | 'article' | 'pdf' | 'external_link' | 'mixed';

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  plainText?: string;
}
