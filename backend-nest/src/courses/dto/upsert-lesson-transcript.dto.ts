import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertLessonTranscriptDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsIn(['ready', 'processing', 'failed', 'uploading'])
  status?: 'ready' | 'processing' | 'failed' | 'uploading';

  @IsOptional()
  @IsString()
  fullText?: string;

  @IsArray()
  segments!: Array<{
    seek: string;
    progress: number;
    text: string;
  }>;
}
