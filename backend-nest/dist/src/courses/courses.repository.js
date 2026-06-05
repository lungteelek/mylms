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
exports.CoursesRepository = void 0;
const common_1 = require("@nestjs/common");
const lms_client_1 = require("../../../backend/generated/lms-client");
const prisma_service_1 = require("../prisma/prisma.service");
function normalizeId(value) {
    return typeof value === 'bigint' ? value.toString() : String(value);
}
let CoursesRepository = class CoursesRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCourse(tenantId, body) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO courses (tenant_id, title, slug, description, subject, level, status, created_at, updated_at)
      VALUES (${BigInt(tenantId)}, ${body.title}, ${body.slug}, ${body.description ?? null}, ${body.subject ?? null}, ${body.level ?? null}, 'draft', now(), now())
      RETURNING id, title, slug, status
    `);
        return {
            id: normalizeId(rows[0].id),
            title: rows[0].title,
            slug: rows[0].slug,
            status: rows[0].status,
        };
    }
    async findCourseById(tenantId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, title, slug, status
      FROM courses
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
      LIMIT 1
    `);
        if (!rows[0]) {
            return null;
        }
        return {
            id: normalizeId(rows[0].id),
            title: rows[0].title,
            slug: rows[0].slug,
            status: rows[0].status,
        };
    }
    async listLessonNodes(tenantId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, parent_id, node_type, path::text as path, title, depth, sort_order, estimated_minutes, is_published
      FROM lesson_nodes
      WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)}
      ORDER BY path ASC, sort_order ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            parentId: row.parent_id ? normalizeId(row.parent_id) : null,
            nodeType: row.node_type,
            title: row.title,
            path: row.path,
            depth: Number(row.depth),
            sortOrder: Number(row.sort_order),
            estimatedMinutes: Number(row.estimated_minutes),
            isPublished: row.is_published,
        }));
    }
    async listLessonAssets(tenantId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes
      FROM lesson_assets
      WHERE lesson_node_id IN (
        SELECT id FROM lesson_nodes WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)}
      )
      ORDER BY sort_order ASC, id ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            lessonNodeId: normalizeId(row.lesson_node_id),
            assetType: row.asset_type,
            title: row.title,
            fileUrl: row.file_url,
            externalUrl: row.external_url,
            mimeType: row.mime_type,
            sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
        }));
    }
    async listLessonTranscripts(tenantId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT lesson_node_id, language, status, full_text, segments_json
      FROM lesson_transcripts
      WHERE lesson_node_id IN (
        SELECT id FROM lesson_nodes WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)}
      )
      ORDER BY lesson_node_id ASC
    `);
        return rows.map((row) => ({
            lessonNodeId: normalizeId(row.lesson_node_id),
            language: row.language,
            status: row.status,
            fullText: row.full_text,
            segments: (() => {
                const rawSegments = Array.isArray(row.segments_json)
                    ? row.segments_json
                    : typeof row.segments_json === 'string'
                        ? (() => {
                            try {
                                return JSON.parse(row.segments_json);
                            }
                            catch {
                                return [];
                            }
                        })()
                        : [];
                return Array.isArray(rawSegments)
                    ? rawSegments.map((segment) => ({
                        seek: String(segment?.seek || '00:00'),
                        progress: Number(segment?.progress || 0),
                        text: String(segment?.text || ''),
                    }))
                    : [];
            })(),
        }));
    }
    async createLessonNode(tenantId, courseId, payload) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO lesson_nodes (
        tenant_id, course_id, parent_id, node_type, title, path, depth, sort_order, estimated_minutes, is_published, created_at, updated_at
      )
      VALUES (
        ${BigInt(tenantId)}, ${BigInt(courseId)}, ${payload.parentId ? BigInt(payload.parentId) : null},
        ${payload.nodeType}, ${payload.title}, ${payload.path}, ${payload.depth}, ${payload.sortOrder}, ${payload.estimatedMinutes}, false, now(), now()
      )
      RETURNING id, parent_id, node_type, path::text as path, title, depth, sort_order, estimated_minutes, is_published
    `);
        const row = rows[0];
        return {
            id: normalizeId(row.id),
            parentId: row.parent_id ? normalizeId(row.parent_id) : null,
            nodeType: row.node_type,
            title: row.title,
            path: row.path,
            depth: Number(row.depth),
            sortOrder: Number(row.sort_order),
            estimatedMinutes: Number(row.estimated_minutes),
            isPublished: row.is_published,
        };
    }
    async updateLessonNode(tenantId, lessonNodeId, body) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
        UPDATE lesson_nodes
        SET
          title = COALESCE(${body.title ?? null}, title),
          estimated_minutes = COALESCE(${body.estimatedMinutes ?? null}, estimated_minutes),
          is_published = COALESCE(${body.isPublished ?? null}, is_published),
          updated_at = now()
        WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(lessonNodeId)}
      `);
    }
    async upsertLessonContent(lessonNodeId, body) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id
      FROM lesson_contents
      WHERE lesson_node_id = ${BigInt(lessonNodeId)}
      ORDER BY version DESC
      LIMIT 1
    `);
        if (rows[0]) {
            await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
          UPDATE lesson_contents
          SET content_type = ${body.contentType}, html_content = ${body.htmlContent ?? null}, plain_text = ${body.plainText ?? null}, updated_at = now()
          WHERE id = ${rows[0].id}
        `);
            return normalizeId(rows[0].id);
        }
        const inserted = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO lesson_contents (lesson_node_id, content_type, html_content, plain_text, version, updated_at)
      VALUES (${BigInt(lessonNodeId)}, ${body.contentType}, ${body.htmlContent ?? null}, ${body.plainText ?? null}, 1, now())
      RETURNING id
    `);
        return normalizeId(inserted[0].id);
    }
    async upsertLessonTranscript(lessonNodeId, body) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO lesson_transcripts (
        lesson_node_id, language, status, full_text, segments_json, updated_at, created_at
      )
      VALUES (
        ${BigInt(lessonNodeId)},
        ${body.language ?? 'th'},
        ${body.status ?? 'ready'},
        ${body.fullText ?? null},
        CAST(${JSON.stringify(Array.isArray(body.segments) ? body.segments : [])} AS jsonb),
        now(),
        now()
      )
      ON CONFLICT (lesson_node_id)
      DO UPDATE SET
        language = EXCLUDED.language,
        status = EXCLUDED.status,
        full_text = EXCLUDED.full_text,
        segments_json = EXCLUDED.segments_json,
        updated_at = now()
      RETURNING id
    `);
        return normalizeId(rows[0].id);
    }
    async createLessonAsset(lessonNodeId, body) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO lesson_assets (lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes, sort_order, created_at)
      VALUES (
        ${BigInt(lessonNodeId)}, ${body.assetType}, ${body.title}, ${body.fileUrl ?? null}, ${body.externalUrl ?? null},
        ${body.mimeType ?? null}, ${body.sizeBytes ?? null}, 0, now()
      )
      RETURNING id
    `);
        return normalizeId(rows[0].id);
    }
    async createVideoAsset(lessonNodeId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO video_assets (lesson_node_id, provider, status, created_at, updated_at)
      VALUES (${BigInt(lessonNodeId)}, 'custom', 'uploading', now(), now())
      RETURNING id
    `);
        return normalizeId(rows[0].id);
    }
    async deleteCourseTree(tenantId, courseId) {
        await this.prisma.$transaction(async (tx) => {
            const subtreeRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        WITH RECURSIVE subtree AS (
          SELECT id FROM lesson_nodes WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)}
          UNION ALL
          SELECT ln.id
          FROM lesson_nodes ln
          INNER JOIN subtree s ON ln.parent_id = s.id
        )
        SELECT id FROM subtree
      `);
            if (!subtreeRows.length) {
                return;
            }
            const subtreeIds = subtreeRows.map((row) => row.id);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM transcript_segments
        WHERE transcript_id IN (
          SELECT id FROM video_transcripts
          WHERE video_asset_id IN (
            SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
          )
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM video_transcripts
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM playback_sessions
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM video_assets
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_assets
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_contents
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_progress
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_nodes
        WHERE id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
        });
    }
    async deleteLessonNodeTree(tenantId, lessonNodeId) {
        await this.prisma.$transaction(async (tx) => {
            const subtreeRows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        WITH RECURSIVE subtree AS (
          SELECT id FROM lesson_nodes WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(lessonNodeId)}
          UNION ALL
          SELECT ln.id
          FROM lesson_nodes ln
          INNER JOIN subtree s ON ln.parent_id = s.id
        )
        SELECT id FROM subtree
      `);
            if (!subtreeRows.length) {
                return;
            }
            const subtreeIds = subtreeRows.map((row) => row.id);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM transcript_segments
        WHERE transcript_id IN (
          SELECT id FROM video_transcripts
          WHERE video_asset_id IN (
            SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
          )
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM video_transcripts
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM playback_sessions
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
        )
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM video_assets
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_assets
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_contents
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_progress
        WHERE lesson_node_id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
            await tx.$executeRaw(lms_client_1.Prisma.sql `
        DELETE FROM lesson_nodes
        WHERE id IN (${lms_client_1.Prisma.join(subtreeIds)})
      `);
        });
    }
    async publishCourse(tenantId, courseId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE courses
      SET status = 'published', published_at = now(), updated_at = now()
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
    `);
    }
    async applyTreeMoves(tenantId, courseId, updates) {
        await this.prisma.$transaction(updates.map((move) => this.prisma.$executeRaw(lms_client_1.Prisma.sql `
            UPDATE lesson_nodes
            SET
              parent_id = ${move.parentId ? BigInt(move.parentId) : null},
              sort_order = ${move.sortOrder},
              depth = ${move.depth},
              path = ${move.path},
              updated_at = now()
            WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)} AND id = ${BigInt(move.nodeId)}
          `)));
    }
};
exports.CoursesRepository = CoursesRepository;
exports.CoursesRepository = CoursesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CoursesRepository);
