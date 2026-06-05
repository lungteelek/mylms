import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../backend/generated/lms-client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonAssetDto } from './dto/create-lesson-asset.dto';
import { CreateLessonNodeDto } from './dto/create-lesson-node.dto';
import { UpsertLessonTranscriptDto } from './dto/upsert-lesson-transcript.dto';
import { UpdateLessonNodeDto } from './dto/update-lesson-node.dto';
import { UpsertLessonContentDto } from './dto/upsert-lesson-content.dto';
import { CourseRow, LessonAssetRow, LessonNodeRow, LessonTranscriptRow } from './types/course.types';

type RawId = bigint | number | string;

function normalizeId(value: RawId): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(tenantId: string): Promise<CourseRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: RawId; title: string; slug: string; status: string }>
    >(Prisma.sql`
      SELECT id, title, slug, status
      FROM courses
      WHERE tenant_id = ${BigInt(tenantId)}
      ORDER BY updated_at DESC, id DESC
    `);

    return rows.map((row) => ({
      id: normalizeId(row.id),
      title: row.title,
      slug: row.slug,
      status: row.status,
    }));
  }

  async createCourse(tenantId: string, body: CreateCourseDto): Promise<CourseRow> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: RawId; title: string; slug: string; status: string }>
    >(Prisma.sql`
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

  async findCourseById(tenantId: string, courseId: string): Promise<CourseRow | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: RawId; title: string; slug: string; status: string }>
    >(Prisma.sql`
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

  async listLessonNodes(tenantId: string, courseId: string): Promise<LessonNodeRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        parent_id: RawId | null;
        node_type: LessonNodeRow['nodeType'];
        title: string;
        path: string;
        depth: number;
        sort_order: number;
        estimated_minutes: number;
        is_published: boolean;
      }>
    >(Prisma.sql`
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

  async listLessonAssets(tenantId: string, courseId: string): Promise<LessonAssetRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        lesson_node_id: RawId;
        asset_type: LessonAssetRow['assetType'];
        title: string;
        file_url: string | null;
        external_url: string | null;
        mime_type: string | null;
        size_bytes: number | null;
      }>
    >(Prisma.sql`
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

  async listLessonTranscripts(tenantId: string, courseId: string): Promise<LessonTranscriptRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        lesson_node_id: RawId;
        language: string;
        status: LessonTranscriptRow['status'];
        full_text: string | null;
        segments_json: Array<{ seek: string; progress: number; text: string }> | null;
      }>
    >(Prisma.sql`
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
                } catch {
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

  async createLessonNode(
    tenantId: string,
    courseId: string,
    payload: {
      parentId: string | null;
      nodeType: LessonNodeRow['nodeType'];
      title: string;
      path: string;
      depth: number;
      sortOrder: number;
      estimatedMinutes: number;
    },
  ): Promise<LessonNodeRow> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        parent_id: RawId | null;
        node_type: LessonNodeRow['nodeType'];
        title: string;
        path: string;
        depth: number;
        sort_order: number;
        estimated_minutes: number;
        is_published: boolean;
      }>
    >(Prisma.sql`
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

  async updateLessonNode(tenantId: string, lessonNodeId: string, body: UpdateLessonNodeDto) {
    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE lesson_nodes
        SET
          title = COALESCE(${body.title ?? null}, title),
          estimated_minutes = COALESCE(${body.estimatedMinutes ?? null}, estimated_minutes),
          is_published = COALESCE(${body.isPublished ?? null}, is_published),
          updated_at = now()
        WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(lessonNodeId)}
      `,
    );
  }

  async upsertLessonContent(lessonNodeId: string, body: UpsertLessonContentDto) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      SELECT id
      FROM lesson_contents
      WHERE lesson_node_id = ${BigInt(lessonNodeId)}
      ORDER BY version DESC
      LIMIT 1
    `);

    if (rows[0]) {
      await this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE lesson_contents
          SET content_type = ${body.contentType}, html_content = ${body.htmlContent ?? null}, plain_text = ${body.plainText ?? null}, updated_at = now()
          WHERE id = ${rows[0].id as bigint}
        `,
      );
      return normalizeId(rows[0].id);
    }

    const inserted = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      INSERT INTO lesson_contents (lesson_node_id, content_type, html_content, plain_text, version, updated_at)
      VALUES (${BigInt(lessonNodeId)}, ${body.contentType}, ${body.htmlContent ?? null}, ${body.plainText ?? null}, 1, now())
      RETURNING id
    `);
    return normalizeId(inserted[0].id);
  }

  async upsertLessonTranscript(lessonNodeId: string, body: UpsertLessonTranscriptDto) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

  async createLessonAsset(lessonNodeId: string, body: CreateLessonAssetDto) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      INSERT INTO lesson_assets (lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes, sort_order, created_at)
      VALUES (
        ${BigInt(lessonNodeId)}, ${body.assetType}, ${body.title}, ${body.fileUrl ?? null}, ${body.externalUrl ?? null},
        ${body.mimeType ?? null}, ${body.sizeBytes ?? null}, 0, now()
      )
      RETURNING id
    `);
    return normalizeId(rows[0].id);
  }

  async createVideoAsset(lessonNodeId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      INSERT INTO video_assets (lesson_node_id, provider, status, created_at, updated_at)
      VALUES (${BigInt(lessonNodeId)}, 'custom', 'uploading', now(), now())
      RETURNING id
    `);
    return normalizeId(rows[0].id);
  }

  async deleteCourseTree(tenantId: string, courseId: string) {
    await this.prisma.$transaction(async (tx) => {
      const subtreeRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM transcript_segments
        WHERE transcript_id IN (
          SELECT id FROM video_transcripts
          WHERE video_asset_id IN (
            SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
          )
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM video_transcripts
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM playback_sessions
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM video_assets
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_assets
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_contents
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_progress
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_nodes
        WHERE id IN (${Prisma.join(subtreeIds)})
      `);
    });
  }

  async deleteLessonNodeTree(tenantId: string, lessonNodeId: string) {
    await this.prisma.$transaction(async (tx) => {
      const subtreeRows = await tx.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM transcript_segments
        WHERE transcript_id IN (
          SELECT id FROM video_transcripts
          WHERE video_asset_id IN (
            SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
          )
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM video_transcripts
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM playback_sessions
        WHERE video_asset_id IN (
          SELECT id FROM video_assets WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM video_assets
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_assets
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_contents
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_progress
        WHERE lesson_node_id IN (${Prisma.join(subtreeIds)})
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM lesson_nodes
        WHERE id IN (${Prisma.join(subtreeIds)})
      `);
    });
  }

  async publishCourse(tenantId: string, courseId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE courses
      SET status = 'published', published_at = now(), updated_at = now()
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
    `);
  }

  async applyTreeMoves(
    tenantId: string,
    courseId: string,
    updates: Array<{ nodeId: string; parentId: string | null; sortOrder: number; depth: number; path: string }>,
  ) {
    await this.prisma.$transaction(
      updates.map((move) =>
        this.prisma.$executeRaw(
          Prisma.sql`
            UPDATE lesson_nodes
            SET
              parent_id = ${move.parentId ? BigInt(move.parentId) : null},
              sort_order = ${move.sortOrder},
              depth = ${move.depth},
              path = ${move.path},
              updated_at = now()
            WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)} AND id = ${BigInt(move.nodeId)}
          `,
        ),
      ),
    );
  }
}
