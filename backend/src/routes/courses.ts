import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { getTenantFeatureMap, isInstructorRole } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateCourseSummary } from '../services/gemini';
import { parseId } from '../utils/parseId';
import { slugify } from '../utils/slugify';

const router = Router();

type RawId = bigint | number | string;

function normalizeId(value: RawId): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

function isSqliteLegacyCompatibilityError(error: unknown) {
  const message = String(error);
  return message.includes('no such table')
    || message.includes('unrecognized token')
    || message.includes('near "')
    || message.includes('syntax error');
}

function normalizePrismaCourse(course: any) {
  return {
    ...course,
    id: String(course.id),
    slug: course.slug || `course-${course.id}`,
    status: course.status || 'draft',
    subject: course.subject || '',
    level: course.level || '',
    enrollmentCount: course._count?.enrollments ?? 0,
    publishedAt: course.publishedAt || null,
  };
}

async function buildCourseStats(tenantId: number, courseId: number) {
  const completedStudentCount = await prisma.enrollment.count({
    where: {
      tenantId,
      courseId,
      progress: {
        gte: 100,
      },
    },
  });

  return {
    completedStudentCount,
    reviewScore: null as number | null,
  };
}

function parseSegments(value: unknown) {
  const rawSegments = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        })()
      : [];

  return Array.isArray(rawSegments)
    ? rawSegments.map((segment) => ({
        seek: String((segment as any)?.seek || '00:00'),
        progress: Number((segment as any)?.progress || 0),
        text: String((segment as any)?.text || ''),
      }))
    : [];
}

function buildTreeFromRows<T extends { id: string; parentId: string | null; sortOrder: number }>(rows: T[]) {
  const map = new Map<string, T & { children: Array<T & { children: unknown[] }> }>();
  const roots: Array<T & { children: unknown[] }> = [];

  rows.forEach((row) => {
    map.set(row.id, { ...row, children: [] });
  });

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
      continue;
    }
    roots.push(node);
  }

  const sortNodes = (nodes: Array<T & { children: unknown[] }>) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortNodes(node.children as Array<T & { children: unknown[] }>));
  };

  sortNodes(roots);
  return roots;
}

