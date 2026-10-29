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

function parseTranscriptSeekSeconds(value: string) {
  const parts = String(value || '')
    .trim()
    .split(':')
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(tenantId: string): Promise<CourseRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        title: string;
        slug: string;
        status: string;
        description: string | null;
        subject: string | null;
        level: string | null;
        enrollment_count: bigint | number;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      SELECT
        c.id,
        c.title,
        c.slug,
        c.status,
        c.description,
        c.subject,
        c.level,
        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.course_id = c.id AND e.tenant_id = c.tenant_id
        ) AS enrollment_count,
        c.created_at,
        c.updated_at
      FROM courses c
      WHERE c.tenant_id = ${BigInt(tenantId)}
      ORDER BY c.course_order ASC, c.updated_at DESC, c.id DESC
    `);

    return rows.map((row) => ({
      id: normalizeId(row.id),
      title: row.title,
      slug: row.slug,
      status: row.status,
      description: row.description,
      subject: row.subject,
      level: row.level,
      enrollmentCount: Number(row.enrollment_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createCourse(tenantId: string, body: CreateCourseDto): Promise<CourseRow> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        title: string;
        slug: string;
        status: string;
        description: string | null;
        subject: string | null;
        level: string | null;
        enrollment_count: bigint | number;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      WITH next_order AS (
        SELECT COALESCE(MAX(course_order), -1) + 1 AS value
        FROM courses
        WHERE tenant_id = ${BigInt(tenantId)}
      ),
      inserted AS (
        INSERT INTO courses (tenant_id, title, slug, description, subject, level, status, course_order, created_at, updated_at)
      VALUES (${BigInt(tenantId)}, ${body.title}, ${body.slug}, ${body.description ?? null}, ${body.subject ?? null}, ${body.level ?? null}, 'draft', (SELECT value FROM next_order), now(), now())
        RETURNING id, title, slug, status, description, subject, level, tenant_id, created_at, updated_at
      )
      SELECT
        inserted.id,
        inserted.title,
        inserted.slug,
        inserted.status,
        inserted.description,
        inserted.subject,
        inserted.level,
        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.course_id = inserted.id AND e.tenant_id = inserted.tenant_id
        ) AS enrollment_count,
        inserted.created_at,
        inserted.updated_at
      FROM inserted
    `);

    return {
      id: normalizeId(rows[0].id),
      title: rows[0].title,
      slug: rows[0].slug,
      status: rows[0].status,
      description: rows[0].description,
      subject: rows[0].subject,
      level: rows[0].level,
      enrollmentCount: Number(rows[0].enrollment_count || 0),
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };
  }

  async reorderCourses(tenantId: string, orderedCourseIds: string[]): Promise<number> {
    if (!orderedCourseIds.length) {
      return 0;
    }

    const ids = orderedCourseIds.map((courseId) => BigInt(courseId));
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      WITH ordered_ids AS (
        SELECT id, ord - 1 AS next_order
        FROM UNNEST(ARRAY[${Prisma.join(ids)}]::bigint[]) WITH ORDINALITY AS input(id, ord)
      )
      UPDATE courses c
      SET course_order = ordered_ids.next_order,
          updated_at = now()
      FROM ordered_ids
      WHERE c.tenant_id = ${BigInt(tenantId)} AND c.id = ordered_ids.id
    `);

    return Number(updated || 0);
  }

  async findCourseById(tenantId: string, courseId: string): Promise<CourseRow | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        title: string;
        slug: string;
        status: string;
        description: string | null;
        subject: string | null;
        level: string | null;
        enrollment_count: bigint | number;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      SELECT
        c.id,
        c.title,
        c.slug,
        c.status,
        c.description,
        c.subject,
        c.level,
        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.course_id = c.id AND e.tenant_id = c.tenant_id
        ) AS enrollment_count,
        c.created_at,
        c.updated_at
      FROM courses c
      WHERE c.tenant_id = ${BigInt(tenantId)} AND c.id = ${BigInt(courseId)}
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
      description: rows[0].description,
      subject: rows[0].subject,
      level: rows[0].level,
      enrollmentCount: Number(rows[0].enrollment_count || 0),
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };
  }

  async findTenantSlug(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: Number(tenantId) },
      select: { slug: true },
    });
    return tenant?.slug || null;
  }

  async findLessonNodeById(tenantId: string, lessonNodeId: string): Promise<{
    id: string;
    title: string;
    courseId: string;
    tenantId: string;
  } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        title: string;
        course_id: RawId;
        tenant_id: RawId;
      }>
    >(Prisma.sql`
      SELECT id, title, course_id, tenant_id
      FROM lesson_nodes
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(lessonNodeId)}
      LIMIT 1
    `);

    if (!rows[0]) {
      return null;
    }

    return {
      id: normalizeId(rows[0].id),
      title: rows[0].title,
      courseId: normalizeId(rows[0].course_id),
      tenantId: normalizeId(rows[0].tenant_id),
    };
  }

  async updateCourse(
    tenantId: string,
    courseId: string,
    body: {
      title?: string | null;
      description?: string | null;
      subject?: string | null;
      level?: string | null;
    },
  ): Promise<CourseRow | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        title: string;
        slug: string;
        status: string;
        description: string | null;
        subject: string | null;
        level: string | null;
        enrollment_count: bigint | number;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      WITH updated AS (
        UPDATE courses
      SET
        title = COALESCE(${body.title ?? null}, title),
        description = COALESCE(${body.description ?? null}, description),
        subject = COALESCE(${body.subject ?? null}, subject),
        level = COALESCE(${body.level ?? null}, level),
        updated_at = now()
        WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
        RETURNING id, title, slug, status, description, subject, level, tenant_id, created_at, updated_at
      )
      SELECT
        updated.id,
        updated.title,
        updated.slug,
        updated.status,
        updated.description,
        updated.subject,
        updated.level,
        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.course_id = updated.id AND e.tenant_id = updated.tenant_id
        ) AS enrollment_count,
        updated.created_at,
        updated.updated_at
      FROM updated
    `);

    if (!rows[0]) {
      return null;
    }

    return {
      id: normalizeId(rows[0].id),
      title: rows[0].title,
      slug: rows[0].slug,
      status: rows[0].status,
      description: rows[0].description,
      subject: rows[0].subject,
      level: rows[0].level,
      enrollmentCount: Number(rows[0].enrollment_count || 0),
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
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
        playback_id: string | null;
        video_status: LessonNodeRow['videoStatus'];
        video_asset_id: RawId | null;
        provider_asset_id: string | null;
        hls_url: string | null;
        poster_url: string | null;
      }>
    >(Prisma.sql`
      SELECT
        ln.id,
        ln.parent_id,
        ln.node_type,
        ln.path::text as path,
        ln.title,
        ln.depth,
        ln.sort_order,
        ln.estimated_minutes,
        ln.is_published,
        video.playback_id,
        video.status AS video_status,
        video.id AS video_asset_id,
        video.provider_asset_id,
        video.hls_url,
        video.poster_url
      FROM lesson_nodes ln
      LEFT JOIN LATERAL (
        SELECT id, playback_id, status, provider_asset_id, hls_url, poster_url
        FROM video_assets
        WHERE lesson_node_id = ln.id
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      ) video ON true
      WHERE ln.tenant_id = ${BigInt(tenantId)} AND ln.course_id = ${BigInt(courseId)}
      ORDER BY ln.path ASC, ln.sort_order ASC
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
      videoUrl: row.playback_id,
      videoStatus: row.video_status,
      videoAssetId: row.video_asset_id ? normalizeId(row.video_asset_id) : null,
      videoMediaId: row.provider_asset_id,
      videoHlsUrl: row.hls_url,
      videoPosterUrl: row.poster_url,
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
    await this.prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('lesson_transcripts', 'id'),
        COALESCE((SELECT MAX(id) FROM lesson_transcripts), 1),
        EXISTS (SELECT 1 FROM lesson_transcripts)
      )
    `);

    const orderedSegments = [...(Array.isArray(body.segments) ? body.segments : [])]
      .map((segment, index) => ({
        segment,
        index,
        seekSeconds: parseTranscriptSeekSeconds(segment?.seek || ''),
      }))
      .sort((left, right) => {
        if (left.seekSeconds === null && right.seekSeconds === null) return left.index - right.index;
        if (left.seekSeconds === null) return 1;
        if (right.seekSeconds === null) return -1;
        if (left.seekSeconds !== right.seekSeconds) return left.seekSeconds - right.seekSeconds;
        return left.index - right.index;
      })
      .map(({ segment }, index) => ({
        seek: String(segment?.seek || '00:00'),
        progress: Number(segment?.progress || 0),
        text: String(segment?.text || ''),
        segmentIndex: index + 1,
      }));

    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
      INSERT INTO lesson_transcripts (
        lesson_node_id, language, status, full_text, segments_json, updated_at, created_at
      )
      VALUES (
        ${BigInt(lessonNodeId)},
        ${body.language ?? 'th'},
        ${body.status ?? 'ready'},
        ${body.fullText ?? null},
        CAST(${JSON.stringify(orderedSegments)} AS jsonb),
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

  async unpublishCourse(tenantId: string, courseId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE courses
      SET status = 'draft', published_at = null, updated_at = now()
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
    `);
  }

  async deleteCourse(tenantId: string, courseId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM courses
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
