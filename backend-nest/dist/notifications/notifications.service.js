"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const email_provider_1 = require("./email.provider");
const line_provider_1 = require("./line.provider");
const notifications_repository_1 = require("./notifications.repository");
const push_provider_1 = require("./push.provider");
const telegram_provider_1 = require("./telegram.provider");
let NotificationsService = class NotificationsService {
    constructor(notificationsRepository, emailProvider, pushProvider, lineProvider, telegramProvider) {
        this.notificationsRepository = notificationsRepository;
        this.emailProvider = emailProvider;
        this.pushProvider = pushProvider;
        this.lineProvider = lineProvider;
        this.telegramProvider = telegramProvider;
    }
    async scheduleStudyPlanReminders(userId, studyPlanId) {
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
            }
            catch (error) {
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
    async getInbox(userId, limit) {
        const items = await this.notificationsRepository.listInbox(userId, limit ?? 20);
        return {
            data: {
                items,
            },
        };
    }
    async registerDevice(userId, input) {
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
    async unregisterDevice(userId, platform, pushToken) {
        const removedId = await this.notificationsRepository.deleteDevice(userId, platform, pushToken);
        return {
            data: {
                removed: removedId !== null,
            },
        };
    }
    async markAsRead(userId, notificationId) {
        const id = await this.notificationsRepository.markNotificationRead(userId, notificationId);
        return {
            data: {
                id,
                read: id !== null,
            },
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_repository_1.NotificationsRepository,
        email_provider_1.EmailProvider,
        push_provider_1.PushProvider,
        line_provider_1.LineProvider,
        telegram_provider_1.TelegramProvider])
], NotificationsService);