function createLessonPath(parentPath: string | null, title: string) {
  const segment = slugify(title) || 'lesson';
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function normalizeNodeType(value: unknown) {
  return String(value || 'lesson').toLowerCase();
}

function flattenLessonTree(nodes: any[]): any[] {
  return nodes.flatMap((node) => [node, ...flattenLessonTree(Array.isArray(node?.children) ? node.children : [])]);
}

function normalizeDecimal(value: unknown) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function canManageTenantCourse(role?: string, instructorId?: number, currentUserId?: number) {
  if (role === 'OWNER' || role === 'ADMIN') return true;
  return Boolean(currentUserId && instructorId && currentUserId === instructorId);
}

function mapCoursePricingRecord(record: any) {
  if (!record) return null;
  return {
    ...record,
    priceMinor: Number(record.priceMinor || 0),
    compareAtPriceMinor: record.compareAtPriceMinor === null ? null : Number(record.compareAtPriceMinor),
    salesStartsAt: record.salesStartsAt || null,
    salesEndsAt: record.salesEndsAt || null,
  };
}

function mapDiscountCampaignRecord(record: any) {
  return {
    ...record,
    discountValue: record.discountValue === null ? null : Number(record.discountValue),
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
  };
}

type LegacyLessonAssetRow = {
  id: string;
  lessonNodeId: string;
  assetType: 'pdf' | 'link' | 'image' | 'attachment' | 'assignment';
  title: string;
  fileUrl: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

function attachLessonAssets(nodes: any[], assets: LegacyLessonAssetRow[]): any[] {
  const assetByNodeId = new Map<string, LegacyLessonAssetRow[]>();
  for (const asset of assets) {
    const list = assetByNodeId.get(asset.lessonNodeId) || [];
    list.push(asset);
    assetByNodeId.set(asset.lessonNodeId, list);
  }

  const mapAsset = (asset: LegacyLessonAssetRow): {
    id: string;
    title: string;
    assetType: LegacyLessonAssetRow['assetType'];
    type: 'pdf' | 'url' | 'image' | 'attachment' | 'none';
    fileName: string;
    url: string;
    fileUrl?: string;
    externalUrl?: string;
    mimeType: string | null;
    sizeBytes: number | null;
  } => ({
    id: asset.id,
    title: asset.title,
    assetType: asset.assetType,
    type:
      asset.assetType === 'pdf'
        ? 'pdf'
        : asset.assetType === 'image'
          ? 'image'
          : asset.assetType === 'attachment'
            ? 'attachment'
            : asset.assetType === 'assignment'
              ? 'attachment'
            : 'url',
    fileName: asset.title,
    url: asset.fileUrl || asset.externalUrl || '',
    fileUrl: asset.fileUrl || undefined,
    externalUrl: asset.externalUrl || undefined,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  });

  const pickAsset = (rows: LegacyLessonAssetRow[]): ReturnType<typeof mapAsset> => {
    const pdf = rows.find((asset) => asset.assetType === 'pdf');
    if (pdf) {
      return mapAsset(pdf);
    }
    const image = rows.find((asset) => asset.assetType === 'image' && asset.fileUrl);
    if (image) {
      return mapAsset(image);
    }
    const attachment = rows.find((asset) => asset.assetType === 'attachment' && asset.fileUrl);
    if (attachment) {
      return mapAsset(attachment);
    }
    const link = rows.find((asset) => asset.assetType === 'link' && asset.externalUrl);
    if (link) {
      return mapAsset(link);
    }
    return {
      id: '',
      title: '',
      assetType: 'attachment' as const,
      type: 'none' as const,
      fileName: '',
      url: '',
      mimeType: null,
      sizeBytes: null,
    };
  };

  return nodes.map((node) => ({
    ...node,
    asset: pickAsset(assetByNodeId.get(node.id) || []),
    assets: (assetByNodeId.get(node.id) || []).map(mapAsset),
    children: attachLessonAssets(Array.isArray(node.children) ? node.children : [], assets),
  }));
}

async function listLegacyCourses(tenantId: string, instructorId?: number) {
  let rows: Array<{
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
  }>;

  try {
    rows = await prisma.$queryRaw(Prisma.sql`
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
      ${typeof instructorId === 'number' ? Prisma.sql`AND c.instructor_id = ${BigInt(instructorId)}` : Prisma.empty}
      ORDER BY c.course_order ASC, c.updated_at DESC, c.id DESC
    `) as typeof rows;
  } catch (error) {
    // The SQLite compatibility database uses Prisma's legacy PascalCase
    // tables, while the newer raw-query path uses snake_case tables.
    // Fall back to the generated Prisma client so educator still works.
    if (!isSqliteLegacyCompatibilityError(error)) throw error;
    const courses = await prisma.course.findMany({
      where: {
        tenantId: Number(tenantId),
        ...(typeof instructorId === 'number' ? { instructorId } : {}),
      },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    rows = courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: `course-${course.id}`,
      status: 'draft',
      description: course.description,
      subject: course.subject,
      level: course.level,
      enrollment_count: course._count.enrollments,
      created_at: course.createdAt,
      updated_at: course.updatedAt,
    }));
  }

  const pricingRows = await prisma.coursePricing.findMany({
    where: {
      tenantId: Number(tenantId),
    },
  }).catch(() => []);
  const pricingByCourseId = new Map(pricingRows.map((item) => [String(item.courseId), mapCoursePricingRecord(item)]));

  return rows.map((row) => ({
    id: normalizeId(row.id),
    title: row.title,
    slug: row.slug,
    status: row.status,
    description: row.description || '',
    subject: row.subject || '',
    level: row.level || '',
    enrollmentCount: Number(row.enrollment_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pricing: pricingByCourseId.get(normalizeId(row.id)) || null,
  }));
}

async function reorderLegacyCourses(tenantId: string, orderedCourseIds: string[]) {
  if (!orderedCourseIds.length) {
    return 0;
  }

  try {
    const ids = orderedCourseIds.map((courseId) => BigInt(courseId));
    const updated = await prisma.$executeRaw(Prisma.sql`
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
  } catch (error) {
    if (!isSqliteLegacyCompatibilityError(error)) throw error;
    let updated = 0;
    for (const [index, courseId] of orderedCourseIds.entries()) {
      const result = await prisma.course.updateMany({
        where: { id: Number(courseId), tenantId: Number(tenantId) },
        data: { courseOrder: index },
      });
      updated += result.count;
    }
    return updated;
  }
}

async function findLegacyCourseById(tenantId: string, courseId: string) {
  const rows = await prisma.$queryRaw<
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

  const row = rows[0];
  if (!row) return null;

  return {
    id: normalizeId(row.id),
    title: row.title,
    slug: row.slug,
    status: row.status,
    description: row.description || '',
    subject: row.subject || '',
    level: row.level || '',
    enrollmentCount: Number(row.enrollment_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findLegacyLessonNodesFromLegacy(tenantId: string, courseId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: RawId;
      parent_id: RawId | null;
      node_type: string;
      title: string;
      path: string;
      depth: number;
      sort_order: number;
      estimated_minutes: number;
      is_published: boolean;
      content_type: string | null;
      html_content: string | null;
      plain_text: string | null;
      playback_id: string | null;
      video_status: string | null;
      video_asset_id: RawId | null;
      provider_asset_id: string | null;
      hls_url: string | null;
      poster_url: string | null;
      asset_type: string | null;
      asset_title: string | null;
      file_url: string | null;
      external_url: string | null;
      mime_type: string | null;
      size_bytes: bigint | null;
      segments_json: unknown;
      transcript_status: string | null;
      transcript_language: string | null;
      transcript_full_text: string | null;
    }>
  >(Prisma.sql`
    SELECT
      ln.id,
      ln.parent_id,
      ln.node_type,
      ln.title,
      ln.path::text AS path,
      ln.depth,
      ln.sort_order,
      ln.estimated_minutes,
      ln.is_published,
      content.content_type,
      content.html_content,
      content.plain_text,
      video.id AS video_asset_id,
      video.playback_id,
      video.status AS video_status,
      video.provider_asset_id,
      video.hls_url,
      video.poster_url,
      asset.asset_type,
      asset.title AS asset_title,
      asset.file_url,
      asset.external_url,
      asset.mime_type,
      asset.size_bytes,
      transcript.status AS transcript_status,
      transcript.language AS transcript_language,
      transcript.full_text AS transcript_full_text,
      transcript.segments_json
    FROM lesson_nodes ln
    LEFT JOIN LATERAL (
      SELECT content_type, html_content, plain_text
      FROM lesson_contents
      WHERE lesson_node_id = ln.id
      ORDER BY version DESC, updated_at DESC, id DESC
      LIMIT 1
    ) content ON true
    LEFT JOIN LATERAL (
      SELECT id, playback_id, status, provider_asset_id, hls_url, poster_url
      FROM video_assets
      WHERE lesson_node_id = ln.id
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) video ON true
    LEFT JOIN LATERAL (
      SELECT asset_type, title, file_url, external_url, mime_type, size_bytes
      FROM lesson_assets
      WHERE lesson_node_id = ln.id
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
    ) asset ON true
    LEFT JOIN LATERAL (
      SELECT status, language, full_text, segments_json
      FROM lesson_transcripts
      WHERE lesson_node_id = ln.id
      LIMIT 1
    ) transcript ON true
    WHERE ln.tenant_id = ${BigInt(tenantId)} AND ln.course_id = ${BigInt(courseId)}
    ORDER BY ln.path ASC, ln.sort_order ASC
  `);

  const normalizedRows = rows.map((row) => ({
    id: normalizeId(row.id),
    parentId: row.parent_id ? normalizeId(row.parent_id) : null,
    nodeType: normalizeNodeType(row.node_type),
    title: row.title,
    path: row.path,
    depth: Number(row.depth || 1),
    sortOrder: Number(row.sort_order || 0),
    estimatedMinutes: Number(row.estimated_minutes || 0),
    isPublished: Boolean(row.is_published),
    contentType: row.content_type || 'article',
    htmlContent: row.html_content || '',
    plainText: row.plain_text || '',
    videoAssetId: row.video_asset_id ? normalizeId(row.video_asset_id) : null,
    videoUrl: row.playback_id || '',
    videoStatus: row.video_status || null,
    videoMediaId: row.provider_asset_id || null,
    videoHlsUrl: row.hls_url || null,
    videoPosterUrl: row.poster_url || null,
    asset: row.asset_type
      ? {
          type:
            row.asset_type === 'pdf'
              ? 'pdf'
              : row.asset_type === 'image'
                ? 'image'
                : row.asset_type === 'attachment'
                  ? 'attachment'
                  : 'url',
          fileName: row.asset_title || '',
          url: row.file_url || row.external_url || '',
          fileUrl: row.file_url || '',
          externalUrl: row.external_url || '',
          mimeType: row.mime_type || '',
          sizeBytes: row.size_bytes ? Number(row.size_bytes) : null,
        }
      : { type: 'none', fileName: '', url: '' },
    transcriptStatus: row.transcript_status || 'ready',
    transcriptLanguage: row.transcript_language || 'th',
    transcriptFullText: row.transcript_full_text || '',
    transcriptSegments: parseSegments(row.segments_json),
  }));

  const tree = buildTreeFromRows(normalizedRows);
  const assetRows = await prisma.$queryRaw<Array<{
    id: RawId;
    lesson_node_id: RawId;
    asset_type: 'pdf' | 'link' | 'image' | 'attachment' | 'assignment';
    title: string;
    file_url: string | null;
    external_url: string | null;
    mime_type: string | null;
    size_bytes: bigint | number | null;
  }>>(Prisma.sql`
    SELECT id, lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes
    FROM lesson_assets
    WHERE lesson_node_id IN (
      SELECT id FROM lesson_nodes WHERE tenant_id = ${BigInt(tenantId)} AND course_id = ${BigInt(courseId)}
    )
    ORDER BY lesson_node_id ASC, sort_order ASC, id ASC
  `);

  const normalizedAssets: LegacyLessonAssetRow[] = assetRows.map((row) => ({
    id: normalizeId(row.id),
    lessonNodeId: normalizeId(row.lesson_node_id),
    assetType: row.asset_type,
    title: row.title,
    fileUrl: row.file_url,
    externalUrl: row.external_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
  }));

  return attachLessonAssets(tree, normalizedAssets);
}

async function findLegacyLessonNodes(tenantId: string, courseId: string) {
  try {
    return await findLegacyLessonNodesFromLegacy(tenantId, courseId);
  } catch (error) {
    if (!isSqliteLegacyCompatibilityError(error)) throw error;

    // SQLite compatibility storage keeps lessons as Module rows. Expose them
    // through the same tree shape used by the educator UI so saved lessons are
    // visible after reload.
    const modules = await prisma.module.findMany({
      where: {
        tenantId: Number(tenantId),
        courseId: Number(courseId),
      },
      orderBy: { order: 'asc' },
    });
    const manifestsByModule = new Map<number, Array<{ id: string; status: string; hlsUrl: string | null; posterUrl: string | null }>>();
    const mediaRoot = path.join(__dirname, '../../uploads/media', String(tenantId));
    for (const module of modules) {
      const moduleDir = path.join(mediaRoot, String(module.id));
      if (!fs.existsSync(moduleDir)) continue;
      const manifests = fs.readdirSync(moduleDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(moduleDir, entry.name, 'manifest.json'), 'utf8')) as {
              id?: string; status?: string; r2?: { hls?: { master?: string }; poster?: string };
            };
          } catch { return null; }
        })
        .filter((manifest): manifest is NonNullable<typeof manifest> => Boolean(manifest?.id))
        .sort((a, b) => String(b.id).localeCompare(String(a.id)));
      const latest = manifests[0];
      if (latest) manifestsByModule.set(module.id, [{
        id: String(latest.id),
        status: latest.status || 'processing',
        hlsUrl: latest.r2?.hls?.master || null,
        posterUrl: latest.r2?.poster || null,
      }]);
    }
    return buildTreeFromRows(modules.map((module) => ({
      id: String(module.id),
      parentId: module.parentId === null ? null : String(module.parentId),
      nodeType: normalizeNodeType(module.nodeType),
      title: module.title,
      path: `module-${module.id}`,
      depth: 0,
      sortOrder: module.order,
      estimatedMinutes: module.estimatedMinutes,
      isPublished: false,
      contentType: 'article',
      htmlContent: module.content || '',
      plainText: module.content || '',
      videoAssetId: null,
      videoUrl: module.videoUrl || '',
      videoStatus: manifestsByModule.get(module.id)?.[0]?.status || null,
      videoMediaId: manifestsByModule.get(module.id)?.[0]?.id || null,
      videoHlsUrl: manifestsByModule.get(module.id)?.[0]?.hlsUrl || null,
      videoPosterUrl: manifestsByModule.get(module.id)?.[0]?.posterUrl || null,
      asset: { type: 'none', fileName: '', url: '' },
      assets: [],
      transcriptStatus: 'ready',
      transcriptLanguage: 'th',
      transcriptFullText: '',
      transcriptSegments: [],
    })));
  }
}

async function buildLegacyCourseResponse(tenantId: string, courseId: string) {
  const course = await findLegacyCourseById(tenantId, courseId);
  if (!course) return null;

  const tree = await findLegacyLessonNodes(tenantId, courseId);
  const stats = await buildCourseStats(Number(tenantId), Number(courseId));
  const modules = flattenLessonTree(tree).map((node) => ({
    id: node.id,
    title: node.title,
    content: node.plainText || node.htmlContent || '',
    videoAssetId: node.videoAssetId || null,
    videoUrl: node.videoUrl || '',
    videoStatus: node.videoStatus || null,
    videoHlsUrl: node.videoHlsUrl || null,
    videoPosterUrl: node.videoPosterUrl || null,
    videoMediaId: node.videoMediaId || null,
    asset: node.asset,
    assets: node.assets,
    transcriptSegments: node.transcriptSegments,
    transcriptStatus: node.transcriptStatus,
    transcriptLanguage: node.transcriptLanguage,
    transcriptFullText: node.transcriptFullText,
    path: node.path,
    depth: node.depth,
    nodeType: node.nodeType,
  }));

  return {
    ...course,
    ...stats,
    modules,
    tree,
  };
}

function buildModulesFromTree(tree: Awaited<ReturnType<typeof findLegacyLessonNodes>>) {
  return flattenLessonTree(tree).map((node) => ({
    id: node.id,
    title: node.title,
    content: node.plainText || node.htmlContent || '',
    videoAssetId: node.videoAssetId || null,
    videoUrl: node.videoUrl || '',
    videoStatus: node.videoStatus || null,
    videoHlsUrl: node.videoHlsUrl || null,
    videoPosterUrl: node.videoPosterUrl || null,
    videoMediaId: node.videoMediaId || null,
    asset: node.asset,
    assets: node.assets,
    transcriptSegments: node.transcriptSegments,
    transcriptStatus: node.transcriptStatus,
    transcriptLanguage: node.transcriptLanguage,
    transcriptFullText: node.transcriptFullText,
    path: node.path,
    depth: node.depth,
    nodeType: node.nodeType,
  }));
}

async function ensureLegacyTreeCourse(tenantId: number, courseId: number) {
  let existingRows: Array<{ id: RawId }>;
  try {
    existingRows = await prisma.$queryRaw(Prisma.sql`
      SELECT id
      FROM courses
      WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
      LIMIT 1
    `) as typeof existingRows;
  } catch (error) {
    if (!isSqliteLegacyCompatibilityError(error)) throw error;
    // The legacy SQLite schema stores course content as Module rows.
    return Boolean(await prisma.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true } }));
  }
  if (existingRows[0]) return true;

  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId },
  });
  if (!course) return false;

  await prisma.$executeRaw(Prisma.sql`
    WITH next_order AS (
      SELECT COALESCE(MAX(course_order), -1) + 1 AS value
      FROM courses
      WHERE tenant_id = ${BigInt(tenantId)}
    )
    INSERT INTO courses (
      id,
      tenant_id,
      title,
      slug,
      description,
      subject,
      level,
      status,
      course_order,
      created_at,
      updated_at
    )
    VALUES (
      ${BigInt(course.id)},
      ${BigInt(course.tenantId)},
      ${course.title},
      ${`course-${course.id}`},
      ${course.description || ''},
      ${course.subject || ''},
      ${course.level || ''},
      ${'DRAFT'},
      (SELECT value FROM next_order),
      ${course.createdAt},
      now()
    )
    ON CONFLICT (id) DO NOTHING
  `);

  await prisma.$executeRaw(Prisma.sql`
    SELECT setval(
      pg_get_serial_sequence('courses', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM courses), (SELECT last_value FROM courses_id_seq))::bigint,
      true
    )
  `).catch(() => null);

  const mirroredRows = await prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
    SELECT id
    FROM courses
    WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
    LIMIT 1
  `);

  return Boolean(mirroredRows[0]);
}

async function touchCourseUpdatedAt(tenantId: number, courseId: number) {
  await prisma.course.updateMany({
    where: {
      id: courseId,
      tenantId,
    },
    data: {
      updatedAt: new Date(),
    },
  }).catch(() => null);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE courses
    SET updated_at = now()
    WHERE tenant_id = ${BigInt(tenantId)} AND id = ${BigInt(courseId)}
  `).catch(() => null);
}

// Get all courses
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    return res.json(await listLegacyCourses(String(req.user!.tenantId)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses for logged-in instructor
router.get('/instructor', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    return res.json(await listLegacyCourses(String(req.user!.tenantId), req.user?.userId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดลำดับคอร์ส' });
    }

    const orderedCourseIds = Array.isArray(req.body?.orderedCourseIds)
      ? req.body.orderedCourseIds.map((courseId: unknown) => String(courseId)).filter(Boolean)
      : [];

    if (!orderedCourseIds.length) {
      return res.status(400).json({ error: 'ต้องระบุ orderedCourseIds' });
    }

    const updated = await reorderLegacyCourses(String(req.user!.tenantId), orderedCourseIds);
    return res.json({ data: { updated } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a course (Instructor only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'เฉพาะ instructor เท่านั้นที่สร้างคอร์สได้' });
    }

    const { title, description } = req.body;
    const features = await getTenantFeatureMap(prisma, req.user!.tenantId);

    let finalDescription = description;
    if (features.ai_quiz_generation) {
      try {
        const aiSummary = await generateCourseSummary(title, description || '');
        finalDescription = `${description}\n\n--- AI Generated Summary ---\n${aiSummary}`;
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
      }
    }

    let nextOrder = 0;
    let hasLegacyCourseOrder = true;
    try {
      const nextOrderRows = await prisma.$queryRaw<Array<{ next_order: bigint | number }>>(Prisma.sql`
        SELECT COALESCE(MAX(course_order), -1) + 1 AS next_order
        FROM courses
        WHERE tenant_id = ${BigInt(req.user!.tenantId)}
      `);
      nextOrder = Number(nextOrderRows[0]?.next_order ?? 0);
    } catch (orderError) {
      if (!isSqliteLegacyCompatibilityError(orderError)) throw orderError;
      // SQLite compatibility DBs do not have the newer raw-query table.
      hasLegacyCourseOrder = false;
    }

    const course = await prisma.course.create({
      data: {
        tenantId: req.user!.tenantId,
        title,
        slug: typeof req.body.slug === 'string' && req.body.slug.trim() ? req.body.slug.trim() : `course-${Date.now()}`,
        status: 'draft',
        courseOrder: nextOrder,
        description: finalDescription,
        subject: typeof req.body.subject === 'string' ? req.body.subject : undefined,
        level: typeof req.body.level === 'string' ? req.body.level : undefined,
        instructorId: req.user.userId,
      }
    });

    if (hasLegacyCourseOrder) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE courses
        SET course_order = ${nextOrder},
            updated_at = now()
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(course.id)}
      `);
    }

    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add module to a course
router.post('/:id/modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, videoUrl } = req.body;
    const courseId = parseId(id);
    
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
    });
    if (!course) return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    
    if (course.instructorId !== req.user?.userId && req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    }

    const moduleCount = await prisma.module.count({
      where: {
        courseId,
        tenantId: req.user!.tenantId,
      },
    });

    const module = await prisma.module.create({
      data: {
        tenantId: req.user!.tenantId,
        title,
        content,
        videoUrl,
        courseId,
        order: moduleCount + 1,
      }
    });

    res.status(201).json(module);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/nodes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์สร้างบทเรียน' });
    }

    const courseId = parseId(req.params.id);
    const mirrored = await ensureLegacyTreeCourse(req.user!.tenantId, courseId);
    if (!mirrored) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    const parentId = req.body.parentId ? parseId(String(req.body.parentId)) : null;
    let hasLegacyTreeTables = true;
    let nodeRows: Array<{
      id: RawId;
      parent_id: RawId | null;
      path: string;
      depth: number;
      node_type: string;
    }>;
    try {
      nodeRows = await prisma.$queryRaw(Prisma.sql`
        SELECT id, parent_id, path::text AS path, depth, node_type
        FROM lesson_nodes
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND course_id = ${BigInt(courseId)}
        ORDER BY path ASC, sort_order ASC
      `) as typeof nodeRows;
    } catch (error) {
      if (!isSqliteLegacyCompatibilityError(error)) throw error;
      hasLegacyTreeTables = false;
      const modules = await prisma.module.findMany({
        where: { tenantId: req.user!.tenantId, courseId },
        orderBy: { order: 'asc' },
      });
      nodeRows = modules.map((module) => ({
        id: module.id,
        parent_id: null,
        path: `module-${module.id}`,
        depth: 0,
        node_type: 'SECTION',
      }));
    }

    const parent = parentId
      ? nodeRows.find((row) => normalizeId(row.id) === String(parentId))
      : undefined;

    if (parentId && !parent) {
      return res.status(404).json({ error: 'ไม่พบบทเรียนแม่' });
    }

    let siblingCount = 0;
    if (hasLegacyTreeTables) {
      const siblingCountRows = await prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM lesson_nodes
        WHERE tenant_id = ${BigInt(req.user!.tenantId)}
          AND course_id = ${BigInt(courseId)}
          AND ${parentId === null ? Prisma.sql`parent_id IS NULL` : Prisma.sql`parent_id = ${BigInt(parentId)}`}
      `);
      siblingCount = Number(siblingCountRows[0]?.count || 0);
    } else {
      siblingCount = await prisma.module.count({
        where: { tenantId: req.user!.tenantId, courseId, parentId },
      });
    }
    const title = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : 'บทเรียนใหม่';
    const nodeType = typeof req.body.nodeType === 'string' ? req.body.nodeType.toUpperCase() : 'LESSON';
    const estimatedMinutes = Number(req.body.estimatedMinutes || 0);

    if (nodeType === 'LESSON' && (!parent || String(parent.node_type || '').toUpperCase() !== 'SECTION')) {
      return res.status(400).json({ error: 'บทย่อยต้องสร้างใต้บทเรียนหลักเท่านั้น' });
    }

    if (!hasLegacyTreeTables) {
      const module = await prisma.module.create({
        data: {
          tenantId: req.user!.tenantId,
          courseId,
          title,
          content: '',
          estimatedMinutes,
          order: siblingCount + 1,
          parentId,
          nodeType,
        },
      });
      await touchCourseUpdatedAt(req.user!.tenantId, courseId);
      return res.status(201).json({
        data: {
          id: String(module.id),
          parentId: parentId ? String(parentId) : null,
          nodeType: normalizeNodeType(nodeType),
          title: module.title,
          path: `module-${module.id}`,
          depth: 0,
          sortOrder: module.order,
          estimatedMinutes,
          isPublished: false,
          children: [],
        },
      });
    }

    const createdRows = await prisma.$queryRaw<
      Array<{
        id: RawId;
        parent_id: RawId | null;
        node_type: string;
        title: string;
        path: string;
        depth: number;
        sort_order: number;
        estimated_minutes: number;
        is_published: boolean;
      }>
    >(Prisma.sql`
      INSERT INTO lesson_nodes (
        tenant_id,
        course_id,
        parent_id,
        node_type,
        title,
        path,
        depth,
        sort_order,
        estimated_minutes,
        is_published,
        created_at,
        updated_at
      )
      VALUES (
        ${BigInt(req.user!.tenantId)},
        ${BigInt(courseId)},
        ${parentId === null ? Prisma.sql`NULL` : Prisma.sql`${BigInt(parentId)}`},
        ${nodeType},
        ${title},
        ${createLessonPath(parent?.path ?? null, title)},
        ${parent ? Number(parent.depth || 0) + 1 : 0},
        ${siblingCount + 1},
        ${estimatedMinutes},
        false,
        now(),
        now()
      )
      RETURNING id, parent_id, node_type, title, path::text AS path, depth, sort_order, estimated_minutes, is_published
    `);

    const node = createdRows[0];
    await touchCourseUpdatedAt(req.user!.tenantId, courseId);
    return res.status(201).json({
      data: {
        id: normalizeId(node.id),
        parentId: node.parent_id ? normalizeId(node.parent_id) : null,
        nodeType: normalizeNodeType(node.node_type),
        title: node.title,
        path: node.path,
        depth: Number(node.depth || 0),
        sortOrder: Number(node.sort_order || 0),
        estimatedMinutes: Number(node.estimated_minutes || 0),
        isPublished: Boolean(node.is_published),
        children: [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/tree/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดลำดับบทเรียน' });
    }

    const courseId = parseId(req.params.id);
    const mirrored = await ensureLegacyTreeCourse(req.user!.tenantId, courseId);
    if (!mirrored) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    const moves = Array.isArray(req.body?.moves) ? req.body.moves : [];
    try {
      await prisma.$queryRaw(Prisma.sql`SELECT id, path::text AS path FROM lesson_nodes LIMIT 1`);
    } catch (error) {
      if (!isSqliteLegacyCompatibilityError(error)) throw error;
      for (const move of moves) {
        const nodeId = parseId(String(move.nodeId));
        const nextParentId = move.newParentId ? parseId(String(move.newParentId)) : null;
        const module = await prisma.module.findFirst({
          where: { id: nodeId, tenantId: req.user!.tenantId, courseId },
        });
        if (!module) continue;
        if (nextParentId !== null) {
          const parent = await prisma.module.findFirst({
            where: { id: nextParentId, tenantId: req.user!.tenantId, courseId },
          });
          if (!parent) return res.status(404).json({ error: 'ไม่พบบทเรียนแม่' });
        }
        await prisma.module.update({
          where: { id: module.id },
          data: {
            parentId: nextParentId,
            order: Number(move.newSortOrder || 0),
          },
        });
      }
      await touchCourseUpdatedAt(req.user!.tenantId, courseId);
      return res.json({ data: { courseId: String(courseId), updated: moves.length } });
    }

    for (const move of moves) {
      const nodeId = parseId(String(move.nodeId));
      const nextParentId = move.newParentId ? parseId(String(move.newParentId)) : null;
      const nodeRows = await prisma.$queryRaw<
        Array<{ id: RawId; title: string; path: string; depth: number; node_type: string }>
      >(Prisma.sql`
        SELECT id, title, path::text AS path, depth, node_type
        FROM lesson_nodes
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND course_id = ${BigInt(courseId)} AND id = ${BigInt(nodeId)}
        LIMIT 1
      `);
      const node = nodeRows[0];
      if (!node) continue;

      const parentRows = nextParentId === null
        ? []
        : await prisma.$queryRaw<Array<{ id: RawId; path: string; depth: number; node_type: string }>>(Prisma.sql`
            SELECT id, path::text AS path, depth, node_type
            FROM lesson_nodes
            WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND course_id = ${BigInt(courseId)} AND id = ${BigInt(nextParentId)}
            LIMIT 1
          `);
      const parent = parentRows[0];

      if (String(node.node_type || '').toUpperCase() === 'LESSON' && (!parent || String(parent.node_type || '').toUpperCase() !== 'SECTION')) {
        return res.status(400).json({ error: 'บทย่อยต้องอยู่ใต้บทเรียนหลักเท่านั้น' });
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE lesson_nodes
        SET
          parent_id = ${nextParentId === null ? Prisma.sql`NULL` : Prisma.sql`${BigInt(nextParentId)}`},
          sort_order = ${Number(move.newSortOrder || 0)},
          depth = ${parent ? Number(parent.depth || 0) + 1 : 0},
          path = ${createLessonPath(parent?.path ?? null, node.title)},
          updated_at = now()
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND course_id = ${BigInt(courseId)} AND id = ${BigInt(nodeId)}
      `);
    }

    await touchCourseUpdatedAt(req.user!.tenantId, courseId);

    return res.json({ data: { courseId: String(courseId), updated: moves.length } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/lesson-nodes/:nodeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขบทเรียน' });
    }

    const nodeId = parseId(req.params.nodeId);
    let rows: Array<{ id: RawId; title: string; estimated_minutes: number; is_published: boolean }>;
    try {
      rows = await prisma.$queryRaw(Prisma.sql`
        UPDATE lesson_nodes
        SET
          title = COALESCE(${typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : null}, title),
          estimated_minutes = COALESCE(${typeof req.body.estimatedMinutes === 'number' ? Number(req.body.estimatedMinutes) : null}, estimated_minutes),
          is_published = COALESCE(${typeof req.body.isPublished === 'boolean' ? req.body.isPublished : null}, is_published),
          updated_at = now()
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(nodeId)}
        RETURNING id, title, estimated_minutes, is_published
      `) as typeof rows;
    } catch (error) {
      if (!isSqliteLegacyCompatibilityError(error)) throw error;
      const module = await prisma.module.findFirst({
        where: { id: nodeId, tenantId: req.user!.tenantId },
      });
      if (!module) return res.status(404).json({ error: 'ไม่พบบทเรียน' });
      const updated = await prisma.module.update({
        where: { id: module.id },
        data: {
          ...(typeof req.body.title === 'string' && req.body.title.trim() ? { title: req.body.title.trim() } : {}),
          ...(typeof req.body.htmlContent === 'string'
            ? { content: req.body.htmlContent }
            : typeof req.body.plainText === 'string' ? { content: req.body.plainText } : {}),
          ...(typeof req.body.estimatedMinutes === 'number'
            ? { estimatedMinutes: Math.max(0, Number(req.body.estimatedMinutes)) }
            : {}),
        },
      });
      await touchCourseUpdatedAt(req.user!.tenantId, module.courseId);
      return res.json({
        data: {
          lessonNodeId: String(updated.id),
          title: updated.title,
          estimatedMinutes: updated.estimatedMinutes,
          isPublished: Boolean(req.body.isPublished),
          content: updated.content || '',
        },
      });
    }

    if (!rows[0]) {
      return res.status(404).json({ error: 'ไม่พบบทเรียน' });
    }

    const courseRows = await prisma.$queryRaw<Array<{ course_id: RawId }>>(Prisma.sql`
      SELECT course_id
      FROM lesson_nodes
      WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(nodeId)}
      LIMIT 1
    `).catch(() => []);
    const courseId = courseRows[0] ? Number(normalizeId(courseRows[0].course_id)) : null;
    if (courseId) {
      await touchCourseUpdatedAt(req.user!.tenantId, courseId);
    }

    return res.json({
      data: {
        lessonNodeId: String(nodeId),
        title: rows[0].title,
        estimatedMinutes: Number(rows[0].estimated_minutes || 0),
        isPublished: Boolean(rows[0].is_published),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/lesson-nodes/:nodeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบบทเรียน' });
    }

    const nodeId = parseId(req.params.nodeId);
    let courseRows: Array<{ course_id: RawId }>;
    try {
      courseRows = await prisma.$queryRaw(Prisma.sql`
        SELECT course_id
        FROM lesson_nodes
        WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(nodeId)}
        LIMIT 1
      `) as typeof courseRows;
    } catch (error) {
      if (!isSqliteLegacyCompatibilityError(error)) throw error;
      const module = await prisma.module.findFirst({
        where: { id: nodeId, tenantId: req.user!.tenantId },
      });
      if (!module) return res.status(404).json({ error: 'ไม่พบบทเรียน' });
      await prisma.module.delete({ where: { id: module.id } });
      await touchCourseUpdatedAt(req.user!.tenantId, module.courseId);
      return res.json({ data: { lessonNodeId: String(nodeId), deleted: true } });
    }
    const courseId = courseRows[0] ? Number(normalizeId(courseRows[0].course_id)) : null;
    const deleted = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM lesson_nodes
      WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(nodeId)}
    `);

    if (!deleted) {
      return res.status(404).json({ error: 'ไม่พบบทเรียน' });
    }

    if (courseId) {
      await touchCourseUpdatedAt(req.user!.tenantId, courseId);
    }

    return res.json({ data: { lessonNodeId: String(nodeId), deleted: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขคอร์ส' });
    }

    const courseId = parseId(req.params.id);
    const { title, description, subject, level } = req.body;
    const legacyCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    if (legacyCourse) {
      if (legacyCourse.instructorId !== req.user?.userId && req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'ไม่มีสิทธิ์ดำเนินการนี้' });
      }

      const updated = await prisma.course.update({
        where: { id: courseId },
        data: {
          title: typeof title === 'string' && title.trim() ? title.trim() : legacyCourse.title,
          description: typeof description === 'string' ? description : legacyCourse.description,
          subject: typeof subject === 'string' ? subject : legacyCourse.subject,
          level: typeof level === 'string' ? level : legacyCourse.level,
        },
        include: {
          _count: { select: { enrollments: true } },
        },
      });

      return res.json({
        id: String(updated.id),
        title: updated.title,
        slug: `course-${updated.id}`,
        status: 'draft',
        description: updated.description || '',
        subject: updated.subject || '',
        level: updated.level || '',
        enrollmentCount: updated._count?.enrollments ?? 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    }

    const rows = await prisma.$queryRaw<
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
      UPDATE courses
      SET
        title = COALESCE(${typeof title === 'string' && title.trim() ? title.trim() : null}, title),
        description = CASE WHEN ${typeof description === 'string'} THEN ${typeof description === 'string' ? description : ''} ELSE description END,
        subject = CASE WHEN ${typeof subject === 'string'} THEN ${typeof subject === 'string' ? subject : ''} ELSE subject END,
        level = CASE WHEN ${typeof level === 'string'} THEN ${typeof level === 'string' ? level : ''} ELSE level END,
        updated_at = now()
      WHERE tenant_id = ${BigInt(req.user!.tenantId)} AND id = ${BigInt(courseId)}
      RETURNING
        id,
        title,
        slug,
        status,
        description,
        subject,
        level,
        (
          SELECT COUNT(*)
          FROM enrollments e
          WHERE e.course_id = courses.id AND e.tenant_id = courses.tenant_id
        ) AS enrollment_count,
        created_at,
        updated_at
    `);

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    return res.json({
      id: normalizeId(row.id),
      title: row.title,
      slug: row.slug,
      status: row.status,
      description: row.description || '',
      subject: row.subject || '',
      level: row.level || '',
      enrollmentCount: Number(row.enrollment_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เผยแพร่คอร์ส' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: req.user!.tenantId } });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { status: 'published', publishedAt: new Date() },
    });

    return res.json({
      data: {
        id: String(updated.id),
        status: 'published',
        publishedAt: updated.publishedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/unpublish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์หยุดการเผยแพร่คอร์ส' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: req.user!.tenantId } });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }
    await prisma.course.update({ where: { id: course.id }, data: { status: 'draft', publishedAt: null } });

    return res.json({
      data: {
        id: String(course.id),
        status: 'draft',
        publishedAt: null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบคอร์ส' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: req.user!.tenantId } });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }
    await prisma.module.deleteMany({ where: { courseId: course.id, tenantId: req.user!.tenantId } });
    await prisma.enrollment.deleteMany({ where: { courseId: course.id, tenantId: req.user!.tenantId } });
    await prisma.course.delete({ where: { id: course.id } });

    return res.json({
      data: {
        courseId: String(course.id),
        deleted: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        pricing: true,
        discountCampaigns: {
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    if (!canManageTenantCourse(req.user?.role, course.instructorId, req.user?.userId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดการคอร์สนี้' });
    }

    const billingProfile = await prisma.tutorBillingProfile.findUnique({
      where: { tenantId: req.user!.tenantId },
    });

    res.json({
      course: {
        id: String(course.id),
        title: course.title,
        tenant: course.tenant,
      },
      billingProfile: billingProfile
        ? {
            ...billingProfile,
            revenueSharePct: normalizeDecimal(billingProfile.revenueSharePct),
          }
        : null,
      pricing: mapCoursePricingRecord(course.pricing),
      discounts: course.discountCampaigns.map(mapDiscountCampaignRecord),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    if (!canManageTenantCourse(req.user?.role, course.instructorId, req.user?.userId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดการคอร์สนี้' });
    }

    const billingProfile = await prisma.tutorBillingProfile.findUnique({
      where: { tenantId: req.user!.tenantId },
    });

    const body = req.body as {
      priceMinor?: number | string;
      compareAtPriceMinor?: number | string | null;
      currency?: string;
      allowCoupons?: boolean;
      allowPromotions?: boolean;
      showPricePublicly?: boolean;
      salesStartsAt?: string | null;
      salesEndsAt?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const pricing = await prisma.coursePricing.upsert({
      where: { courseId },
      create: {
        tenantId: course.tenantId,
        courseId,
        tutorBillingProfileId: billingProfile?.id ?? null,
        priceMinor: Number(body.priceMinor || 0),
        compareAtPriceMinor: body.compareAtPriceMinor === null || body.compareAtPriceMinor === undefined || body.compareAtPriceMinor === '' ? null : Number(body.compareAtPriceMinor),
        currency: String(body.currency || 'THB'),
        allowCoupons: body.allowCoupons ?? true,
        allowPromotions: body.allowPromotions ?? true,
        showPricePublicly: body.showPricePublicly ?? true,
        salesStartsAt: normalizeDate(body.salesStartsAt),
        salesEndsAt: normalizeDate(body.salesEndsAt),
        metadata: body.metadata === undefined ? undefined : body.metadata as Prisma.InputJsonValue,
      },
      update: {
        tutorBillingProfileId: billingProfile?.id ?? undefined,
        priceMinor: Number(body.priceMinor || 0),
        compareAtPriceMinor: body.compareAtPriceMinor === null || body.compareAtPriceMinor === undefined || body.compareAtPriceMinor === '' ? null : Number(body.compareAtPriceMinor),
        currency: body.currency?.trim() || undefined,
        allowCoupons: body.allowCoupons ?? undefined,
        allowPromotions: body.allowPromotions ?? undefined,
        showPricePublicly: body.showPricePublicly ?? undefined,
        salesStartsAt: body.salesStartsAt === null ? null : normalizeDate(body.salesStartsAt) ?? undefined,
        salesEndsAt: body.salesEndsAt === null ? null : normalizeDate(body.salesEndsAt) ?? undefined,
        metadata: body.metadata === undefined ? undefined : body.metadata as Prisma.InputJsonValue,
      },
    });

    res.json({
      course: {
        id: String(course.id),
        title: course.title,
        tenant: course.tenant,
      },
      pricing: mapCoursePricingRecord(pricing),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/discounts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = parseId(req.params.id);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    if (!canManageTenantCourse(req.user?.role, course.instructorId, req.user?.userId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดการคอร์สนี้' });
    }

    const body = req.body as {
      mode?: 'AUTO' | 'CODE';
      code?: string | null;
      name?: string;
      description?: string | null;
      discountType?: 'PERCENT' | 'AMOUNT' | 'FREE';
      discountValue?: number | string | null;
      discountAmountMinor?: number | string | null;
      currency?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
      stackable?: boolean;
      priority?: number | string;
      maxRedemptions?: number | string | null;
      maxRedemptionsPerStudent?: number | string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const discountType = body.discountType || 'PERCENT';
    const campaign = await prisma.discountCampaign.create({
      data: {
        tenantId: course.tenantId,
        courseId,
        tutorBillingProfileId: null,
        mode: body.mode || 'AUTO',
        code: body.code?.trim().toUpperCase() || null,
        name: body.name?.trim() || 'โปรโมชั่นใหม่',
        description: body.description?.trim() || null,
        discountType,
        discountValue: discountType === 'PERCENT'
          ? normalizeDecimal(body.discountValue)
          : null,
        discountAmountMinor: discountType === 'AMOUNT'
          ? (body.discountAmountMinor === null || body.discountAmountMinor === undefined || body.discountAmountMinor === ''
            ? null
            : Number(body.discountAmountMinor))
          : null,
        currency: String(body.currency || 'THB'),
        status: body.status || 'DRAFT',
        stackable: body.stackable ?? false,
        priority: body.priority === null || body.priority === undefined || body.priority === '' ? 0 : Number(body.priority),
        maxRedemptions: body.maxRedemptions === null || body.maxRedemptions === undefined || body.maxRedemptions === '' ? null : Number(body.maxRedemptions),
        maxRedemptionsPerStudent: body.maxRedemptionsPerStudent === null || body.maxRedemptionsPerStudent === undefined || body.maxRedemptionsPerStudent === '' ? null : Number(body.maxRedemptionsPerStudent),
        startsAt: normalizeDate(body.startsAt),
        endsAt: normalizeDate(body.endsAt),
        metadata: body.metadata === undefined ? undefined : body.metadata as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({
      course: {
        id: String(course.id),
        title: course.title,
        tenant: course.tenant,
      },
      campaign: mapDiscountCampaignRecord(campaign),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/discounts/:discountId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = parseId(req.params.id);
    const discountId = parseId(req.params.discountId);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      select: {
        id: true,
        instructorId: true,
      },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }
    if (!canManageTenantCourse(req.user?.role, course.instructorId, req.user?.userId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดการคอร์สนี้' });
    }

    const body = req.body as {
      name?: string;
      description?: string | null;
      code?: string | null;
      discountType?: 'PERCENT' | 'AMOUNT' | 'FREE';
      discountValue?: number | string | null;
      discountAmountMinor?: number | string | null;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
      stackable?: boolean;
      priority?: number | string;
      maxRedemptions?: number | string | null;
      maxRedemptionsPerStudent?: number | string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const existing = await prisma.discountCampaign.findFirst({
      where: {
        id: discountId,
        tenantId: req.user!.tenantId,
        courseId,
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบโปรโมชัน' });
    }

    const updated = await prisma.discountCampaign.update({
      where: { id: discountId },
      data: {
        name: body.name?.trim() || undefined,
        description: body.description === null ? null : body.description?.trim() || undefined,
        code: body.code === null ? null : body.code?.trim().toUpperCase() || undefined,
        discountType: body.discountType || undefined,
        discountValue: body.discountType === 'PERCENT'
          ? (body.discountValue === null || body.discountValue === undefined || body.discountValue === ''
            ? null
            : Number(body.discountValue))
          : undefined,
        discountAmountMinor: body.discountType === 'AMOUNT'
          ? (body.discountAmountMinor === null || body.discountAmountMinor === undefined || body.discountAmountMinor === ''
            ? null
            : Number(body.discountAmountMinor))
          : undefined,
        status: body.status || undefined,
        stackable: body.stackable ?? undefined,
        priority: body.priority === null || body.priority === undefined || body.priority === '' ? undefined : Number(body.priority),
        maxRedemptions: body.maxRedemptions === null || body.maxRedemptions === undefined || body.maxRedemptions === '' ? null : Number(body.maxRedemptions),
        maxRedemptionsPerStudent: body.maxRedemptionsPerStudent === null || body.maxRedemptionsPerStudent === undefined || body.maxRedemptionsPerStudent === '' ? null : Number(body.maxRedemptionsPerStudent),
        startsAt: body.startsAt === null ? null : body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt === null ? null : body.endsAt ? new Date(body.endsAt) : undefined,
        metadata: body.metadata === undefined ? undefined : (body.metadata as Prisma.InputJsonValue),
      },
    });

    res.json({ campaign: mapDiscountCampaignRecord(updated) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/discounts/:discountId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = parseId(req.params.id);
    const discountId = parseId(req.params.discountId);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      select: {
        id: true,
        instructorId: true,
      },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }
    if (!canManageTenantCourse(req.user?.role, course.instructorId, req.user?.userId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์จัดการคอร์สนี้' });
    }

    const deleted = await prisma.discountCampaign.deleteMany({
      where: {
        id: discountId,
        tenantId: req.user!.tenantId,
        courseId,
      },
    });

    if (!deleted.count) {
      return res.status(404).json({ error: 'ไม่พบโปรโมชัน' });
    }

    res.json({ deleted: true, discountId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single course details with modules
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const courseId = parseId(id);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        instructor: { select: { name: true, email: true } },
        modules: { orderBy: { order: 'asc' } },
        pricing: true,
        _count: { select: { enrollments: true } },
      }
    });

    if (!course) {
      const legacyCourse = await buildLegacyCourseResponse(String(req.user!.tenantId), String(courseId));
      if (!legacyCourse) {
        return res.status(404).json({ error: 'ไม่พบคอร์ส' });
      }

      const legacyPricing = await prisma.coursePricing.findUnique({
        where: { courseId },
      }).catch(() => null);

      return res.json({
        ...legacyCourse,
        pricing: legacyPricing ? mapCoursePricingRecord(legacyPricing) : null,
      });
    }

    const [tree, stats] = await Promise.all([
      findLegacyLessonNodes(String(req.user!.tenantId), String(courseId)).catch(() => []),
      buildCourseStats(Number(req.user!.tenantId), Number(courseId)),
    ]);
    res.json({
      ...normalizePrismaCourse(course),
      ...stats,
      modules: buildModulesFromTree(tree),
      tree,
      pricing: mapCoursePricingRecord(course.pricing),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
