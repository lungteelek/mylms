import { IsInt, IsString, Min } from 'class-validator';

export class CreateVideoUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
