import fs from 'fs';
import path from 'path';

const localMediaRootDir = path.join(__dirname, '../../../backend/uploads/media');

function sanitizeMarkerFileName(value: string, fallback: string) {
  const normalized = String(value || '')
    .normalize('NFKC')
    .replace(/[\/\\\0]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function buildCourseMarkerKey(tenantSlug: string, courseId: string, markerName: string) {
  return `media/${tenantSlug}/course-${courseId}/${markerName}`;
}

function buildLessonMarkerKey(tenantSlug: string, courseId: string, lessonNodeId: string, markerName: string) {
  return `media/${tenantSlug}/course-${courseId}/lesson-${lessonNodeId}/${markerName}`;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeLocalMarker(objectPath: string) {
  ensureDir(path.dirname(objectPath));
  fs.writeFileSync(objectPath, '');
}

function deleteLocalMarker(objectPath: string) {
  try {
    if (fs.existsSync(objectPath)) {
      fs.unlinkSync(objectPath);
    }
  } catch {
    // ignore local cleanup failures
  }
}

function buildLocalCourseMarkerPath(tenantSlug: string, courseId: string, markerName: string) {
  return path.join(localMediaRootDir, tenantSlug, `course-${courseId}`, markerName);
}

function buildLocalLessonMarkerPath(tenantSlug: string, courseId: string, lessonNodeId: string, markerName: string) {
  return path.join(localMediaRootDir, tenantSlug, `course-${courseId}`, `lesson-${lessonNodeId}`, markerName);
}

async function upsertMarkerObject(nextKey: string, previousKey?: string | null) {
  return nextKey;
}

export async function syncCourseMarker(input: {
  tenantSlug: string;
  courseId: string;
  previousTitle?: string | null;
  nextTitle: string;
}) {
  const markerName = sanitizeMarkerFileName(input.nextTitle, `course-${input.courseId}`);
  const previousMarkerName = input.previousTitle
    ? sanitizeMarkerFileName(input.previousTitle, `course-${input.courseId}`)
    : null;
  const nextKey = buildCourseMarkerKey(input.tenantSlug, input.courseId, markerName);
  const previousKey = previousMarkerName && previousMarkerName !== markerName
    ? buildCourseMarkerKey(input.tenantSlug, input.courseId, previousMarkerName)
    : null;

  const nextLocalPath = buildLocalCourseMarkerPath(input.tenantSlug, input.courseId, markerName);
  const previousLocalPath = previousMarkerName && previousMarkerName !== markerName
    ? buildLocalCourseMarkerPath(input.tenantSlug, input.courseId, previousMarkerName)
    : null;

  if (previousLocalPath) {
    deleteLocalMarker(previousLocalPath);
  }
  writeLocalMarker(nextLocalPath);

  return upsertMarkerObject(nextKey, previousKey);
}

export async function syncLessonMarker(input: {
  tenantSlug: string;
  courseId: string;
  lessonNodeId: string;
  previousTitle?: string | null;
  nextTitle: string;
}) {
  const markerName = sanitizeMarkerFileName(input.nextTitle, `lesson-${input.lessonNodeId}`);
  const previousMarkerName = input.previousTitle
    ? sanitizeMarkerFileName(input.previousTitle, `lesson-${input.lessonNodeId}`)
    : null;
  const nextKey = buildLessonMarkerKey(input.tenantSlug, input.courseId, input.lessonNodeId, markerName);
  const previousKey = previousMarkerName && previousMarkerName !== markerName
    ? buildLessonMarkerKey(input.tenantSlug, input.courseId, input.lessonNodeId, previousMarkerName)
    : null;

  const nextLocalPath = buildLocalLessonMarkerPath(input.tenantSlug, input.courseId, input.lessonNodeId, markerName);
  const previousLocalPath = previousMarkerName && previousMarkerName !== markerName
    ? buildLocalLessonMarkerPath(input.tenantSlug, input.courseId, input.lessonNodeId, previousMarkerName)
    : null;

  if (previousLocalPath) {
    deleteLocalMarker(previousLocalPath);
  }
  writeLocalMarker(nextLocalPath);

  return upsertMarkerObject(nextKey, previousKey);
}
