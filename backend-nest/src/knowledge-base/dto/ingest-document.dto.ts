import { IsOptional, IsString } from 'class-validator';

export class IngestDocumentDto {
  @IsOptional()
  @IsString()
  fileText?: string;

  @IsOptional()
  @IsString()
  localFilePath?: string;
}
