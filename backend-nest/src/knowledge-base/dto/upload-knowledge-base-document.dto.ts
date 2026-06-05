import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadKnowledgeBaseDocumentDto {
  @IsOptional()
  @IsString()
  lessonNodeId?: string;

  @IsIn(['pdf', 'docx', 'slide', 'transcript', 'note', 'html'])
  sourceType!: 'pdf' | 'docx' | 'slide' | 'transcript' | 'note' | 'html';

  @IsString()
  title!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  extractedText?: string;
}
