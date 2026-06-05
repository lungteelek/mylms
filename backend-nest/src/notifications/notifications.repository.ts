import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../backend/generated/lms-client';
import { PrismaService } from '../prisma/prisma.service';

type RawId = bigint | number | string;

function normalizeId(value: RawId): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listStudyPlanItems(studyPlanId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        lesson_node_id: RawId;
        lesson_title: string;
        scheduled_start_at: Date;
        planned_minutes: number;
      }>
    >(Prisma.sql`
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

  async deleteScheduledStudyReminders(userId: string, studyPlanId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM notifications
      WHERE user_id = ${BigInt(userId)}
        AND type = 'study_reminder'
        AND payload_json ->> 'studyPlanId' = ${studyPlanId}
        AND status = 'scheduled'
    `);
  }

  async createNotification(input: {
    userId: string;
    type: 'study_reminder';
    title: string;
    body: string;
    payload: Record<string, unknown>;
    scheduledAt: string;
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        user_id: RawId;
        email: string | null;
        type: string;
        title: string;
        body: string;
        payload_json: unknown;
        scheduled_at: Date | null;
      }>
    >(Prisma.sql`
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

  async markNotificationDelivered(notificationId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE notifications
      SET status = 'delivered', sent_at = now()
      WHERE id = ${BigInt(notificationId)}
    `);
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      UPDATE notifications
      SET status = 'read',
          read_at = now()
      WHERE id = ${BigInt(notificationId)}
        AND user_id = ${BigInt(userId)}
      RETURNING id
    `);

    return rows.length > 0 ? normalizeId(rows[0].id) : null;
  }

  async markNotificationFailed(notificationId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE notifications
      SET status = 'failed'
      WHERE id = ${BigInt(notificationId)}
    `);
  }

  async markNotificationSent(notificationId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE notifications
      SET status = 'sent', sent_at = now()
      WHERE id = ${BigInt(notificationId)}
    `);
  }

  async upsertDevice(input: {
    userId: string;
    platform: string;
    pushToken: string;
    deviceName?: string;
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

  async deleteDevice(userId: string, platform: string, pushToken: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      DELETE FROM notification_devices
      WHERE user_id = ${BigInt(userId)}
        AND platform = ${platform}
        AND push_token = ${pushToken}
      RETURNING id
    `);

    return rows.length > 0 ? normalizeId(rows[0].id) : null;
  }

  async listActiveDeviceTokens(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ push_token: string; platform: string }>>(Prisma.sql`
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

  async listInbox(userId: string, limit = 20) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        type: string;
        title: string;
        body: string;
        payload_json: unknown;
        scheduled_at: Date | null;
        sent_at: Date | null;
        read_at: Date | null;
        status: string;
        created_at: Date;
      }>
    >(Prisma.sql`
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
}
