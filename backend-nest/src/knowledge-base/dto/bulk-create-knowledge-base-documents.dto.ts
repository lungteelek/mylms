import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

class BulkKnowledgeBaseDocumentItemDto {
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

export class BulkCreateKnowledgeBaseDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkKnowledgeBaseDocumentItemDto)
  documents!: BulkKnowledgeBaseDocumentItemDto[];
}
