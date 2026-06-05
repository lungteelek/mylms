import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLessonAssetDto {
  @IsIn(['pdf', 'link', 'image', 'attachment'])
  assetType!: 'pdf' | 'link' | 'image' | 'attachment';

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
