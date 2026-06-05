import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider';
import { LineProvider } from './line.provider';
import { NotificationsRepository } from './notifications.repository';
import { PushProvider } from './push.provider';
import { TelegramProvider } from './telegram.provider';
import { NotificationDevicePlatform } from './dto/register-notification-device.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly emailProvider: EmailProvider,
    private readonly pushProvider: PushProvider,
    private readonly lineProvider: LineProvider,
    private readonly telegramProvider: TelegramProvider,
  ) {}

  async scheduleStudyPlanReminders(userId: string, studyPlanId: string) {
    const items = await this.notificationsRepository.listStudyPlanItems(studyPlanId);
    await this.notificationsRepository.deleteScheduledStudyReminders(userId, studyPlanId);

    let created = 0;
    for (const item of items) {
      const scheduledAt = new Date(item.scheduledStartAt.getTime() - 15 * 60 * 1000);
      await this.notificationsRepository.createNotification({
        userId,
        type: 'study_reminder',
        title: 'ถึงเวลาเรียนแล้ว',
        body: `อีก 15 นาทีจะถึงคิวเรียน: ${item.lessonTitle}`,
        payload: {
          studyPlanId,
          studyPlanItemId: item.id,
          lessonNodeId: item.lessonNodeId,
        },
        scheduledAt: scheduledAt.toISOString(),
      });
      created += 1;
    }

    return {
      studyPlanId,
      created,
    };
  }

  async dispatchDueNotifications(limit = 100) {
    const dueNotifications = await this.notificationsRepository.listDueNotifications(limit);
    let delivered = 0;
    let failed = 0;
    let emailed = 0;
    let pushed = 0;
    let lined = 0;
    let telegrammed = 0;

    for (const notification of dueNotifications) {
      try {
        const deviceTokens = await this.notificationsRepository.listActiveDeviceTokens(notification.userId);
        for (const device of deviceTokens) {
          if (device.platform === 'line') {
            const lineResult = await this.lineProvider.sendToUser({
              userId: device.token,
              text: `${notification.title}\n${notification.body}`,
            });
            if (lineResult.delivered) {
              lined += 1;
            }
            continue;
          }

          if (device.platform === 'telegram') {
            const telegramResult = await this.telegramProvider.sendMessage({
              chatId: device.token,
              text: `${notification.title}\n${notification.body}`,
            });
            if (telegramResult.delivered) {
              telegrammed += 1;
            }
            continue;
          }

          const pushResult = await this.pushProvider.sendToDevice({
            token: device.token,
            title: notification.title,
            body: notification.body,
            data: {
              notificationId: notification.id,
              type: notification.type,
            },
          });
          if (pushResult.delivered) {
            pushed += 1;
          }
        }

        if (notification.email) {
          const emailResult = await this.emailProvider.send({
            to: notification.email,
            subject: notification.title,
            text: notification.body,
          });

          if (emailResult.delivered) {
            await this.notificationsRepository.markNotificationSent(notification.id);
            emailed += 1;
          }
        }

        await this.notificationsRepository.markNotificationDelivered(notification.id);
        delivered += 1;
      } catch (error) {
        await this.notificationsRepository.markNotificationFailed(notification.id);
        failed += 1;
      }
    }

    return {
      data: {
        scanned: dueNotifications.length,
        delivered,
        pushed,
        lined,
        telegrammed,
        emailed,
        failed,
      },
    };
  }

  async getInbox(userId: string, limit?: number) {
    const items = await this.notificationsRepository.listInbox(userId, limit ?? 20);
    return {
      data: {
        items,
      },
    };
  }

  async registerDevice(
    userId: string,
    input: {
      platform: NotificationDevicePlatform;
      pushToken: string;
      deviceName?: string;
    },
  ) {
    const deviceId = await this.notificationsRepository.upsertDevice({
      userId,
      platform: input.platform,
      pushToken: input.pushToken,
      deviceName: input.deviceName,
    });

    return {
      data: {
        id: deviceId,
        platform: input.platform,
        pushToken: input.pushToken,
        deviceName: input.deviceName ?? null,
      },
    };
  }

  async unregisterDevice(userId: string, platform: NotificationDevicePlatform, pushToken: string) {
    const removedId = await this.notificationsRepository.deleteDevice(userId, platform, pushToken);
    return {
      data: {
        removed: removedId !== null,
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const id = await this.notificationsRepository.markNotificationRead(userId, notificationId);
    return {
      data: {
        id,
        read: id !== null,
      },
    };
  }
}
