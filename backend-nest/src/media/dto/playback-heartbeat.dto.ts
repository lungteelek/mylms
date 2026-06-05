import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PlaybackHeartbeatDto {
  @IsString()
  videoAssetId!: string;

  @IsString()
  courseId!: string;

  @IsString()
  lessonNodeId!: string;

  @IsInt()
  @Min(0)
  positionSeconds!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5)
  speed?: number;

  @IsOptional()
  @IsString()
  deviceType?: string;
}
