import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import multer from 'multer';
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { userHasCourseAccess } from '../lib/course-access';
import { buildCompactUploadFileName, decodeMultipartFilename } from '../lib/multipart';
import prisma from '../lib/prisma';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads');
const mediaRootDir = path.join(uploadsDir, 'media');
const mediaSourceRootDir = path.join(uploadsDir, 'media-sources');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MEDIA_TOKEN_TTL_SECONDS = Number(process.env.MEDIA_TOKEN_TTL_SECONDS || 15 * 60);
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_PUBLIC_BASE_URL = (process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const MEDIA_UPLOAD_MAX_MB = Number(process.env.MEDIA_UPLOAD_MAX_MB || 2048);
const LESSON_ASSET_UPLOAD_MAX_MB = Number(process.env.LESSON_ASSET_UPLOAD_MAX_MB || 100);
const MEDIA_CHUNK_MAX_MB = Number(process.env.MEDIA_CHUNK_MAX_MB || 2);
const MEDIA_CHUNK_TARGET_MB = Number(process.env.MEDIA_CHUNK_TARGET_MB || 0.25);
const MEDIA_SESSION_TTL_MS = Number(process.env.MEDIA_SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const MEDIA_CLEANUP_INTERVAL_MS = Number(process.env.MEDIA_CLEANUP_INTERVAL_MS || 60 * 60 * 1000);
const MEDIA_JOB_TTL_MS = Number(process.env.MEDIA_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const MEDIA_JOB_POLL_MS = Number(process.env.MEDIA_JOB_POLL_MS || 5000);
const activeTranscodeProcesses = new Map<string, Set<ChildProcess>>();
const cancelledTranscodeJobs = new Set<string>();
const r2Client = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';

type RenditionKey = '720p';

type MediaManifest = {
  id: string;
  tenantId: number;
  moduleId: number;
  courseId: number;
  objectPrefix?: string;
  originalFileName: string;
  originalMimeType: string;
  status: VideoStatus;
  stage?: string;
  progress?: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  sourcePath?: string;
  posterPath?: string;
  r2?: {
    source?: string | null;
    poster?: string | null;
    renditions?: Record<RenditionKey, string | null>;
    hls?: {
      master?: string | null;
      variants?: Record<RenditionKey, string | null>;
      segments?: Record<RenditionKey, string[]>;
    };
    manifest?: string | null;
  };
  renditions: Record<RenditionKey, { path: string; height: number; mimeType: string } | null>;
  transcript?: {
    language: string;
    fullText: string;
    segments: Array<{ id: string; startMs: number; endMs: number; text: string }>;
  } | null;
  playbackToken?: string;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFilesRecursive(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(fullPath);
    return [fullPath];
  });
}

function getMediaDir(tenantId: number, moduleId: number, mediaId: string) {
  return path.join(mediaRootDir, String(tenantId), String(moduleId), mediaId);
}

function getManifestPath(tenantId: number, moduleId: number, mediaId: string) {
  return path.join(getMediaDir(tenantId, moduleId, mediaId), 'manifest.json');
}

function buildSourceFileName(target: MediaTarget, mediaId: string, originalName: string) {
  const ext = path.extname(originalName || '') || '.mp4';
  const lessonLabel = sanitizeMarkerFileName(target.title, `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`);
  return `${lessonLabel}__${mediaId}${ext}`;
}

function getSourceDir(target: MediaTarget) {
  const tenantPart = slugifyPathPart(target.tenantSlug, `tenant-${target.tenantId}`);
  const coursePart = `course-${target.courseId}`;
  const lessonPart = `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`;
  return path.join(mediaSourceRootDir, tenantPart, coursePart, lessonPart);
}

function createSourceFilePath(target: MediaTarget, mediaId: string, originalName: string) {
  const dir = getSourceDir(target);
  ensureDir(dir);
  return path.join(dir, buildSourceFileName(target, mediaId, originalName));
}

function readManifest(tenantId: number, moduleId: number, mediaId: string): MediaManifest | null {
  const manifestPath = getManifestPath(tenantId, moduleId, mediaId);
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as MediaManifest;
}

function writeManifest(manifest: MediaManifest) {
  const dir = getMediaDir(manifest.tenantId, manifest.moduleId, manifest.id);
  ensureDir(dir);
  fs.writeFileSync(getManifestPath(manifest.tenantId, manifest.moduleId, manifest.id), JSON.stringify(manifest, null, 2));
}

function updateManifest(tenantId: number, moduleId: number, mediaId: string, patch: Partial<MediaManifest>) {
  const manifest = readManifest(tenantId, moduleId, mediaId);
  if (!manifest) return null;
  const nextManifest = { ...manifest, ...patch, updatedAt: new Date().toISOString() };
  writeManifest(nextManifest);
  return nextManifest;
}

async function uploadBufferToR2(objectKey: string, body: Buffer | string, contentType: string) {
  if (!r2Client || !R2_BUCKET_NAME) {
    return null;
  }
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    Body: buffer,
    ContentLength: buffer.length,
    ContentType: contentType,
  }));
  return buildR2PublicUrl(objectKey);
}

function buildRfc5987Filename(value: string) {
  const normalized = decodeMultipartFilename(value).normalize('NFKC');
  const fallback = normalized
    .replace(/[^\x20-\x7E]+/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'download';
  return {
    asciiFallback: fallback,
    utf8Value: encodeURIComponent(normalized),
  };
}

function buildContentDisposition(value: string) {
  const { asciiFallback, utf8Value } = buildRfc5987Filename(value);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Value}`;
}

async function uploadFileToR2(objectKey: string, filePath: string, contentType: string, downloadName?: string | null) {
  if (!r2Client || !R2_BUCKET_NAME) {
    return null;
  }
  const stat = fs.statSync(filePath);
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    Body: fs.createReadStream(filePath),
    ContentLength: stat.size,
    ContentType: contentType,
    ...(downloadName ? { ContentDisposition: buildContentDisposition(downloadName) } : {}),
  }));
  return buildR2PublicUrl(objectKey);
}

async function deleteObjectFromR2(objectKey: string) {
  if (!r2Client || !R2_BUCKET_NAME) {
    return false;
  }
  await r2Client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  }));
  return true;
}

async function listObjectKeysFromR2(prefix: string) {
  if (!r2Client || !R2_BUCKET_NAME) {
    return [];
  }
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await r2Client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    (response.Contents || []).forEach((item) => {
      if (item.Key) keys.push(item.Key);
    });
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

function buildR2PublicUrl(objectKey: string) {
  if (!R2_PUBLIC_BASE_URL) return null;
  const encodedKey = objectKey.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${R2_PUBLIC_BASE_URL}/${encodedKey}`;
}

function extractObjectKeyFromPublicUrl(publicUrl?: string | null) {
  if (!publicUrl) return null;
  try {
    const parsed = new URL(publicUrl);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, '')) || null;
  } catch {
    return null;
  }
}

function probeVideoHeight(filePath: string) {
  const ffprobe = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=height',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { stdio: 'pipe' });
  if (ffprobe.status !== 0) {
    const stderr = ffprobe.stderr?.toString('utf8') || 'ffprobe failed';
    throw new Error(stderr.trim());
  }
  const height = Number(String(ffprobe.stdout || '').trim());
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('Unable to read video resolution');
  }
  return height;
}

function cleanupMediaTemp(dirPath?: string | null) {
  if (!dirPath) return;
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Failed to cleanup media temp:', error);
  }
}

function cleanupLocalSource(sourcePath?: string | null) {
  if (!sourcePath) return;
  try {
    if (fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath);
    }
  } catch (error) {
    console.error('Failed to cleanup source file:', error);
  }
}

async function cleanupMediaArtifactDirectory(mediaDir: string, manifest?: MediaManifest | null) {
  if (manifest?.r2) {
    const keys = new Set<string>();
    const collect = (url?: string | null) => {
      const key = extractObjectKeyFromPublicUrl(url);
      if (key) keys.add(key);
    };

    collect(manifest.r2.source);
    collect(manifest.r2.poster);
    collect(manifest.r2.manifest);
    Object.values(manifest.r2.renditions || {}).forEach(collect);
    Object.values(manifest.r2.hls?.variants || {}).forEach(collect);
    Object.values(manifest.r2.hls?.segments || {}).flat().forEach(collect);
    collect(manifest.r2.hls?.master);

    await Promise.all(Array.from(keys).map((key) => deleteObjectFromR2(key).catch(() => false)));
  }

  cleanupMediaTemp(mediaDir);
}

async function cleanupDuplicateMediaArtifacts(tenantId: number, moduleId: number, keepMediaId: string) {
  const moduleDir = path.join(mediaRootDir, String(tenantId), String(moduleId));
  if (!fs.existsSync(moduleDir)) return;
  const entries = fs.readdirSync(moduleDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'sessions' || entry.name === keepMediaId) {
      continue;
    }
    const mediaDir = path.join(moduleDir, entry.name);
    const manifest = readManifest(tenantId, moduleId, entry.name);
    await cleanupMediaArtifactDirectory(mediaDir, manifest);
  }
}

