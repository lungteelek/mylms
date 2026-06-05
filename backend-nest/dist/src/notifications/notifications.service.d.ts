import { EmailProvider } from './email.provider';
import { LineProvider } from './line.provider';
import { NotificationsRepository } from './notifications.repository';
import { PushProvider } from './push.provider';
import { TelegramProvider } from './telegram.provider';
import { NotificationDevicePlatform } from './dto/register-notification-device.dto';
export declare class NotificationsService {
    private readonly notificationsRepository;
    private readonly emailProvider;
    private readonly pushProvider;
    private readonly lineProvider;
    private readonly telegramProvider;
    constructor(notificationsRepository: NotificationsRepository, emailProvider: EmailProvider, pushProvider: PushProvider, lineProvider: LineProvider, telegramProvider: TelegramProvider);
    scheduleStudyPlanReminders(userId: string, studyPlanId: string): Promise<{
        studyPlanId: string;
        created: number;
    }>;
    dispatchDueNotifications(limit?: number): Promise<{
        data: {
            scanned: number;
            delivered: number;
            pushed: number;
            lined: number;
            telegrammed: number;
            emailed: number;
            failed: number;
        };
    }>;
    getInbox(userId: string, limit?: number): Promise<{
        data: {
            items: {
                id: string;
                type: string;
                title: string;
                body: string;
                payload: unknown;
                scheduledAt: string | null;
                sentAt: string | null;
                readAt: string | null;
                status: string;
                createdAt: string;
            }[];
        };
    }>;
    registerDevice(userId: string, input: {
        platform: NotificationDevicePlatform;
        pushToken: string;
        deviceName?: string;
    }): Promise<{
        data: {
            id: string;
            platform: "web" | "ios" | "android" | "line" | "telegram";
            pushToken: string;
            deviceName: string | null;
        };
    }>;
    unregisterDevice(userId: string, platform: NotificationDevicePlatform, pushToken: string): Promise<{
        data: {
            removed: boolean;
        };
    }>;
    markAsRead(userId: string, notificationId: string): Promise<{
        data: {
            id: string | null;
            read: boolean;
        };
    }>;
}
