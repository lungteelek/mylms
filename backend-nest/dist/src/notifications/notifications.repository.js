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
exports.NotificationsRepository = void 0;
const common_1 = require("@nestjs/common");
const lms_client_1 = require("../../../backend/generated/lms-client");
const prisma_service_1 = require("../prisma/prisma.service");
function normalizeId(value) {
    return typeof value === 'bigint' ? value.toString() : String(value);
}
let NotificationsRepository = class NotificationsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listStudyPlanItems(studyPlanId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        spi.id,
        spi.lesson_node_id,
        ln.title AS lesson_title,
        spi.scheduled_start_at,
        spi.planned_minutes
      FROM study_plan_items spi
      JOIN lesson_nodes ln ON ln.id = spi.lesson_node_id
      WHERE spi.study_plan_id = ${BigInt(studyPlanId)}
      ORDER BY spi.scheduled_start_at ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            lessonNodeId: normalizeId(row.lesson_node_id),
            lessonTitle: row.lesson_title,
            scheduledStartAt: row.scheduled_start_at,
            plannedMinutes: Number(row.planned_minutes),
        }));
    }
    async deleteScheduledStudyReminders(userId, studyPlanId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      DELETE FROM notifications
      WHERE user_id = ${BigInt(userId)}
        AND type = 'study_reminder'
        AND payload_json ->> 'studyPlanId' = ${studyPlanId}
        AND status = 'scheduled'
    `);
    }
    async createNotification(input) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO notifications (
        user_id, type, title, body, payload_json, scheduled_at, status, created_at
      )
      VALUES (
        ${BigInt(input.userId)},
        ${input.type},
        ${input.title},
        ${input.body},
        ${JSON.stringify(input.payload)}::jsonb,
        ${input.scheduledAt}::timestamptz,
        'scheduled',
        now()
      )
      RETURNING id
    `);
        return normalizeId(rows[0].id);
    }
    async listDueNotifications(limit = 100) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT n.id, n.user_id, u.email, n.type, n.title, n.body, n.payload_json, n.scheduled_at
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT ${limit}
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            userId: normalizeId(row.user_id),
            email: row.email,
            type: row.type,
            title: row.title,
            body: row.body,
            payload: row.payload_json,
            scheduledAt: row.scheduled_at?.toISOString() ?? null,
        }));
    }
    async markNotificationDelivered(notificationId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE notifications
      SET status = 'delivered', sent_at = now()
      WHERE id = ${BigInt(notificationId)}
    `);
    }
    async markNotificationRead(userId, notificationId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      UPDATE notifications
      SET status = 'read',
          read_at = now()
      WHERE id = ${BigInt(notificationId)}
        AND user_id = ${BigInt(userId)}
      RETURNING id
    `);
        return rows.length > 0 ? normalizeId(rows[0].id) : null;
    }
    async markNotificationFailed(notificationId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE notifications
      SET status = 'failed'
      WHERE id = ${BigInt(notificationId)}
    `);
    }
    async markNotificationSent(notificationId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE notifications
      SET status = 'sent', sent_at = now()
      WHERE id = ${BigInt(notificationId)}
    `);
    }
    async upsertDevice(input) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO notification_devices (
        user_id,
        platform,
        push_token,
        device_name,
        last_seen_at,
        created_at
      )
      VALUES (
        ${BigInt(input.userId)},
        ${input.platform},
        ${input.pushToken},
        ${input.deviceName ?? null},
        now(),
        now()
      )
      ON CONFLICT (platform, push_token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        device_name = COALESCE(EXCLUDED.device_name, notification_devices.device_name),
        last_seen_at = now()
      RETURNING id
    `);
        return normalizeId(rows[0].id);
    }
    async deleteDevice(userId, platform, pushToken) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      DELETE FROM notification_devices
      WHERE user_id = ${BigInt(userId)}
        AND platform = ${platform}
        AND push_token = ${pushToken}
      RETURNING id
    `);
        return rows.length > 0 ? normalizeId(rows[0].id) : null;
    }
    async listActiveDeviceTokens(userId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT push_token, platform
      FROM notification_devices
      WHERE user_id = ${BigInt(userId)}
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
    `);
        return rows.map((row) => ({
            token: row.push_token,
            platform: row.platform,
        }));
    }
    async listInbox(userId, limit = 20) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, type, title, body, payload_json, scheduled_at, sent_at, read_at, status, created_at
      FROM notifications
      WHERE user_id = ${BigInt(userId)}
      ORDER BY COALESCE(sent_at, scheduled_at, created_at) DESC
      LIMIT ${limit}
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            type: row.type,
            title: row.title,
            body: row.body,
            payload: row.payload_json,
            scheduledAt: row.scheduled_at?.toISOString() ?? null,
            sentAt: row.sent_at?.toISOString() ?? null,
            readAt: row.read_at?.toISOString() ?? null,
            status: row.status,
            createdAt: row.created_at.toISOString(),
        }));
    }
};
exports.NotificationsRepository = NotificationsRepository;
exports.NotificationsRepository = NotificationsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsRepository);
