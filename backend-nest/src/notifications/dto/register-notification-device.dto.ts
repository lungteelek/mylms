import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const NOTIFICATION_DEVICE_PLATFORMS = ['web', 'ios', 'android', 'line', 'telegram'] as const;
export type NotificationDevicePlatform = (typeof NOTIFICATION_DEVICE_PLATFORMS)[number];

export class RegisterNotificationDeviceDto {
  @IsIn(NOTIFICATION_DEVICE_PLATFORMS)
  platform!: NotificationDevicePlatform;

  @IsString()
  @MinLength(3)
  @MaxLength(2048)
  pushToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;
}
