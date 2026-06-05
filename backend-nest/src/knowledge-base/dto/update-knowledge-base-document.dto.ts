import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateKnowledgeBaseDocumentDto {
  @IsOptional()
  @IsString()
  lessonNodeId?: string;

  @IsOptional()
  @IsIn(['pdf', 'docx', 'slide', 'transcript', 'note', 'html'])
  sourceType?: 'pdf' | 'docx' | 'slide' | 'transcript' | 'note' | 'html';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  extractedText?: string;
}
