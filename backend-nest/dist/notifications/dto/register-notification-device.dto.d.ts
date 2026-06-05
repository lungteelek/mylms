export declare const NOTIFICATION_DEVICE_PLATFORMS: readonly ["web", "ios", "android", "line", "telegram"];
export type NotificationDevicePlatform = (typeof NOTIFICATION_DEVICE_PLATFORMS)[number];
export declare class RegisterNotificationDeviceDto {
    platform: NotificationDevicePlatform;
    pushToken: string;
    deviceName?: string;
}
