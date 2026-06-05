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
exports.MediaRepository = void 0;
const common_1 = require("@nestjs/common");
const lms_client_1 = require("../../../backend/generated/lms-client");
const prisma_service_1 = require("../prisma/prisma.service");
function normalizeId(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return typeof value === 'bigint' ? value.toString() : String(value);
}
let MediaRepository = class MediaRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getVideoAsset(tenantId, videoAssetId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
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
            throw new common_1.NotFoundException('Video asset not found');
        }
        return {
            id: normalizeId(rows[0].id),
            lessonNodeId: normalizeId(rows[0].lesson_node_id),
            status: rows[0].status,
            playbackId: rows[0].playback_id,
            title: rows[0].title,
            plainText: rows[0].plain_text,
            htmlContent: rows[0].html_content,
        };
    }
    async replaceTranscript(videoAssetId, language, fullText, segments) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.$queryRaw(lms_client_1.Prisma.sql `
        SELECT id
        FROM video_transcripts
        WHERE video_asset_id = ${BigInt(videoAssetId)}
        ORDER BY created_at DESC
        LIMIT 1
      `);
            if (existing[0]) {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
          DELETE FROM transcript_segments
          WHERE transcript_id = ${BigInt(normalizeId(existing[0].id))}
        `);
                await tx.$executeRaw(lms_client_1.Prisma.sql `
          DELETE FROM video_transcripts
          WHERE id = ${BigInt(normalizeId(existing[0].id))}
        `);
            }
            const transcriptRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        INSERT INTO video_transcripts (video_asset_id, language, source, status, full_text, created_at)
        VALUES (${BigInt(videoAssetId)}, ${language}, 'ai', 'ready', ${fullText}, now())
        RETURNING id
      `);
            const transcriptId = normalizeId(transcriptRows[0].id);
            for (const segment of segments) {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
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
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        UPDATE video_assets
        SET status = 'ready', updated_at = now()
        WHERE id = ${BigInt(videoAssetId)}
      `);
            return transcriptId;
        });
    }
    async getTranscript(tenantId, videoAssetId) {
        const transcriptRows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT vt.id AS transcript_id, vt.language, vt.full_text
      FROM video_transcripts vt
      JOIN video_assets va ON va.id = vt.video_asset_id
      JOIN lesson_nodes ln ON ln.id = va.lesson_node_id
      WHERE ln.tenant_id = ${BigInt(tenantId)} AND vt.video_asset_id = ${BigInt(videoAssetId)}
      ORDER BY vt.created_at DESC
      LIMIT 1
    `);
        if (!transcriptRows[0]) {
            throw new common_1.NotFoundException('Transcript not found');
        }
        const transcriptId = normalizeId(transcriptRows[0].transcript_id);
        const segments = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
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
                id: normalizeId(segment.id),
                startMs: Number(segment.start_ms),
                endMs: Number(segment.end_ms),
                text: segment.text,
                segmentIndex: Number(segment.segment_index),
            })),
        };
    }
    async recordPlaybackHeartbeat(input) {
        await this.prisma.$transaction(async (tx) => {
            const enrollmentRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        SELECT id
        FROM enrollments
        WHERE tenant_id = ${BigInt(input.tenantId)}
          AND course_id = ${BigInt(input.courseId)}
          AND user_id = ${BigInt(input.userId)}
        LIMIT 1
      `);
            const enrollmentId = enrollmentRows[0] ? normalizeId(enrollmentRows[0].id) : null;
            const playbackRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        SELECT id
        FROM playback_sessions
        WHERE user_id = ${BigInt(input.userId)} AND video_asset_id = ${BigInt(input.videoAssetId)} AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      `);
            if (playbackRows[0]) {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
          UPDATE playback_sessions
          SET last_position_seconds = ${input.positionSeconds}, speed = ${input.speed}, device_type = ${input.deviceType ?? null}
          WHERE id = ${BigInt(normalizeId(playbackRows[0].id))}
        `);
            }
            else {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
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
                const progressRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
          SELECT id
          FROM lesson_progress
          WHERE enrollment_id = ${BigInt(enrollmentId)} AND lesson_node_id = ${BigInt(input.lessonNodeId)}
          LIMIT 1
        `);
                if (progressRows[0]) {
                    await tx.$executeRaw(lms_client_1.Prisma.sql `
            UPDATE lesson_progress
            SET
              status = CASE WHEN ${input.positionSeconds} > 0 THEN 'in_progress' ELSE status END,
              last_position_seconds = ${input.positionSeconds},
              last_viewed_at = now()
            WHERE id = ${BigInt(normalizeId(progressRows[0].id))}
          `);
                }
                else {
                    await tx.$executeRaw(lms_client_1.Prisma.sql `
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
};
exports.MediaRepository = MediaRepository;
exports.MediaRepository = MediaRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MediaRepository);
