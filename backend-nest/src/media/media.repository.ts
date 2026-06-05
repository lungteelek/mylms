import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../backend/generated/lms-client';
import { PrismaService } from '../prisma/prisma.service';

type RawId = bigint | number | string;

function normalizeId(value: RawId | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'bigint' ? value.toString() : String(value);
}

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getVideoAsset(tenantId: string, videoAssetId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        lesson_node_id: RawId;
        status: string;
        playback_id: string | null;
        title: string;
        plain_text: string | null;
        html_content: string | null;
      }>
    >(Prisma.sql`
      SELECT
        va.id,
        va.lesson_node_id,
        va.status,
        va.playback_id,
        ln.title,
        lc.plain_text,
        lc.html_content
      FROM video_assets va
      JOIN lesson_nodes ln ON ln.id = va.lesson_node_id
      LEFT JOIN lesson_contents lc ON lc.lesson_node_id = ln.id
      WHERE ln.tenant_id = ${BigInt(tenantId)} AND va.id = ${BigInt(videoAssetId)}
      ORDER BY lc.version DESC NULLS LAST
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Video asset not found');
    }

    return {
      id: normalizeId(rows[0].id)!,
      lessonNodeId: normalizeId(rows[0].lesson_node_id)!,
      status: rows[0].status,
      playbackId: rows[0].playback_id,
      title: rows[0].title,
      plainText: rows[0].plain_text,
      htmlContent: rows[0].html_content,
    };
  }

  async replaceTranscript(
    videoAssetId: string,
    language: string,
    fullText: string,
    segments: Array<{ startMs: number; endMs: number; text: string; segmentIndex: number }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
        SELECT id
        FROM video_transcripts
        WHERE video_asset_id = ${BigInt(videoAssetId)}
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (existing[0]) {
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM transcript_segments
          WHERE transcript_id = ${BigInt(normalizeId(existing[0].id)!)}
        `);
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM video_transcripts
          WHERE id = ${BigInt(normalizeId(existing[0].id)!)}
        `);
      }

      const transcriptRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
        INSERT INTO video_transcripts (video_asset_id, language, source, status, full_text, created_at)
        VALUES (${BigInt(videoAssetId)}, ${language}, 'ai', 'ready', ${fullText}, now())
        RETURNING id
      `);

      const transcriptId = normalizeId(transcriptRows[0].id)!;

      for (const segment of segments) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO transcript_segments (transcript_id, start_ms, end_ms, text, segment_index)
          VALUES (
            ${BigInt(transcriptId)},
            ${segment.startMs},
            ${segment.endMs},
            ${segment.text},
            ${segment.segmentIndex}
          )
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE video_assets
        SET status = 'ready', updated_at = now()
        WHERE id = ${BigInt(videoAssetId)}
      `);

      return transcriptId;
    });
  }

  async getTranscript(tenantId: string, videoAssetId: string) {
    const transcriptRows = await this.prisma.$queryRaw<
      Array<{ transcript_id: RawId; language: string; full_text: string | null }>
    >(Prisma.sql`
      SELECT vt.id AS transcript_id, vt.language, vt.full_text
      FROM video_transcripts vt
      JOIN video_assets va ON va.id = vt.video_asset_id
      JOIN lesson_nodes ln ON ln.id = va.lesson_node_id
      WHERE ln.tenant_id = ${BigInt(tenantId)} AND vt.video_asset_id = ${BigInt(videoAssetId)}
      ORDER BY vt.created_at DESC
      LIMIT 1
    `);

    if (!transcriptRows[0]) {
      throw new NotFoundException('Transcript not found');
    }

    const transcriptId = normalizeId(transcriptRows[0].transcript_id)!;
    const segments = await this.prisma.$queryRaw<
      Array<{ id: RawId; start_ms: number; end_ms: number; text: string; segment_index: number }>
    >(Prisma.sql`
      SELECT id, start_ms, end_ms, text, segment_index
      FROM transcript_segments
      WHERE transcript_id = ${BigInt(transcriptId)}
      ORDER BY segment_index ASC
    `);

    return {
      transcriptId,
      language: transcriptRows[0].language,
      fullText: transcriptRows[0].full_text,
      segments: segments.map((segment) => ({
        id: normalizeId(segment.id)!,
        startMs: Number(segment.start_ms),
        endMs: Number(segment.end_ms),
        text: segment.text,
        segmentIndex: Number(segment.segment_index),
      })),
    };
  }

  async recordPlaybackHeartbeat(input: {
    userId: string;
    tenantId: string;
    courseId: string;
    lessonNodeId: string;
    videoAssetId: string;
    positionSeconds: number;
    speed: number;
    deviceType?: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const enrollmentRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
        SELECT id
        FROM enrollments
        WHERE tenant_id = ${BigInt(input.tenantId)}
          AND course_id = ${BigInt(input.courseId)}
          AND user_id = ${BigInt(input.userId)}
        LIMIT 1
      `);

      const enrollmentId = enrollmentRows[0] ? normalizeId(enrollmentRows[0].id)! : null;

      const playbackRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
        SELECT id
        FROM playback_sessions
        WHERE user_id = ${BigInt(input.userId)} AND video_asset_id = ${BigInt(input.videoAssetId)} AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      `);

      if (playbackRows[0]) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE playback_sessions
          SET last_position_seconds = ${input.positionSeconds}, speed = ${input.speed}, device_type = ${input.deviceType ?? null}
          WHERE id = ${BigInt(normalizeId(playbackRows[0].id)!)}
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO playback_sessions (
            user_id, video_asset_id, device_type, speed, started_at, last_position_seconds
          )
          VALUES (
            ${BigInt(input.userId)},
            ${BigInt(input.videoAssetId)},
            ${input.deviceType ?? null},
            ${input.speed},
            now(),
            ${input.positionSeconds}
          )
        `);
      }

      if (enrollmentId) {
        const progressRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
          SELECT id
          FROM lesson_progress
          WHERE enrollment_id = ${BigInt(enrollmentId)} AND lesson_node_id = ${BigInt(input.lessonNodeId)}
          LIMIT 1
        `);

        if (progressRows[0]) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE lesson_progress
            SET
              status = CASE WHEN ${input.positionSeconds} > 0 THEN 'in_progress' ELSE status END,
              last_position_seconds = ${input.positionSeconds},
              last_viewed_at = now()
            WHERE id = ${BigInt(normalizeId(progressRows[0].id)!)}
          `);
        } else {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO lesson_progress (
              enrollment_id, lesson_node_id, status, progress_percent, last_position_seconds, last_viewed_at
            )
            VALUES (
              ${BigInt(enrollmentId)},
              ${BigInt(input.lessonNodeId)},
              'in_progress',
              0,
              ${input.positionSeconds},
              now()
            )
          `);
        }
      }
    });
  }
}