async function cleanupNonHlsObjectsForPrefix(objectPrefix: string) {
  const keys = await listObjectKeysFromR2(`${objectPrefix}/`);
  const removable = keys.filter((key) => !key.startsWith(`${objectPrefix}/hls/`));
  await Promise.all(removable.map((key) => deleteObjectFromR2(key).catch(() => false)));
}

function hasCompleteR2Delivery(manifest: MediaManifest) {
  const hls = manifest.r2?.hls;
  const hlsReady = Boolean(
    hls?.master
    && hls.variants?.['720p']
    && hls.segments?.['720p']?.length,
  );
  return hlsReady;
}

function cleanupLocalRenderedMedia(manifest: MediaManifest) {
  for (const rendition of Object.values(manifest.renditions)) {
    cleanupLocalSource(rendition?.path);
  }
  cleanupMediaTemp(path.join(getMediaDir(manifest.tenantId, manifest.moduleId, manifest.id), 'hls'));
}

function cleanupStaleMediaSessions() {
  const now = Date.now();
  if (!fs.existsSync(mediaRootDir)) return;
  const tenants = fs.readdirSync(mediaRootDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const tenantEntry of tenants) {
    const tenantDir = path.join(mediaRootDir, tenantEntry.name);
    const moduleEntries = fs.readdirSync(tenantDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const moduleEntry of moduleEntries) {
      const moduleDir = path.join(tenantDir, moduleEntry.name);
      const sessionsDir = path.join(moduleDir, 'sessions');
      if (!fs.existsSync(sessionsDir)) continue;
      const sessionEntries = fs.readdirSync(sessionsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
      for (const sessionEntry of sessionEntries) {
        const sessionDir = path.join(sessionsDir, sessionEntry.name);
        const sessionManifestPath = path.join(sessionDir, 'session.json');
        let shouldDelete = false;
        try {
          if (!fs.existsSync(sessionManifestPath)) {
            shouldDelete = true;
          } else {
            const session = JSON.parse(fs.readFileSync(sessionManifestPath, 'utf8')) as Partial<UploadSession>;
            const updatedAt = Number(new Date(session.updatedAt || session.createdAt || 0).getTime());
            if (!Number.isFinite(updatedAt) || now - updatedAt > MEDIA_SESSION_TTL_MS) {
              shouldDelete = true;
            }
          }
        } catch {
          shouldDelete = true;
        }
        if (shouldDelete) {
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (error) {
            console.error('Failed to cleanup stale media session:', error);
          }
        }
      }
      try {
        if (fs.existsSync(sessionsDir) && fs.readdirSync(sessionsDir).length === 0) {
          fs.rmSync(sessionsDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('Failed to cleanup sessions dir:', error);
      }
    }
  }
}

function cleanupStaleMediaJobs() {
  const now = Date.now();
  const jobs = listJobs();
  for (const job of jobs) {
    const updatedAt = Number(new Date(job.updatedAt || job.createdAt || 0).getTime());
    if (!Number.isFinite(updatedAt) || now - updatedAt > MEDIA_JOB_TTL_MS) {
      try {
        fs.unlinkSync(getJobPath(job.id));
      } catch {}
    }
  }
}

let mediaCleanupTimer: NodeJS.Timeout | null = null;
export function startMediaCleanupScheduler() {
  if (mediaCleanupTimer) return;
  cleanupStaleMediaSessions();
  cleanupStaleMediaJobs();
  mediaCleanupTimer = setInterval(() => {
    cleanupStaleMediaSessions();
    cleanupStaleMediaJobs();
  }, MEDIA_CLEANUP_INTERVAL_MS);
  mediaCleanupTimer.unref?.();
}

startMediaCleanupScheduler();

async function processMediaTranscodeJob(job: MediaJob, maxAttempts = 2) {
  const { tenantId, moduleId, mediaId } = job;
  const jobId = job.id;
  clearTranscodeJobCancellation(jobId);
  const manifest = readManifest(tenantId, moduleId, mediaId);
  if (!manifest?.sourcePath || !fs.existsSync(manifest.sourcePath)) {
    throw new Error('Source video not found');
  }
  // Transcoding is file/manifest based. Do not make the job depend on the
  // legacy PostgreSQL lesson tables or on a stale Prisma client. Metadata is
  // best-effort and will be synced when the SQLite database is available.
  const target = await findMediaTargetByKind(tenantId, moduleId, job.targetKind || 'module').catch(() => ({
    id: moduleId,
    tenantId,
    courseId: manifest.courseId,
    title: `lesson-${moduleId}`,
    tenantName: 'educator',
    tenantSlug: 'educator',
    courseTitle: `course-${manifest.courseId}`,
    kind: job.targetKind || 'module',
  } as MediaTarget)) as MediaTarget;
  const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (ffmpegCheck.status !== 0) {
    throw new Error('ffmpeg is not installed on this server');
  }

  const assetDir = getMediaDir(tenantId, moduleId, mediaId);
  ensureDir(assetDir);
  const sourcePath = manifest.sourcePath;
  const objectPrefix = manifest.objectPrefix || buildMediaObjectPrefix(target, mediaId);
  const targets: Array<{ key: RenditionKey; height: number }> = [
    { key: '720p', height: 720 },
  ];
  updateManifest(tenantId, moduleId, mediaId, {
    status: 'processing',
    stage: 'transcoding',
    progress: 40,
    error: null,
  });
  try {
    if (isTranscodeJobCancelled(jobId)) {
      throw new Error('Video upload cancelled');
    }
    for (const [index, target] of targets.entries()) {
      const outputPath = path.join(assetDir, `${target.key}.mp4`);
      updateManifest(tenantId, moduleId, mediaId, {
        stage: `transcoding:${target.key}`,
        progress: 40 + (index * 15),
      });
      await transcodeWithFfmpeg(jobId, sourcePath, outputPath, target.height);
      if (isTranscodeJobCancelled(jobId)) {
        throw new Error('Video upload cancelled');
      }
      const current = readManifest(tenantId, moduleId, mediaId);
      if (!current) return;
      current.renditions[target.key] = { path: outputPath, height: target.height, mimeType: 'video/mp4' };
      current.progress = 45 + (index * 15);
      current.updatedAt = new Date().toISOString();
      writeManifest(current);
    }
    const hlsDir = path.join(assetDir, 'hls');
    ensureDir(hlsDir);
    if (isTranscodeJobCancelled(jobId)) {
      throw new Error('Video upload cancelled');
    }
    let current = readManifest(tenantId, moduleId, mediaId);
    if (!current) return;
    current.stage = 'hls';
    current.progress = 88;
    writeManifest(current);
    try {
      current.r2 = current.r2 || { source: null, poster: null, renditions: { '720p': null }, hls: { master: null, variants: { '720p': null }, segments: { '720p': [] } }, manifest: null };
      current.r2.hls = current.r2.hls || { master: null, variants: { '720p': null }, segments: { '720p': [] } };
      current.r2.source = null;
      current.r2.poster = null;
      current.r2.manifest = null;
      current.r2.renditions = { '720p': null };
      await cleanupNonHlsObjectsForPrefix(objectPrefix);
      const variantEntries: Array<{ key: RenditionKey; playlistPath: string; objectPrefix: string }> = [];
      for (const target of targets) {
        const variantDir = path.join(hlsDir, target.key);
        const playlistPath = await transcodeToHls(jobId, sourcePath, variantDir, target.height);
        if (isTranscodeJobCancelled(jobId)) {
          throw new Error('Video upload cancelled');
        }
        variantEntries.push({
          key: target.key,
          playlistPath,
          objectPrefix: `${objectPrefix}/hls/${target.key}`,
        });
      }
      const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
      variantEntries.forEach((entry) => {
        const bandwidth = 2500000;
        const resolution = '1280x720';
        masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`);
        masterLines.push(`${entry.key}/index.m3u8`);
      });
      const masterPlaylist = masterLines.join('\n');
      fs.writeFileSync(path.join(hlsDir, 'master.m3u8'), masterPlaylist, 'utf8');
      current.r2.hls.master = await uploadBufferToR2(`${objectPrefix}/hls/master.m3u8`, masterPlaylist, 'application/vnd.apple.mpegurl');
      for (const entry of variantEntries) {
        const uploaded = await uploadDirectoryToR2(path.dirname(entry.playlistPath), entry.objectPrefix);
        current.r2.hls!.variants![entry.key] = uploaded.find((item) => item.includes('/index.m3u8')) || null;
        current.r2.hls!.segments![entry.key] = uploaded.filter((item) => item.endsWith('.ts'));
      }
      current.progress = 92;
      current.updatedAt = new Date().toISOString();
      writeManifest(current);
    } catch (error) {
      console.error('HLS generation/sync failed:', error);
    }
    current = readManifest(tenantId, moduleId, mediaId) || current;
    current.status = 'ready';
    current.stage = 'ready';
    current.progress = 100;
    current.updatedAt = new Date().toISOString();
    writeManifest(current);
    await updateMediaTargetVideo(target, mediaId, current).catch((error) => {
      // A metadata sync failure must not turn a completed transcode into a
      // failed upload. The manifest remains the source of truth for playback.
      console.error('Failed to sync video metadata after transcode:', error);
    });
    if (hasCompleteR2Delivery(current)) {
      cleanupLocalRenderedMedia(current);
    }
  } catch (error: any) {
    const message = error?.message || 'Unknown media processing error';
    throw new Error(message);
  } finally {
    clearTranscodeJobCancellation(jobId);
  }
}

async function processPendingMediaJobs() {
  for (const job of listJobs().filter((item) => item.status === 'cancelled')) {
    deleteJob(job.id);
  }
  const pendingJobs = listJobs().filter((job) => job.status === 'pending' || job.status === 'failed');
  for (const job of pendingJobs) {
    const current = readJob(job.id);
    if (!current || current.status === 'running' || current.status === 'done') continue;
    if (isTranscodeJobCancelled(current.id)) {
      deleteJob(current.id);
      continue;
    }
    current.status = 'running';
    current.updatedAt = new Date().toISOString();
    writeJob(current);
    try {
      await processMediaTranscodeJob(current, current.maxAttempts);
      current.status = 'done';
      current.updatedAt = new Date().toISOString();
      current.error = null;
      writeJob(current);
    } catch (error: any) {
      current.attempts += 1;
      current.status = current.attempts < current.maxAttempts ? 'pending' : 'failed';
      current.error = error?.message || 'Unknown job error';
      current.updatedAt = new Date().toISOString();
      if (isTranscodeJobCancelled(current.id) || current.error?.includes('cancelled')) {
        deleteJob(current.id);
        updateManifest(current.tenantId, current.moduleId, current.mediaId, {
          status: 'failed',
          stage: 'cancelled',
          error: 'Video upload cancelled',
        });
        continue;
      }
      writeJob(current);
      updateManifest(current.tenantId, current.moduleId, current.mediaId, {
        status: current.status === 'failed' ? 'failed' : 'processing',
        stage: current.status === 'failed' ? 'failed' : 'retry-scheduled',
        error: current.error,
      });
    }
  }
}

let mediaJobProcessorRunning = false;
export async function startMediaJobProcessor() {
  if (mediaJobProcessorRunning) return;
  mediaJobProcessorRunning = true;
  try {
    await processPendingMediaJobs();
  } finally {
    mediaJobProcessorRunning = false;
  }
}

function signPlaybackToken(payload: Record<string, any>) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyPlaybackToken(token: string) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expected !== signature) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function buildPlaybackUrl(moduleId: number, mediaId: string, token: string, kind: MediaTarget['kind'] = 'module') {
  const base = kind === 'lesson-node' ? 'lesson-nodes' : 'modules';
  return `/api/${base}/${moduleId}/videos/play?mediaId=${encodeURIComponent(mediaId)}&token=${encodeURIComponent(token)}`;
}

function getMediaPublicBaseUrl(req: AuthRequest) {
  const configured = process.env.MEDIA_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function canAccessVideo(req: AuthRequest, tenantId: number) {
  if (!req.user) return false;
  return req.user.tenantId === tenantId || req.user.platformRole === 'ADMIN';
}

function isTranscodeJobCancelled(jobId: string) {
  return cancelledTranscodeJobs.has(jobId);
}

function registerTranscodeProcess(jobId: string, proc: ChildProcess) {
  const processes = activeTranscodeProcesses.get(jobId) || new Set<ChildProcess>();
  processes.add(proc);
  activeTranscodeProcesses.set(jobId, processes);
  const cleanup = () => {
    const current = activeTranscodeProcesses.get(jobId);
    current?.delete(proc);
    if (current && current.size === 0) {
      activeTranscodeProcesses.delete(jobId);
    }
  };
  proc.once('exit', cleanup);
  proc.once('error', cleanup);
}

function killTranscodeJob(jobId: string) {
  cancelledTranscodeJobs.add(jobId);
  const processes = activeTranscodeProcesses.get(jobId);
  if (!processes || processes.size === 0) return;
  for (const proc of processes) {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
  setTimeout(() => {
    const current = activeTranscodeProcesses.get(jobId);
    if (!current) return;
    for (const proc of current) {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }
  }, 3000).unref?.();
}

function clearTranscodeJobCancellation(jobId: string) {
  cancelledTranscodeJobs.delete(jobId);
}

function runFfmpeg(jobId: string, args: string[], label: string) {
  return new Promise<void>((resolve, reject) => {
    const currentJob = readJob(jobId);
    if (currentJob?.status === 'cancelled' || isTranscodeJobCancelled(jobId)) {
      reject(new Error('Video upload cancelled'));
      return;
    }
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    registerTranscodeProcess(jobId, proc);
    let stderr = '';
    const cancelWatcher = setInterval(() => {
      const job = readJob(jobId);
      if (job?.status === 'cancelled') {
        try {
          proc.kill('SIGTERM');
        } catch {}
      }
    }, 1000);
    cancelWatcher.unref?.();
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', (error) => {
      clearInterval(cancelWatcher);
      reject(error);
    });
    proc.on('close', (code, signal) => {
      clearInterval(cancelWatcher);
      if (isTranscodeJobCancelled(jobId)) {
        reject(new Error('Video upload cancelled'));
        return;
      }
      const current = readJob(jobId);
      if (current?.status === 'cancelled') {
        reject(new Error('Video upload cancelled'));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      const reason = signal ? `ffmpeg ${label} killed by ${signal}` : `ffmpeg ${label} failed`;
      reject(new Error(`${reason}: ${stderr.trim() || 'unknown error'}`));
    });
  });
}

async function transcodeWithFfmpeg(jobId: string, inputPath: string, outputPath: string, height: number) {
  await runFfmpeg(jobId, [
    '-y',
    '-i', inputPath,
    '-vf', `scale=-2:${height}`,
    '-c:v', 'libx264',
    '-preset', process.env.FFMPEG_PRESET || 'veryfast',
    '-crf', process.env.FFMPEG_CRF || '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ], 'transcode');
}

async function transcodeToHls(jobId: string, inputPath: string, outputDir: string, height: number) {
  ensureDir(outputDir);
  const playlistPath = path.join(outputDir, 'index.m3u8');
  const segmentPattern = path.join(outputDir, 'segment-%03d.ts');
  await runFfmpeg(jobId, [
    '-y',
    '-i', inputPath,
    '-vf', `scale=-2:${height}`,
    '-c:v', 'libx264',
    '-preset', process.env.FFMPEG_PRESET || 'veryfast',
    '-crf', process.env.FFMPEG_CRF || '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_segment_filename', segmentPattern,
    playlistPath,
  ], 'hls');
  return playlistPath;
}

async function uploadDirectoryToR2(localDir: string, r2Prefix: string) {
  const files = listFilesRecursive(localDir);
  const results: string[] = [];
  for (const filePath of files) {
    const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
    const objectKey = `${r2Prefix}/${relativePath}`;
    const mimeType =
      filePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl'
      : filePath.endsWith('.ts') ? 'video/mp2t'
      : filePath.endsWith('.mp4') ? 'video/mp4'
      : filePath.endsWith('.json') ? 'application/json'
      : filePath.endsWith('.svg') ? 'image/svg+xml'
      : 'application/octet-stream';
    const publicUrl = await uploadFileToR2(objectKey, filePath, mimeType);
    if (publicUrl) results.push(publicUrl);
  }
  return results;
}

function createPlaceholderPoster(outputPath: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#0b7bdc"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#g)"/>
    <circle cx="640" cy="360" r="108" fill="rgba(255,255,255,0.12)"/>
    <polygon points="612,318 716,360 612,402" fill="#fff"/>
    <text x="50%" y="80%" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="44" text-anchor="middle">CourseChic Video</text>
  </svg>`;
  fs.writeFileSync(outputPath, svg, 'utf8');
}

type UploadSession = {
  id: string;
  tenantId: number;
  moduleId: number;
  originalFileName: string;
  originalMimeType: string;
  totalChunks: number;
  createdAt: string;
  updatedAt: string;
  chunkSize: number;
  tempDir: string;
};

type MediaJob = {
  id: string;
  tenantId: number;
  moduleId: number;
  targetKind?: 'module' | 'lesson-node';
  mediaId: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'running' | 'failed' | 'done' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  error?: string | null;
};

type MediaTarget = {
  id: number;
  tenantId: number;
  courseId: number;
  title: string;
  tenantName: string;
  tenantSlug: string;
  courseTitle: string;
  kind: 'module' | 'lesson-node';
};

function buildTenantObjectKeyPart(target: MediaTarget) {
  return slugifyPathPart(target.tenantSlug || target.tenantName, `tenant-${target.tenantId}`);
}

function slugifyPathPart(value: string, fallback: string) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function sanitizeMarkerFileName(value: string, fallback: string) {
  const normalized = String(value || '')
    .normalize('NFKC')
    .replace(/[\/\\\0]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function buildMediaMarkerBase(target: MediaTarget) {
  const tenantPart = slugifyPathPart(target.tenantSlug, `tenant-${target.tenantId}`);
  return `media/${tenantPart}/course-${target.courseId}`;
}

function getCourseMarkerDir(target: MediaTarget) {
  const tenantPart = slugifyPathPart(target.tenantSlug, `tenant-${target.tenantId}`);
  return path.join(mediaRootDir, tenantPart, `course-${target.courseId}`);
}

function getLessonMarkerDir(target: MediaTarget) {
  const tenantPart = slugifyPathPart(target.tenantSlug, `tenant-${target.tenantId}`);
  return path.join(
    mediaRootDir,
    tenantPart,
    `course-${target.courseId}`,
    `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`,
  );
}

function deleteLocalMarker(markerPath: string) {
  try {
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  } catch {
    // ignore local cleanup failures
  }
}

function writeEmptyMarkerFile(markerDir: string, markerTitle: string, fallbackName: string) {
  ensureDir(markerDir);
  const markerName = sanitizeMarkerFileName(markerTitle, fallbackName);
  const markerPath = path.join(markerDir, markerName);
  fs.writeFileSync(markerPath, '');
  return { markerName, markerPath };
}

function createTitleMarkerFiles(target: MediaTarget) {
  const courseMarker = writeEmptyMarkerFile(getCourseMarkerDir(target), target.courseTitle, `course-${target.courseId}`);
  const lessonMarker = writeEmptyMarkerFile(
    getLessonMarkerDir(target),
    target.title,
    `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`,
  );
  return { courseMarker, lessonMarker };
}

function buildCourseMarkerObjectKey(tenantSlug: string, courseId: string | number, markerName: string) {
  return `media/${slugifyPathPart(tenantSlug, `tenant-${courseId}`)}/course-${courseId}/${markerName}`;
}

function buildLessonMarkerObjectKey(
  tenantSlug: string,
  courseId: string | number,
  lessonNodeId: string | number,
  markerName: string,
  kind: 'lesson' | 'module' = 'lesson',
) {
  return `media/${slugifyPathPart(tenantSlug, `tenant-${courseId}`)}/course-${courseId}/${kind}-${lessonNodeId}/${markerName}`;
}

function buildLocalCourseMarkerPath(tenantSlug: string, courseId: string | number, markerName: string) {
  return path.join(mediaRootDir, slugifyPathPart(tenantSlug, `tenant-${courseId}`), `course-${courseId}`, markerName);
}

function buildLocalLessonMarkerPath(
  tenantSlug: string,
  courseId: string | number,
  lessonNodeId: string | number,
  markerName: string,
  kind: 'lesson' | 'module' = 'lesson',
) {
  return path.join(
    mediaRootDir,
    slugifyPathPart(tenantSlug, `tenant-${courseId}`),
    `course-${courseId}`,
    `${kind}-${lessonNodeId}`,
    markerName,
  );
}

async function upsertMarkerObject(nextKey: string, previousKey?: string | null) {
  try {
    if (previousKey && previousKey !== nextKey) {
      await deleteObjectFromR2(previousKey).catch(() => false);
    }
    await uploadBufferToR2(nextKey, Buffer.alloc(0), 'application/octet-stream');
    return nextKey;
  } catch (error) {
    console.error('Failed to sync marker object to R2', { nextKey, previousKey, error });
    return null;
  }
}

export async function syncCourseMarker(input: {
  tenantSlug: string;
  courseId: string | number;
  previousTitle?: string | null;
  nextTitle: string;
}) {
  const markerName = sanitizeMarkerFileName(input.nextTitle, `course-${input.courseId}`);
  const previousMarkerName = input.previousTitle
    ? sanitizeMarkerFileName(input.previousTitle, `course-${input.courseId}`)
    : null;
  const nextKey = buildCourseMarkerObjectKey(input.tenantSlug, input.courseId, markerName);
  const previousKey = previousMarkerName && previousMarkerName !== markerName
    ? buildCourseMarkerObjectKey(input.tenantSlug, input.courseId, previousMarkerName)
    : null;
  const nextLocalPath = buildLocalCourseMarkerPath(input.tenantSlug, input.courseId, markerName);
  const previousLocalPath = previousMarkerName && previousMarkerName !== markerName
    ? buildLocalCourseMarkerPath(input.tenantSlug, input.courseId, previousMarkerName)
    : null;

  if (previousLocalPath) {
    deleteLocalMarker(previousLocalPath);
  }
  writeEmptyMarkerFile(path.dirname(nextLocalPath), markerName, `course-${input.courseId}`);

  return upsertMarkerObject(nextKey, previousKey);
}

export async function syncLessonMarker(input: {
  tenantSlug: string;
  courseId: string | number;
  lessonNodeId: string | number;
  previousTitle?: string | null;
  nextTitle: string;
  kind?: 'lesson' | 'module';
}) {
  const kind = input.kind || 'lesson';
  const markerName = sanitizeMarkerFileName(input.nextTitle, `${kind}-${input.lessonNodeId}`);
  const previousMarkerName = input.previousTitle
    ? sanitizeMarkerFileName(input.previousTitle, `${kind}-${input.lessonNodeId}`)
    : null;
  const nextKey = buildLessonMarkerObjectKey(input.tenantSlug, input.courseId, input.lessonNodeId, markerName, kind);
  const previousKey = previousMarkerName && previousMarkerName !== markerName
    ? buildLessonMarkerObjectKey(input.tenantSlug, input.courseId, input.lessonNodeId, previousMarkerName, kind)
    : null;
  const nextLocalPath = buildLocalLessonMarkerPath(input.tenantSlug, input.courseId, input.lessonNodeId, markerName, kind);
  const previousLocalPath = previousMarkerName && previousMarkerName !== markerName
    ? buildLocalLessonMarkerPath(input.tenantSlug, input.courseId, input.lessonNodeId, previousMarkerName, kind)
    : null;

  if (previousLocalPath) {
    deleteLocalMarker(previousLocalPath);
  }
  writeEmptyMarkerFile(path.dirname(nextLocalPath), markerName, `${kind}-${input.lessonNodeId}`);

  return upsertMarkerObject(nextKey, previousKey);
}

async function syncTitleMarkersForTarget(target: MediaTarget) {
  await syncCourseMarker({
    tenantSlug: target.tenantSlug,
    courseId: target.courseId,
    nextTitle: target.courseTitle,
  });
  await syncLessonMarker({
    tenantSlug: target.tenantSlug,
    courseId: target.courseId,
    lessonNodeId: target.id,
    nextTitle: target.title,
    kind: target.kind === 'lesson-node' ? 'lesson' : 'module',
  });
}

function buildMediaObjectPrefix(target: MediaTarget, mediaId: string) {
  const tenantPart = buildTenantObjectKeyPart(target);
  const coursePart = `course-${target.courseId}`;
  const lessonPart = `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`;
  return `media/${tenantPart}/${coursePart}/${lessonPart}/${mediaId}`;
}

function buildLessonAssetObjectKey(target: MediaTarget, originalName: string, tenantSlugOverride?: string | null) {
  const tenantPart = slugifyPathPart(tenantSlugOverride || target.tenantSlug || target.tenantName, `tenant-${target.tenantId}`);
  const coursePart = `course-${target.courseId}`;
  const lessonPart = `${target.kind === 'lesson-node' ? 'lesson' : 'module'}-${target.id}`;
  return `media/${tenantPart}/${coursePart}/${lessonPart}/assets/${buildCompactUploadFileName(originalName, 'asset')}`;
}

function guessLessonAssetType(assetType: unknown, fileName?: string | null, mimeType?: string | null): 'pdf' | 'link' | 'image' | 'attachment' | 'assignment' {
  const normalized = String(assetType || '').toLowerCase();
  if (normalized === 'pdf' || normalized === 'link' || normalized === 'image' || normalized === 'attachment' || normalized === 'assignment') {
    return normalized;
  }
  const lowerFileName = String(fileName || '').toLowerCase();
  const lowerMimeType = String(mimeType || '').toLowerCase();
  if (lowerMimeType === 'application/pdf' || lowerFileName.endsWith('.pdf')) return 'pdf';
  if (lowerMimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|svg)$/.test(lowerFileName)) return 'image';
  return 'attachment';
}

function isLessonNodeRoute(req: AuthRequest) {
  return req.baseUrl.endsWith('/lesson-nodes');
}

async function findMediaTarget(req: AuthRequest, targetId: number): Promise<MediaTarget | null> {
  if (!req.user) return null;
  // The deployed educator/student database is SQLite. In that database the
  // former lesson_nodes table is represented by Module rows; do not execute
  // the PostgreSQL-only compatibility query below.
  const sqliteModule = await prisma.module.findFirst({
    where: { id: targetId, tenantId: req.user.tenantId },
    include: { course: { select: { id: true, title: true } } },
  }).catch(() => null);
  if (sqliteModule) {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.tenantId },
      select: { id: true, name: true },
    }).catch(() => null);
    return {
      id: sqliteModule.id,
      tenantId: sqliteModule.tenantId,
      courseId: sqliteModule.courseId,
      title: sqliteModule.title,
      tenantName: organization?.name || 'educator',
      tenantSlug: 'educator',
      courseTitle: sqliteModule.course.title,
      kind: isLessonNodeRoute(req) ? 'lesson-node' : 'module',
    };
  }
  if (isLessonNodeRoute(req)) {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: bigint | number;
      tenant_id: bigint | number;
      course_id: bigint | number;
      title: string;
      tenant_name: string;
      tenant_slug: string;
      course_title: string;
    }>>(
      `SELECT ln.id, ln.tenant_id, ln.course_id, ln.title, t.name AS tenant_name, t.slug AS tenant_slug, c.title AS course_title
       FROM lesson_nodes ln
       LEFT JOIN tenants t ON t.id = ln.tenant_id
       LEFT JOIN courses c ON c.id = ln.course_id
       WHERE ln.id = $1
         AND ln.tenant_id = $2
       LIMIT 1`,
      BigInt(targetId),
      BigInt(req.user.tenantId),
    );
    const row = rows[0];
    return row ? {
      id: Number(row.id),
      tenantId: Number(row.tenant_id),
      courseId: Number(row.course_id),
      title: row.title,
      tenantName: row.tenant_name || row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
      tenantSlug: row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
      courseTitle: row.course_title || `course-${Number(row.course_id)}`,
      kind: 'lesson-node',
    } : null;
  }
  return findMediaTargetByKind(
    req.user.tenantId,
    targetId,
    'module',
  );
}

async function findMediaTargetByKind(
  tenantId: number,
  targetId: number,
  kind: MediaTarget['kind'],
): Promise<MediaTarget | null> {
  const sqliteModule = await prisma.module.findFirst({
    where: { id: targetId, tenantId },
    include: { course: { select: { id: true, title: true } } },
  }).catch(() => null);
  if (sqliteModule) {
    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }).catch(() => null);
    return {
      id: sqliteModule.id,
      tenantId: sqliteModule.tenantId,
      courseId: sqliteModule.courseId,
      title: sqliteModule.title,
      tenantName: organization?.name || 'educator',
      tenantSlug: 'educator',
      courseTitle: sqliteModule.course.title,
      kind,
    };
  }
  if (kind === 'lesson-node') {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: bigint | number;
      tenant_id: bigint | number;
      course_id: bigint | number;
      title: string;
      tenant_name: string;
      tenant_slug: string;
      course_title: string;
    }>>(
      `SELECT ln.id, ln.tenant_id, ln.course_id, ln.title, t.name AS tenant_name, t.slug AS tenant_slug, c.title AS course_title
       FROM lesson_nodes ln
       LEFT JOIN tenants t ON t.id = ln.tenant_id
       LEFT JOIN courses c ON c.id = ln.course_id
       WHERE ln.id = $1
         AND ln.tenant_id = $2
       LIMIT 1`,
      BigInt(targetId),
      BigInt(tenantId),
    );
    const row = rows[0];
    return row ? {
      id: Number(row.id),
      tenantId: Number(row.tenant_id),
      courseId: Number(row.course_id),
      title: row.title,
      tenantName: row.tenant_name || row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
      tenantSlug: row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
      courseTitle: row.course_title || `course-${Number(row.course_id)}`,
      kind: 'lesson-node',
    } : null;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: bigint | number;
    tenant_id: bigint | number;
    course_id: bigint | number;
    title: string;
    tenant_name: string;
    tenant_slug: string;
    course_title: string;
  }>>(
    `SELECT m.id, m.tenant_id, m.course_id, m.title, t.name AS tenant_name, t.slug AS tenant_slug, c.title AS course_title
     FROM modules m
     LEFT JOIN tenants t ON t.id = m.tenant_id
     LEFT JOIN courses c ON c.id = m.course_id
     WHERE m.id = $1
       AND m.tenant_id = $2
     LIMIT 1`,
    BigInt(targetId),
    BigInt(tenantId),
  );
  const row = rows[0];
  return row ? {
    id: Number(row.id),
    tenantId: Number(row.tenant_id),
    courseId: Number(row.course_id),
    title: row.title,
    tenantName: row.tenant_name || row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
    tenantSlug: row.tenant_slug || `tenant-${Number(row.tenant_id)}`,
    courseTitle: row.course_title || `course-${Number(row.course_id)}`,
    kind: 'module',
  } : null;
}

async function updateMediaTargetVideo(target: MediaTarget, mediaId: string, manifest: MediaManifest) {
  const playbackPath = `/api/${target.kind === 'lesson-node' ? 'lesson-nodes' : 'modules'}/${target.id}/videos/play?mediaId=${encodeURIComponent(mediaId)}&tenantId=${encodeURIComponent(String(target.tenantId))}`;
  if (target.kind === 'module') {
    await prisma.module.update({
      where: { id: target.id },
      data: { videoUrl: playbackPath },
    });
    return;
  }

  // SQLite stores both legacy module and lesson-node content in Module.
  await prisma.module.updateMany({
    where: { id: target.id, tenantId: target.tenantId },
    data: { videoUrl: playbackPath },
  });

  // Keep the Nest course tree in sync with the legacy media pipeline. The
  // previous early return left video_assets empty after a successful upload.
  const updated = await prisma.$executeRaw(
    Prisma.sql`UPDATE video_assets
      SET playback_id = ${playbackPath}, status = ${manifest.status},
          hls_url = ${manifest.r2?.hls?.master || null},
          poster_url = ${manifest.r2?.poster || null}, updated_at = CURRENT_TIMESTAMP
      WHERE lesson_node_id = ${BigInt(target.id)} AND provider_asset_id = ${mediaId}`,
  );
  if (updated > 0) return;

  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO video_assets
      (lesson_node_id, provider, provider_asset_id, playback_id, status, hls_url, poster_url, created_at, updated_at)
      VALUES (${BigInt(target.id)}, 'r2', ${mediaId}, ${playbackPath}, ${manifest.status},
              ${manifest.r2?.hls?.master || null}, ${manifest.r2?.poster || null},
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
}

function getJobDir() {
  return path.join(mediaRootDir, 'jobs');
}

function getJobPath(jobId: string) {
  return path.join(getJobDir(), `${jobId}.json`);
}

function writeJob(job: MediaJob) {
  ensureDir(getJobDir());
  fs.writeFileSync(getJobPath(job.id), JSON.stringify(job, null, 2));
}

function deleteJob(jobId: string) {
  try {
    const jobPath = getJobPath(jobId);
    if (fs.existsSync(jobPath)) {
      fs.unlinkSync(jobPath);
      return true;
    }
  } catch (error) {
    console.error('Failed to delete media job:', error);
  }
  return false;
}

function markJobCancelled(jobId: string) {
  const current = readJob(jobId);
  if (current) {
    current.status = 'cancelled';
    current.error = 'Video upload cancelled';
    current.updatedAt = new Date().toISOString();
    writeJob(current);
    return true;
  }
  return false;
}

function readJob(jobId: string): MediaJob | null {
  const jobPath = getJobPath(jobId);
  if (!fs.existsSync(jobPath)) return null;
  return JSON.parse(fs.readFileSync(jobPath, 'utf8')) as MediaJob;
}

function listJobs(): MediaJob[] {
  const dir = getJobDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as MediaJob;
      } catch {
        return null;
      }
    })
    .filter((job): job is MediaJob => Boolean(job));
}

