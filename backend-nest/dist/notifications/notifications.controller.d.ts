import { RequestContext } from '../common/types/request-context.type';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationDevicePlatform, RegisterNotificationDeviceDto } from './dto/register-notification-device.dto';
import { NotificationsService } from './notifications.service';
import { QueueBridgeService } from '../jobs/queue-bridge.service';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly queueBridgeService;
    constructor(notificationsService: NotificationsService, queueBridgeService: QueueBridgeService);
    getInbox(user: RequestContext, query: ListNotificationsDto): Promise<{
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
    registerDevice(user: RequestContext, body: RegisterNotificationDeviceDto): Promise<{
        data: {
            id: string;
            platform: "web" | "ios" | "android" | "line" | "telegram";
            pushToken: string;
            deviceName: string | null;
        };
    }>;
    unregisterDevice(user: RequestContext, platform: NotificationDevicePlatform, pushToken: string): Promise<{
        data: {
            removed: boolean;
        };
    }>;
    markAsRead(user: RequestContext, notificationId: string): Promise<{
        data: {
            id: string | null;
            read: boolean;
        };
    }>;
    dispatchNow(): Promise<{
        queue: string;
        jobName: "dispatch-notifications";
    }>;
}
