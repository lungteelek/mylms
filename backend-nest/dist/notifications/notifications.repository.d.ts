import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listStudyPlanItems(studyPlanId: string): Promise<{
        id: string;
        lessonNodeId: string;
        lessonTitle: string;
        scheduledStartAt: Date;
        plannedMinutes: number;
    }[]>;
    deleteScheduledStudyReminders(userId: string, studyPlanId: string): Promise<void>;
    createNotification(input: {
        userId: string;
        type: 'study_reminder';
        title: string;
        body: string;
        payload: Record<string, unknown>;
        scheduledAt: string;
    }): Promise<string>;
    listDueNotifications(limit?: number): Promise<{
        id: string;
        userId: string;
        email: string | null;
        type: string;
        title: string;
        body: string;
        payload: unknown;
        scheduledAt: string | null;
    }[]>;
    markNotificationDelivered(notificationId: string): Promise<void>;
    markNotificationRead(userId: string, notificationId: string): Promise<string | null>;
    markNotificationFailed(notificationId: string): Promise<void>;
    markNotificationSent(notificationId: string): Promise<void>;
    upsertDevice(input: {
        userId: string;
        platform: string;
        pushToken: string;
        deviceName?: string;
    }): Promise<string>;
    deleteDevice(userId: string, platform: string, pushToken: string): Promise<string | null>;
    listActiveDeviceTokens(userId: string): Promise<{
        token: string;
        platform: string;
    }[]>;
    listInbox(userId: string, limit?: number): Promise<{
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
    }[]>;
}