function getUploadSessionDir(tenantId: number, moduleId: number, uploadId: string) {
  return path.join(mediaRootDir, String(tenantId), String(moduleId), 'sessions', uploadId);
}

function getUploadSessionPath(tenantId: number, moduleId: number, uploadId: string) {
  return path.join(getUploadSessionDir(tenantId, moduleId, uploadId), 'session.json');
}

function readUploadSession(tenantId: number, moduleId: number, uploadId: string): UploadSession | null {
  const sessionPath = getUploadSessionPath(tenantId, moduleId, uploadId);
  if (!fs.existsSync(sessionPath)) return null;
  return JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as UploadSession;
}

function writeUploadSession(session: UploadSession) {
  ensureDir(session.tempDir);
  fs.writeFileSync(getUploadSessionPath(session.tenantId, session.moduleId, session.id), JSON.stringify(session, null, 2));
}

function getMediaRouteId(req: AuthRequest) {
  const raw = String((req.params as any).moduleId || (req.params as any).lessonNodeId || '').trim();
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function listSessionChunks(session: UploadSession) {
  if (!fs.existsSync(session.tempDir)) return [];
  return fs.readdirSync(session.tempDir)
    .filter((name) => /^chunk-\d+\.part$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));
}

async function clearMediaTargetVideo(target: MediaTarget, mediaId: string) {
  if (target.kind === 'module') {
    await prisma.module.update({
      where: { id: target.id },
      data: { videoUrl: null },
    });
    return;
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM video_assets
     WHERE lesson_node_id = $1 AND provider_asset_id = $2`,
    BigInt(target.id),
    mediaId,
  );
}

async function cleanupCancelledMediaArtifacts(req: AuthRequest, target: MediaTarget, mediaId: string) {
  const manifest = readManifest(req.user!.tenantId, target.id, mediaId);
  if (manifest) {
    cleanupLocalSource(manifest.sourcePath);
    await cleanupMediaArtifactDirectory(getMediaDir(req.user!.tenantId, target.id, mediaId), manifest);
  } else {
    cleanupMediaTemp(getMediaDir(req.user!.tenantId, target.id, mediaId));
  }
  await clearMediaTargetVideo(target, mediaId);
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as AuthRequest).user?.tenantId;
    const destination = tenantId ? path.join(mediaRootDir, String(tenantId), 'incoming') : path.join(mediaRootDir, 'public', 'incoming');
    ensureDir(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    cb(null, buildCompactUploadFileName(file.originalname, file.fieldname || 'upload'));
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: MEDIA_UPLOAD_MAX_MB * 1024 * 1024,
  },
});

const lessonAssetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as AuthRequest).user?.tenantId;
    const destination = tenantId ? path.join(mediaRootDir, String(tenantId), 'incoming-assets') : path.join(mediaRootDir, 'public', 'incoming-assets');
    ensureDir(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    cb(null, buildCompactUploadFileName(file.originalname, file.fieldname || 'upload'));
  },
});

const lessonAssetUpload = multer({
  storage: lessonAssetStorage,
  limits: {
    fileSize: LESSON_ASSET_UPLOAD_MAX_MB * 1024 * 1024,
  },
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MEDIA_CHUNK_MAX_MB * 1024 * 1024,
  },
});

router.post(['/:moduleId/videos/uploads/session', '/:lessonNodeId/videos/uploads/session'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const target = await findMediaTarget(req, moduleId);
    if (!target) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const originalFileName = String(req.body?.originalFileName || '').trim();
    const originalMimeType = String(req.body?.originalMimeType || 'video/mp4').trim();
    const fileSize = Number(req.body?.fileSize || 0);
    const requestedTotalChunks = Number(req.body?.totalChunks || 0);
    const chunkSizeBytes = Math.max(64 * 1024, Math.round(MEDIA_CHUNK_TARGET_MB * 1024 * 1024));
    const totalChunks = Number.isFinite(fileSize) && fileSize > 0
      ? Math.max(1, Math.ceil(fileSize / chunkSizeBytes))
      : requestedTotalChunks;
    if (!originalFileName || !Number.isInteger(totalChunks) || totalChunks < 1) {
      return res.status(400).json({ error: 'originalFileName and fileSize are required' });
    }
    const uploadId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const tempDir = getUploadSessionDir(req.user.tenantId, moduleId, uploadId);
    ensureDir(tempDir);
    const session: UploadSession = {
      id: uploadId,
      tenantId: req.user.tenantId,
      moduleId,
      originalFileName,
      originalMimeType,
      totalChunks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunkSize: chunkSizeBytes,
      tempDir,
    };
    writeUploadSession(session);
    return res.status(201).json({
      data: {
        uploadId,
        chunkSize: session.chunkSize,
        totalChunks: session.totalChunks,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/videos/uploads/session/:uploadId/chunk', '/:lessonNodeId/videos/uploads/session/:uploadId/chunk'], authenticate, async (req: AuthRequest, res: Response) => {
  chunkUpload.single('chunk')(req as any, res as any, async (uploadError: any) => {
    if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `chunk ใหญ่เกินไป จำกัดไว้ที่ ${MEDIA_CHUNK_MAX_MB} MB`,
      });
    }
    if (uploadError) {
      return res.status(500).json({ error: uploadError.message || 'Upload chunk failed' });
    }
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const moduleId = getMediaRouteId(req);
      const uploadId = String(req.params.uploadId || '').trim();
      const chunkIndex = Number(req.body?.chunkIndex || req.query.chunkIndex || -1);
      if (moduleId === null || !uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
        return res.status(400).json({ error: 'Invalid upload chunk request' });
      }
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'No chunk provided' });
      }
      const session = readUploadSession(req.user.tenantId, moduleId, uploadId);
      if (!session) {
        return res.status(404).json({ error: 'Upload session not found' });
      }
      const chunkPath = path.join(session.tempDir, `chunk-${String(chunkIndex).padStart(6, '0')}.part`);
      fs.writeFileSync(chunkPath, req.file.buffer);
      session.updatedAt = new Date().toISOString();
      writeUploadSession(session);
      return res.json({
        data: {
          uploadId,
          chunkIndex,
          received: chunkIndex + 1,
          totalChunks: session.totalChunks,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });
});

router.delete(['/:moduleId/videos/uploads/session/:uploadId', '/:lessonNodeId/videos/uploads/session/:uploadId'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const uploadId = String(req.params.uploadId || '').trim();
    const mediaId = String(req.body?.mediaId || req.query.mediaId || '').trim();
    if (!uploadId && !mediaId) {
      return res.status(400).json({ error: 'uploadId or mediaId is required' });
    }

    const session = uploadId ? readUploadSession(req.user.tenantId, moduleId, uploadId) : null;
    if (session) {
      cleanupMediaTemp(session.tempDir);
    }
    if (session?.tempDir) {
      try {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to remove upload session dir:', error);
      }
    }

    let target: MediaTarget | null = null;
    if (mediaId) {
      markJobCancelled(`${req.user.tenantId}-${moduleId}-${mediaId}`);
      target = await findMediaTarget(req, moduleId);
      if (target) {
        await cleanupCancelledMediaArtifacts(req, target, mediaId);
      }
    }

    if (session) {
      try {
        fs.rmSync(getUploadSessionDir(req.user.tenantId, moduleId, uploadId), { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to remove upload session artifacts:', error);
      }
    }

    return res.json({
      data: {
        cancelled: true,
        uploadId: uploadId || null,
        mediaId: mediaId || null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/videos/uploads/session/:uploadId/finalize', '/:lessonNodeId/videos/uploads/session/:uploadId/finalize'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const uploadId = String(req.params.uploadId || '').trim();
    const session = readUploadSession(req.user.tenantId, moduleIdSafe, uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    const target = await findMediaTarget(req, moduleIdSafe);
    if (!target) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const chunkFiles = listSessionChunks(session);
    if (chunkFiles.length !== session.totalChunks) {
      return res.status(400).json({ error: `ยังมี chunk ไม่ครบ (${chunkFiles.length}/${session.totalChunks})` });
    }
    const mediaId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const assetDir = getMediaDir(req.user.tenantId, moduleIdSafe, mediaId);
    ensureDir(assetDir);
    const sourcePath = createSourceFilePath(target, mediaId, session.originalFileName);
    const writeStream = fs.createWriteStream(sourcePath);
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(session.tempDir, chunkFile);
      const buffer = fs.readFileSync(chunkPath);
      writeStream.write(buffer);
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });
    fs.rmSync(session.tempDir, { recursive: true, force: true });
    const sourceHeight = probeVideoHeight(sourcePath);
    if (sourceHeight < 720) {
      cleanupMediaTemp(assetDir);
      return res.status(400).json({ error: 'วิดีโอต้นฉบับต้องมีความละเอียดอย่างน้อย 720p' });
    }
    const posterPath = path.join(assetDir, 'poster.svg');
    createPlaceholderPoster(posterPath);
    createTitleMarkerFiles(target);
    await syncTitleMarkersForTarget({
      ...target,
      tenantSlug: target.tenantSlug,
    });
    const objectPrefix = buildMediaObjectPrefix({
      ...target,
      tenantSlug: target.tenantSlug,
    }, mediaId);

    const manifest: MediaManifest = {
      id: mediaId,
      tenantId: req.user.tenantId,
      moduleId: moduleIdSafe,
      courseId: target.courseId,
      originalFileName: session.originalFileName,
      originalMimeType: session.originalMimeType,
      objectPrefix,
      status: 'uploading',
      stage: 'uploading',
      progress: 10,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourcePath,
      posterPath,
      renditions: { '720p': null },
      r2: { source: null, poster: null, renditions: { '720p': null }, manifest: null },
      transcript: null,
    };
    manifest.stage = 'queued';
    manifest.progress = 40;
    writeManifest(manifest);
    await updateMediaTargetVideo(target, mediaId, manifest);
    await cleanupDuplicateMediaArtifacts(req.user.tenantId, moduleIdSafe, mediaId);
    return res.status(201).json({
      data: {
        mediaId,
        moduleId: String(moduleIdSafe),
        status: manifest.status,
        message: 'Resumable upload finalized; transcode can be started now',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/assets/upload', '/:lessonNodeId/assets/upload'], authenticate, async (req: AuthRequest, res: Response) => {
  lessonAssetUpload.single('file')(req as any, res as any, async (uploadError: any) => {
    if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `ไฟล์ใหญ่เกินไป จำกัดไว้ที่ ${LESSON_ASSET_UPLOAD_MAX_MB} MB`,
      });
    }
    if (uploadError) {
      return res.status(500).json({ error: uploadError.message || 'Asset upload failed' });
    }

    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const targetId = getMediaRouteId(req);
      if (targetId === null) {
        return res.status(400).json({ error: 'lessonNodeId is required' });
      }
      const target = await findMediaTarget(req, targetId);
      if (!target) {
        return res.status(404).json({ error: 'Lesson not found' });
      }

      const hasFile = Boolean(req.file?.path);
      const externalUrl = String(req.body?.externalUrl || '').trim() || null;
      const requestedAssetType = String(req.body?.assetType || '').trim();
      const titleFromBody = String(req.body?.title || '').trim();
      const titleFromFile = hasFile ? decodeMultipartFilename(req.file?.originalname || req.file?.filename || '') : '';
      const title = titleFromBody || titleFromFile || 'ไฟล์ประกอบบทเรียน';
      const assetType = hasFile
        ? guessLessonAssetType(requestedAssetType, titleFromFile || null, req.file?.mimetype || null)
        : guessLessonAssetType(requestedAssetType, null, null);

      if (!hasFile && assetType !== 'link') {
        return res.status(400).json({ error: 'No file provided' });
      }
      if (assetType === 'link' && !externalUrl) {
        return res.status(400).json({ error: 'externalUrl is required' });
      }

      let fileUrl: string | null = null;
      let storedMimeType = hasFile ? String(req.file?.mimetype || 'application/octet-stream') : null;
      let storedSizeBytes = hasFile ? Number(req.file?.size || 0) : null;

      if (hasFile && req.file?.path) {
        const originalName = titleFromFile || decodeMultipartFilename(req.file.originalname || req.file.filename || 'asset');
        const objectKey = buildLessonAssetObjectKey(target, originalName);
        fileUrl = await uploadFileToR2(objectKey, req.file.path, storedMimeType || 'application/octet-stream', originalName);
        if (!fileUrl) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
          return res.status(503).json({ error: 'File storage is unavailable' });
        }
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
        if (!fileUrl) {
          return res.status(503).json({ error: 'File storage is unavailable' });
        }
      }

      const sortRows = await prisma.$queryRaw<Array<{ next_sort_order: bigint | number }>>(Prisma.sql`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
        FROM lesson_assets
        WHERE lesson_node_id = ${BigInt(target.id)}
      `);
      const sortOrder = Number(sortRows[0]?.next_sort_order || 0);

      const inserted = await prisma.$queryRaw<Array<{ id: bigint | number }>>(Prisma.sql`
        INSERT INTO lesson_assets (lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes, sort_order, created_at)
        VALUES (
          ${BigInt(target.id)},
          ${assetType},
          ${title},
          ${fileUrl},
          ${externalUrl},
          ${storedMimeType},
          ${storedSizeBytes},
          ${sortOrder},
          now()
        )
        RETURNING id
      `);

      return res.status(201).json({
        data: {
          id: inserted[0] ? String(inserted[0].id) : null,
          lessonNodeId: String(target.id),
          assetType,
          title,
          fileUrl,
          externalUrl,
          mimeType: storedMimeType,
          sizeBytes: storedSizeBytes,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });
});

router.delete(['/:moduleId/assets/:assetId', '/:lessonNodeId/assets/:assetId'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = getMediaRouteId(req);
    const assetId = Number(req.params.assetId);
    if (targetId === null || !Number.isInteger(assetId)) {
      return res.status(400).json({ error: 'assetId is required' });
    }
    const target = await findMediaTarget(req, targetId);
    if (!target) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const rows = await prisma.$queryRaw<Array<{
      id: bigint | number;
      lesson_node_id: bigint | number;
      file_url: string | null;
    }>>(Prisma.sql`
      SELECT id, lesson_node_id, file_url
      FROM lesson_assets
      WHERE id = ${BigInt(assetId)} AND lesson_node_id = ${BigInt(target.id)}
      LIMIT 1
    `);
    const asset = rows[0];
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const objectKey = extractObjectKeyFromPublicUrl(asset.file_url);
    if (objectKey) {
      await deleteObjectFromR2(objectKey).catch(() => false);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM lesson_assets
      WHERE id = ${BigInt(assetId)} AND lesson_node_id = ${BigInt(target.id)}
    `);

    return res.json({
      data: {
        lessonNodeId: String(target.id),
        assetId: String(assetId),
        deleted: true,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/videos/upload', '/:lessonNodeId/videos/upload'], authenticate, upload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    const target = await findMediaTarget(req, moduleId);
    if (!target) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const mediaId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const assetDir = getMediaDir(req.user.tenantId, moduleId, mediaId);
    ensureDir(assetDir);
    const decodedOriginalName = decodeMultipartFilename(req.file.originalname || req.file.filename || 'video.mp4');
    const sourcePath = createSourceFilePath(target, mediaId, decodedOriginalName);
    fs.copyFileSync(req.file.path, sourcePath);
    const sourceHeight = probeVideoHeight(sourcePath);
    if (sourceHeight < 720) {
      cleanupLocalSource(sourcePath);
      cleanupMediaTemp(assetDir);
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'วิดีโอต้นฉบับต้องมีความละเอียดอย่างน้อย 720p' });
    }
    const posterPath = path.join(assetDir, 'poster.svg');
    createPlaceholderPoster(posterPath);
    createTitleMarkerFiles(target);
    await syncTitleMarkersForTarget({
      ...target,
      tenantSlug: target.tenantSlug,
    });
    const objectPrefix = buildMediaObjectPrefix({
      ...target,
      tenantSlug: target.tenantSlug,
    }, mediaId);

    const manifest: MediaManifest = {
      id: mediaId,
      tenantId: req.user.tenantId,
      moduleId,
      courseId: target.courseId,
      originalFileName: decodedOriginalName,
      originalMimeType: req.file.mimetype,
      objectPrefix,
      status: 'uploading',
      stage: 'uploading',
      progress: 10,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourcePath,
      posterPath,
      renditions: { '720p': null },
      r2: {
        source: null,
        poster: null,
        renditions: { '720p': null },
        hls: {
          master: null,
          variants: { '720p': null },
          segments: { '720p': [] },
        },
        manifest: null,
      },
      transcript: null,
    };
    const hlsRoot = path.join(assetDir, 'hls');
    try {
      manifest.r2 = manifest.r2 || {
        source: null,
        poster: null,
        renditions: { '720p': null },
        hls: { master: null, variants: { '720p': null }, segments: { '720p': [] } },
        manifest: null,
      };
      manifest.r2.hls = manifest.r2.hls || {
        master: null,
        variants: { '720p': null },
        segments: { '720p': [] },
      };
      // Build HLS later during transcode.
    } catch (error) {
      console.error('HLS init failed:', error);
    }
    manifest.stage = 'queued';
    manifest.progress = manifest.progress || 40;
    writeManifest(manifest);
    fs.unlinkSync(req.file.path);

    await updateMediaTargetVideo(target, mediaId, manifest);
    await cleanupDuplicateMediaArtifacts(req.user.tenantId, moduleId, mediaId);

    return res.status(201).json({
      data: {
        mediaId,
        moduleId: String(moduleId),
        status: manifest.status,
        message: 'Video uploaded; transcode can be started now',
      },
    });
  } catch (error: any) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `ไฟล์วิดีโอใหญ่เกินไป จำกัดไว้ที่ ${MEDIA_UPLOAD_MAX_MB} MB`,
      });
    }
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/videos/transcode', '/:lessonNodeId/videos/transcode'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const target = await findMediaTarget(req, moduleIdSafe);
    if (!target) {
      return res.status(404).json({ error: 'Video source not found' });
    }
    const mediaId = String(req.body?.mediaId || req.query.mediaId || '').trim();
    if (!mediaId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }
    const manifest = readManifest(req.user.tenantId, moduleIdSafe, mediaId);
    if (!manifest) {
      return res.status(404).json({ error: 'Video manifest not found' });
    }
    const job: MediaJob = {
      id: `${req.user.tenantId}-${moduleIdSafe}-${mediaId}`,
      tenantId: req.user.tenantId,
      moduleId: moduleIdSafe,
      targetKind: target.kind,
      mediaId,
      attempts: 0,
      maxAttempts: 2,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
    };
    writeJob(job);

    return res.status(202).json({
      data: {
        mediaId,
        moduleId: String(moduleIdSafe),
        status: 'processing',
        progress: manifest.progress || 40,
        jobId: job.id,
        message: 'Transcode queued for media worker',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get(['/:moduleId/videos/status', '/:lessonNodeId/videos/status'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    const mediaId = String(req.query.mediaId || '').trim();
    if (moduleId === null || !mediaId) return res.status(400).json({ error: 'mediaId is required' });
    const manifest = readManifest(req.user.tenantId, moduleId, mediaId);
    if (!manifest) {
      return res.status(404).json({ error: 'Video manifest not found' });
    }
    let playbackUrl: string | null = null;
    if (manifest.status === 'ready') {
      const token = manifest.playbackToken && verifyPlaybackToken(manifest.playbackToken)
        ? manifest.playbackToken
        : signPlaybackToken({
            sub: String(req.user.userId),
            tenantId: req.user.tenantId,
            mediaId,
            moduleId,
            courseId: manifest.courseId,
            exp: Date.now() + MEDIA_TOKEN_TTL_SECONDS * 1000,
          });
      if (token !== manifest.playbackToken) {
        manifest.playbackToken = token;
        writeManifest(manifest);
      }
      playbackUrl = buildPlaybackUrl(moduleId, mediaId, token, isLessonNodeRoute(req) ? 'lesson-node' : 'module');
    }
    return res.json({
      data: {
        mediaId,
        moduleId: String(moduleId),
        status: manifest.status,
        stage: manifest.stage || null,
        progress: Number(manifest.progress || 0),
        error: manifest.error || null,
        updatedAt: manifest.updatedAt,
        playbackUrl,
        r2: {
          sourceUrl: manifest.r2?.source || null,
          sourceKey: extractObjectKeyFromPublicUrl(manifest.r2?.source || null),
          posterUrl: manifest.r2?.poster || null,
          posterKey: extractObjectKeyFromPublicUrl(manifest.r2?.poster || null),
          manifestUrl: manifest.r2?.manifest || null,
          manifestKey: extractObjectKeyFromPublicUrl(manifest.r2?.manifest || null),
          masterUrl: manifest.r2?.hls?.master || null,
          masterKey: extractObjectKeyFromPublicUrl(manifest.r2?.hls?.master || null),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/jobs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = Number(req.query.moduleId || 0);
    const jobs = listJobs()
      .filter((job) => job.tenantId === req.user!.tenantId && (!Number.isInteger(moduleId) || moduleId === 0 || job.moduleId === moduleId))
      .sort((a, b) => Number(new Date(b.updatedAt).getTime()) - Number(new Date(a.updatedAt).getTime()))
      .slice(0, 20);
    return res.json({
      data: {
        items: jobs.map((job) => ({
          id: job.id,
          moduleId: String(job.moduleId),
          mediaId: job.mediaId,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          error: job.error || null,
          updatedAt: job.updatedAt,
          createdAt: job.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/:moduleId/videos/play-token', '/:lessonNodeId/videos/play-token'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const target = await findMediaTarget(req, moduleIdSafe);
    if (!target) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const access = await userHasCourseAccess({
      prisma,
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      courseId: target.courseId,
      role: req.user.role,
    });
    if (!access.allowed) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคอร์สนี้' });
    }
    const mediaId = String(req.body?.mediaId || req.query.mediaId || '').trim();
    if (!mediaId) return res.status(400).json({ error: 'mediaId is required' });
    const manifest = readManifest(req.user.tenantId, moduleIdSafe, mediaId);
    if (!manifest) {
      return res.status(404).json({ error: 'Video manifest not found' });
    }
    const token = signPlaybackToken({
      sub: String(req.user.userId),
      tenantId: req.user.tenantId,
      mediaId,
      moduleId: moduleIdSafe,
      courseId: target.courseId,
      exp: Date.now() + MEDIA_TOKEN_TTL_SECONDS * 1000,
    });
    manifest.playbackToken = token;
    writeManifest(manifest);
    return res.json({
      data: {
        token,
        expiresInSeconds: MEDIA_TOKEN_TTL_SECONDS,
        playbackUrl: buildPlaybackUrl(moduleIdSafe, mediaId, token, target.kind),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get(['/:moduleId/videos/play', '/:lessonNodeId/videos/play'], async (req: AuthRequest, res: Response) => {
  try {
    // Browsers request byte ranges when an MP4 is assigned to <video src>.
    // Accept both the legacy token URL and the SQLite Module.videoUrl URL.
    if (!req.query.token && (req.headers.range || req.headers.accept?.includes('video/'))) {
      const moduleId = getMediaRouteId(req);
      const mediaId = String(req.query.mediaId || '').trim();
      let tenantId = Number(req.query.tenantId || 0);
      if (moduleId !== null && !tenantId) {
        // Older playback URLs did not include tenantId. Recover it from the
        // SQLite compatibility record so existing videos do not need a new upload.
        const legacyModule = await prisma.module.findUnique({
          where: { id: moduleId },
          select: { tenantId: true },
        }).catch(() => null);
        tenantId = Number(legacyModule?.tenantId || 0);
      }
      if (moduleId === null || !mediaId || !tenantId) {
        return res.status(400).json({ error: 'Video playback parameters are required' });
      }
      const manifest = readManifest(tenantId, moduleId, mediaId);
      if (!manifest || manifest.status !== 'ready' || !manifest.renditions['720p']?.path) {
        return res.status(404).json({ error: 'Rendered video is unavailable' });
      }
      const videoPath = manifest.renditions['720p']!.path;
      if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Rendered video file is missing' });
      return res.sendFile(path.resolve(videoPath));
    }
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const mediaId = String(req.query.mediaId || '').trim();
    const token = String(req.query.token || '').trim();
    const payload = token ? verifyPlaybackToken(token) : null;
    if (!payload || Number(payload.moduleId) !== moduleIdSafe) {
      return res.status(401).json({ error: 'Invalid playback token' });
    }
    const mediaIdFromToken = String(req.query.mediaId || payload.mediaId || '').trim();
    const tenantIdFromToken = Number(payload.tenantId || 0);
    if (!tenantIdFromToken) {
      return res.status(401).json({ error: 'Invalid playback token' });
    }
    const readyManifest = readManifest(tenantIdFromToken, moduleIdSafe, mediaIdFromToken);
    if (!readyManifest || readyManifest.status !== 'ready') {
      return res.status(409).json({ error: 'Video is not ready yet' });
    }
    const publicBase = getMediaPublicBaseUrl(req);
    const rendition = readyManifest.renditions['720p'];
    if (!rendition) {
      return res.status(409).json({ error: 'No rendered video available' });
    }
    const r2Hls = readyManifest.r2?.hls?.master || null;
    const r2Rendition = readyManifest.r2?.renditions?.['720p'] || null;
    if ((req.headers.accept?.includes('video/') || req.headers.range) && rendition.path && fs.existsSync(rendition.path)) {
      res.setHeader('Content-Type', rendition.mimeType || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.sendFile(path.resolve(rendition.path));
    }
    const localMp4 = `${publicBase.replace(/\/$/, '')}/${path.relative(uploadsDir, rendition.path).replace(/\\/g, '/')}`;
    return res.json({
      data: {
        mediaId: mediaIdFromToken,
        moduleId: String(moduleIdSafe),
        posterUrl: readyManifest.r2?.poster
          || (readyManifest.posterPath ? `${publicBase.replace(/\/$/, '')}/${path.relative(uploadsDir, readyManifest.posterPath).replace(/\\/g, '/')}` : null),
        source: {
          hls: r2Hls,
          mp4: r2Rendition || localMp4,
          r2Mp4: r2Rendition,
        },
        transcript: readyManifest.transcript,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get(['/:moduleId/videos/transcript', '/:lessonNodeId/videos/transcript'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const target = await findMediaTarget(req, moduleIdSafe);
    if (!target) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const access = await userHasCourseAccess({
      prisma,
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      courseId: target.courseId,
      role: req.user.role,
    });
    if (!access.allowed) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคอร์สนี้' });
    }
    const mediaId = String(req.query.mediaId || '').trim();
    const manifest = readManifest(req.user.tenantId, moduleIdSafe, mediaId);
    return res.json({ data: manifest?.transcript || { language: 'th', fullText: '', segments: [] } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put(['/:moduleId/videos/transcript', '/:lessonNodeId/videos/transcript'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const moduleId = getMediaRouteId(req);
    if (moduleId === null) {
      return res.status(400).json({ error: 'moduleId is required' });
    }
    const moduleIdSafe = moduleId;
    const target = await findMediaTarget(req, moduleIdSafe);
    if (!target) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const mediaId = String(req.body?.mediaId || req.query.mediaId || '').trim();
    const manifest = readManifest(req.user.tenantId, moduleIdSafe, mediaId);
    if (!manifest) {
      return res.status(404).json({ error: 'Video manifest not found' });
    }

    const transcript = req.body?.transcript || req.body;
    const language = String(transcript?.language || 'th');
    const fullText = String(transcript?.fullText || transcript?.text || '');
    const segments = Array.isArray(transcript?.segments) ? transcript.segments.map((segment: any, index: number) => ({
      id: String(segment.id || `seg-${index + 1}`),
      startMs: Number(segment.startMs ?? segment.start ?? 0),
      endMs: Number(segment.endMs ?? segment.end ?? segment.startMs ?? segment.start ?? 0),
      text: String(segment.text || '').trim(),
    })) : [];

    manifest.transcript = { language, fullText, segments };
    manifest.updatedAt = new Date().toISOString();
    writeManifest(manifest);
    await updateMediaTargetVideo(target, mediaId, manifest);

    return res.json({ data: manifest.transcript });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
