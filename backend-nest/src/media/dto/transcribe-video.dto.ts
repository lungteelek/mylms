import { IsOptional, IsString } from 'class-validator';

export class TranscribeVideoDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  sourceText?: string;

  @IsOptional()
  @IsString()
  audioFilePath?: string;
}
