'use client';

import { FormEvent, type Dispatch, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ApiError,
  createCourse,
  createLessonNode,
  createTutor,
  createPaymentSession,
  confirmPaymentSession,
  deleteCourse,
  deleteLessonAsset,
  deleteLessonNode,
  fetchLandingPageHtml,
  fetchCourseTree,
  fetchCourseDetail,
  fetchCoursePricing,
  fetchCourses,
  fetchPricingConfig,
  fetchNestCourses,
  fetchStudents,
  fetchTenantContext,
  fetchTutors,
  login,
  publishCourse,
  unpublishCourse,
  deleteCourseDiscount,
  saveCoursePricing,
  savePricingConfig,
  saveTutorBillingProfile,
  createCourseDiscount,
  updateCourseDiscount,
  reorderCourseTree,
  reorderCourses,
  saveLandingPageHtml,
  saveLessonAssetFile,
  upsertLessonTranscript,
  upsertLessonContent,
  updateCourse,
  updateLessonNode,
  type CourseItem,
  type CoursePricingResponse,
  type CourseTreeNode,
  type CreateTutorPayload,
  type EducatorSession,
  type LoginPayload,
  type PaymentSessionResult,
  type PaymentConfirmResult,
  type PricingConfig,
  type PricingPackage,
  type PricingTutorOverride,
  type StudentSummary,
  type TenantContext,
  type TutorDirectory,
  type TutorCreateResult,
  type WorkspaceMembershipOption,
} from '../lib/api';
import { VideoUploadPanel } from './video-upload-panel';
import { WorkspaceSidebar } from './workspace-sidebar';
import { useVideoUploadFlow } from './use-video-upload-flow';

type ViewKey = 'overview' | 'courses' | 'students' | 'price' | 'promotion' | 'website' | 'growth';
type PresetId = 'platform' | 'tutor';
type WorkspaceMode = 'owner' | 'tutor';
type ScreenMode = 'login' | 'dashboard';
type ThemeMode = 'dark' | 'light';
type NodeDetailTab = 'overview' | 'content' | 'media' | 'transcript' | 'lesson-assets' | 'exercise-assets';
type TranscriptEditorRow = {
  id: string;
  seek: string;
  text: string;
};
type TranscriptInputMode = 'rows' | 'raw';
type AssetFormState = {
  title: string;
  mimeType: string;
  sizeBytes: string;
  file: File | null;
};
type AssetUploadKind = 'lesson' | 'exercise';
type AssetUploadState =
  | {
      kind: AssetUploadKind;
      stage: 'uploading' | 'finalizing';
      title: string;
      fileName: string;
      fileSize: number;
      progress: number;
      message: string;
    }
  | {
      kind: AssetUploadKind;
      stage: 'success';
      title: string;
      fileName: string;
      fileSize: number;
      progress: number;
      message: string;
    }
  | {
      kind: AssetUploadKind;
      stage: 'error';
      title: string;
      fileName: string;
      fileSize: number;
      progress: number;
      message: string;
    };
type CourseDetailCardId =
  | 'status'
  | 'slug'
  | 'subject'
  | 'level'
  | 'lesson_total'
  | 'section_total'
  | 'lesson_child_total'
  | 'student_total'
  | 'student_completed'
  | 'student_review'
  | 'published_total'
  | 'updated_at';

type ProfilePreset = {
  id: PresetId;
  label: string;
  description: string;
  payload: LoginPayload;
};

type SummaryFact = {
  label: string;
  value: string;
};

type NodeSummaryCardProps = {
  title: string;
  summaryLabel: string;
  compact?: boolean;
  nodeTypeLabel: string;
  estimatedMinutes: number;
  selectedModule: {
    content?: string | null;
    transcriptFullText?: string | null;
    asset?: {
      url?: string | null;
      fileUrl?: string | null;
      externalUrl?: string | null;
    } | null;
    videoHlsUrl?: string | null;
    videoUrl?: string | null;
  } | null;
  lessonPreviewFacts: SummaryFact[];
  onOpenVideoManager: () => void;
  primaryActionLabel: string;
  primaryAction: () => void;
  actionCaption: string;
};

const PRESETS: ProfilePreset[] = [
  {
    id: 'platform',
    label: 'Platform Owner',
    description: 'ใช้สำหรับดูภาพรวมของบัญชีหลักและจัดการ tutor ใหม่',
    payload: { email: 'coursechic@gmail.com', password: 'password123' },
  },
  {
    id: 'tutor',
    label: 'Educator',
    description: 'ใช้สำหรับพื้นที่จัดการคอร์สและนักเรียน',
    payload: { email: 'educator', password: 'password123' },
  },
];

const COURSE_DETAIL_CARD_ORDER: CourseDetailCardId[] = [
  'status',
  'slug',
  'subject',
  'level',
  'lesson_total',
  'section_total',
  'lesson_child_total',
  'student_total',
  'student_completed',
  'student_review',
  'published_total',
  'updated_at',
];
const WORKSPACE_NAME = 'educator';
const SERVER_TIME_ZONE = 'Asia/Bangkok';

const DEFAULT_PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyFee: 490,
    revenueSharePct: 18,
    videoQuotaGb: 30,
    note: 'เหมาะกับ tutor ที่เพิ่งเริ่มขายคอร์ส',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyFee: 990,
    revenueSharePct: 15,
    videoQuotaGb: 100,
    note: 'เหมาะกับ tutor ที่เริ่มมีนักเรียนประจำ',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyFee: 1900,
    revenueSharePct: 12,
    videoQuotaGb: 200,
    note: 'เหมาะกับ tutor ที่มี catalog และ revenue สม่ำเสมอ',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyFee: null,
    revenueSharePct: null,
    videoQuotaGb: null,
    note: 'คุยเองตามข้อตกลงรายองค์กร',
  },
];

function getSessionKey(mode: WorkspaceMode) {
  return mode === 'owner'
    ? 'coursechic.educator.owner.session.v1'
    : 'coursechic.educator.tutor.session.v1';
}

function safeLocalStorageRead(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageWrite(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures so the shell can still render
  }
}

function safeLocalStorageRemove(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures so the shell can still render
  }
}

function readSession(mode: WorkspaceMode) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = safeLocalStorageRead(getSessionKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EducatorSession>;
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.user ||
      typeof parsed.user.email !== 'string' ||
      typeof parsed.user.name !== 'string' ||
      typeof parsed.user.role !== 'string' ||
      !parsed.user.tenant ||
      typeof parsed.user.tenant.slug !== 'string' ||
      typeof parsed.user.tenant.name !== 'string'
    ) {
      safeLocalStorageRemove(getSessionKey(mode));
      return null;
    }
    return parsed as EducatorSession;
  } catch {
    safeLocalStorageRemove(getSessionKey(mode));
    return null;
  }
}

function writeSession(mode: WorkspaceMode, session: EducatorSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    safeLocalStorageRemove(getSessionKey(mode));
    return;
  }
  safeLocalStorageWrite(getSessionKey(mode), JSON.stringify(session));
}

function getThemeStorageKey(mode: WorkspaceMode) {
  return mode === 'owner' ? 'coursechic.educator.owner.theme.v1' : 'coursechic.educator.tutor.theme.v1';
}

function formatRole(role?: string) {
  return role ? `${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()}` : 'Workspace';
}

function normalizeServerTimestamp(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'ยังไม่มีข้อมูล';
  const date = normalizeServerTimestamp(value);
  if (!date) return 'ยังไม่มีข้อมูล';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SERVER_TIME_ZONE,
  }).format(date);
}

function formatTime(value?: string | Date | null) {
  if (!value) return '';
  const date = normalizeServerTimestamp(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SERVER_TIME_ZONE,
  }).format(date);
}

function formatTranscriptSeek(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseTranscriptSeek(value: string) {
  const parts = value
    .trim()
    .split(':')
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function sortTranscriptRowsBySeek(rows: TranscriptEditorRow[]) {
  return rows
    .map((row, index) => ({
      row,
      index,
      seekSeconds: parseTranscriptSeek(row.seek),
    }))
    .sort((left, right) => {
      const leftSeek = left.seekSeconds;
      const rightSeek = right.seekSeconds;
      if (leftSeek === null && rightSeek === null) return left.index - right.index;
      if (leftSeek === null) return 1;
      if (rightSeek === null) return -1;
      if (leftSeek !== rightSeek) return leftSeek - rightSeek;
      return left.index - right.index;
    })
    .map(({ row }) => row);
}

function formatTranscriptSegmentsAsRows(segments?: Array<{ seek: string; text: string }> | null) {
  if (!segments?.length) {
    return [{ id: 'segment-1', seek: '00:00', text: '' }];
  }

  return sortTranscriptRowsBySeek(
    segments.map((segment, index) => ({
    id: `segment-${index + 1}`,
    seek: segment.seek || '00:00',
    text: segment.text || '',
    })),
  );
}

function formatTranscriptRowsAsRawText(rows: TranscriptEditorRow[]) {
  return rows
    .map((row) => `${row.seek.trim() || '00:00'} ${row.text.trim()}`.trim())
    .filter(Boolean)
    .join('\n');
}

function parseTranscriptRawText(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[—–-]\s*)?(.*)$/);
      if (!match) return null;
      return {
        seek: match[1],
        text: match[2].trim(),
      };
    })
    .filter((row): row is { seek: string; text: string } => Boolean(row));
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatStorageGb(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'ยังไม่มีข้อมูล';
  return `${Number(value).toFixed(value >= 10 ? 1 : 2)} GB`;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return 'ตามตกลง';
  return `${new Intl.NumberFormat('th-TH').format(value)} บาท/เดือน`;
}

function formatBaht(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '0 บาท';
  return `${new Intl.NumberFormat('th-TH').format(Number(value))} บาท`;
}

function bahtToMinor(value: string | number) {
  const numeric = typeof value === 'number' ? value : Number(String(value).trim() || 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

function minorToBahtInput(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  return String(Math.round(Number(value) / 100));
}

function createEmptyCoursePricingDraft() {
  return {
    priceMinor: '',
    compareAtPriceMinor: '',
    currency: 'THB',
    accessDurationMonths: '3',
    allowCoupons: true,
    allowPromotions: true,
    showPricePublicly: true,
    salesStartsAt: '',
    salesEndsAt: '',
  };
}

function createEmptyMonthlyPricingDraft() {
  return {
    monthlyFee: '',
    renewalIntervalMonths: '1',
    promoEnabled: false,
    promoFreeMonths: '0',
    currency: 'THB',
    notes: '',
  };
}

function createDefaultMembershipOptions(): WorkspaceMembershipOption[] {
  return [1, 3, 6, 12].map((durationMonths, index) => ({
    id: `pkg-${durationMonths}`,
    name: `${durationMonths} เดือน`,
    durationMonths: durationMonths as 1 | 3 | 6 | 12 | 18 | 24,
    compareAtPrice: null,
    salePrice: null,
    enabled: index === 0,
    includedCourseIds: [],
  }));
}

const VALID_MEMBERSHIP_DURATIONS = new Set([1, 3, 6, 12, 18, 24]);

function serializeMembershipOptions(options: WorkspaceMembershipOption[]) {
  return JSON.stringify(options.map((option) => ({
    id: option.id,
    name: option.name.trim(),
    durationMonths: option.durationMonths,
    compareAtPrice: option.compareAtPrice ?? null,
    salePrice: option.salePrice ?? null,
    enabled: option.enabled,
    includedCourseIds: [...(option.includedCourseIds || [])].sort(),
  })));
}

function getMembershipOptionValidation(option: WorkspaceMembershipOption) {
  const salePrice = option.salePrice === null || option.salePrice === undefined ? null : Number(option.salePrice);
  const compareAtPrice = option.compareAtPrice === null || option.compareAtPrice === undefined ? null : Number(option.compareAtPrice);

  return {
    name: !option.name.trim(),
    duration: !VALID_MEMBERSHIP_DURATIONS.has(Number(option.durationMonths)),
    salePrice: salePrice === null || !Number.isFinite(salePrice) || salePrice <= 0,
    compareAtPrice: compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0),
    includedCourses: option.includedCourseIds.length === 0,
  };
}

function validateMembershipOptions(options: WorkspaceMembershipOption[]) {
  const enabledOptions = options.filter((option) => option.enabled);
  const messages: string[] = [];
  const invalidOptionIds = new Set<string>();

  if (!enabledOptions.length) {
    messages.push('ต้องเปิดใช้งานอย่างน้อย 1 แผนเรียนก่อนบันทึก');
  }

  enabledOptions.forEach((option, index) => {
    const issues = getMembershipOptionValidation(option);
    const missingFields = [
      issues.name ? 'ชื่อแผนเรียน' : null,
      issues.duration ? 'จำนวนเดือน' : null,
      issues.salePrice ? 'ราคาขาย' : null,
      issues.compareAtPrice ? 'ราคาก่อนลด' : null,
      issues.includedCourses ? 'คอร์สที่เรียนได้' : null,
    ].filter(Boolean);

    if (missingFields.length) {
      invalidOptionIds.add(option.id);
      messages.push(`แผนที่ ${index + 1} (${option.name.trim() || 'ยังไม่ตั้งชื่อ'}) ยังไม่ครบ: ${missingFields.join(', ')}`);
    }
  });

  return { messages, invalidOptionIds };
}

function formatAccessDuration(value?: string | number | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'ยังไม่กำหนด';
  if (normalized === 'lifetime') return 'เรียนได้ตลอดชีพ';
  if (normalized === '1') return 'เรียนได้ 1 เดือน';
  return `เรียนได้ ${normalized} เดือน`;
}

function formatBytes(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function statusTone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('published') || value.includes('active') || value.includes('ready')) return 'good';
  if (value.includes('draft') || value.includes('trial') || value.includes('expiring')) return 'warn';
  if (value.includes('expired') || value.includes('failed')) return 'bad';
  return 'neutral';
}

function truncateText(value?: string | null, length = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'ยังไม่มีข้อมูล';
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}...`;
}

function makeCourseSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  if (!normalized) {
    return `course-${Date.now().toString(36)}`;
  }

  if (/^\d+$/.test(normalized) || normalized.length < 3) {
    return `course-${normalized}`;
  }

  return normalized;
}

function getCourseDetailCardOrderStorageKey() {
  return 'educator-course-detail-card-order';
}

function normalizeNodeTypeValue(value: CourseTreeNode['nodeType'] | string | null | undefined): CourseTreeNode['nodeType'] {
  const normalized = String(value || 'lesson').toLowerCase();
  if (normalized === 'section' || normalized === 'lesson' || normalized === 'quiz' || normalized === 'assignment') {
    return normalized;
  }
  return 'lesson';
}

function formatNodeTypeLabel(nodeType: CourseTreeNode['nodeType']) {
  switch (normalizeNodeTypeValue(nodeType)) {
    case 'section':
      return 'บทเรียน';
    case 'lesson':
      return 'บทย่อย';
    case 'quiz':
      return 'แบบทดสอบ';
    case 'assignment':
      return 'การบ้าน';
    default:
      return nodeType;
  }
}

function flattenTree(nodes: CourseTreeNode[], level = 0): Array<CourseTreeNode & { level: number }> {
  return nodes.flatMap((node) => [{ ...node, level }, ...flattenTree(node.children || [], level + 1)]);
}

function collectSiblingMoves(nodes: CourseTreeNode[], nodeId: string, direction: 'up' | 'down') {
  const visit = (items: CourseTreeNode[]): Array<{ nodeId: string; newParentId?: string | null; newSortOrder: number }> | null => {
    const index = items.findIndex((item) => item.id === nodeId);
    if (index >= 0) {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) {
        return [];
      }
      const reordered = [...items];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered.map((item, position) => ({
        nodeId: item.id,
        newParentId: item.parentId,
        newSortOrder: position + 1,
      }));
    }

    for (const item of items) {
      const nested = visit(item.children || []);
      if (nested) return nested;
    }
    return null;
  };

  return visit(nodes) || [];
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function reorderItemsByIds<T extends { id: string }>(items: T[], orderedIds: string[]) {
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const next = orderedIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
  const remaining = items.filter((item) => !orderedIds.includes(String(item.id)));
  return [...next, ...remaining];
}

function isSectionNode(node?: Pick<CourseTreeNode, 'nodeType'> | null) {
  return normalizeNodeTypeValue(node?.nodeType) === 'section';
}

const MAX_LESSON_DEPTH = 4;

function canAcceptChildNodes(node: Pick<CourseTreeNode, 'nodeType'> & { level?: number }) {
  return (isSectionNode(node) || normalizeNodeTypeValue(node.nodeType) === 'lesson') && (node.level ?? 0) < MAX_LESSON_DEPTH;
}

function canPlaceNodeUnderParent(
  nodes: Array<CourseTreeNode & { level: number }>,
  nodeType: CourseTreeNode['nodeType'],
  targetParentId: string | null,
  currentNodeId?: string | null,
) {
  const normalizedNodeType = normalizeNodeTypeValue(nodeType);
  const parentNode = targetParentId ? nodes.find((node) => node.id === targetParentId) : null;

  if (normalizedNodeType === 'section') {
    return !targetParentId;
  }

  if (normalizedNodeType === 'lesson') {
    if (!targetParentId || !parentNode) {
      return false;
    }
    if (!canAcceptChildNodes(parentNode)) {
      return false;
    }
  }

  if (!currentNodeId || !targetParentId) {
    return true;
  }

  if (targetParentId === currentNodeId) {
    return false;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  let cursor = targetParentId;
  while (cursor) {
    if (cursor === currentNodeId) {
      return false;
    }
    cursor = nodeMap.get(cursor)?.parentId || '';
  }

  return true;
}

function NodeSummaryCard({
  title,
  summaryLabel,
  compact = false,
  nodeTypeLabel,
  estimatedMinutes,
  selectedModule,
  lessonPreviewFacts,
  onOpenVideoManager,
  primaryActionLabel,
  primaryAction,
  actionCaption,
}: NodeSummaryCardProps) {
  return (
    <section className={`section-card node-video-summary-card${compact ? ' is-compact' : ''}`}>
      <div className="panel-head compact-head">
        <div>
          <span className="section-label">{summaryLabel}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {compact ? (
        <div className="node-summary-mini-grid">
          <div className="node-summary-mini-card"><span>ประเภท</span><strong>{nodeTypeLabel}</strong></div>
          <div className="node-summary-mini-card"><span>เวลา</span><strong>{estimatedMinutes} นาที</strong></div>
          <div className="node-summary-mini-card"><span>Playback</span><strong>{selectedModule?.videoHlsUrl || selectedModule?.videoUrl ? 'พร้อมเปิดดู' : 'ยังไม่มีวิดีโอ'}</strong></div>
          <div className="node-summary-mini-card"><span>Transcript</span><strong>{selectedModule?.transcriptFullText ? 'มี' : 'ยังไม่มี'}</strong></div>
          <div className="node-summary-mini-card"><span>ไฟล์ประกอบบทเรียน</span><strong>{selectedModule?.asset?.url || selectedModule?.asset?.fileUrl || selectedModule?.asset?.externalUrl ? 'มี' : 'ยังไม่มี'}</strong></div>
          <div className="node-summary-mini-card"><span>เคล็ดลับในการเรียน</span><strong>{selectedModule?.content ? 'มี' : 'ยังไม่มี'}</strong></div>
        </div>
      ) : (
        <div className="detail-grid node-side-meta-grid">
          <div className="detail-card"><span>ประเภทบทเรียน</span><strong>{nodeTypeLabel}</strong></div>
          <div className="detail-card"><span>เวลาประเมิน</span><strong>{estimatedMinutes} นาที</strong></div>
          <div className="detail-card"><span>Playback</span><strong>{selectedModule?.videoHlsUrl || selectedModule?.videoUrl ? 'พร้อมเปิดดู' : 'ยังไม่มีวิดีโอ'}</strong></div>
          <div className="detail-card"><span>Transcript</span><strong>{selectedModule?.transcriptFullText ? 'มี transcript' : 'ยังไม่มี transcript'}</strong></div>
          <div className="detail-card"><span>ไฟล์ประกอบบทเรียน</span><strong>{selectedModule?.asset?.url || selectedModule?.asset?.fileUrl || selectedModule?.asset?.externalUrl ? 'มีไฟล์' : 'ยังไม่มีไฟล์'}</strong></div>
          <div className="detail-card"><span>เคล็ดลับในการเรียน</span><strong>{selectedModule?.content ? 'มีเนื้อหา' : 'ยังไม่มีเนื้อหา'}</strong></div>
        </div>
      )}
      {!compact ? (
        <>
          <div className="action-row action-row-split">
            <button className="secondary-button" type="button" onClick={onOpenVideoManager}>
              จัดการวีดีโอ
            </button>
            <span className="action-caption">{actionCaption}</span>
          </div>
          <div className="preview-grid">
            {lessonPreviewFacts.map((fact) => (
              <article key={fact.label} className="preview-card">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function EducatorShell({
  mode,
  screen: initialScreen = 'dashboard',
  initialView,
}: {
  mode: WorkspaceMode;
  screen?: ScreenMode;
  initialView?: ViewKey;
}) {
  const isOwnerWorkspace = mode === 'owner';
  const router = useRouter();
  const pathname = usePathname();
  const loginPath = isOwnerWorkspace ? '/growth/login' : '/educator/login';
  const dashboardPath = isOwnerWorkspace ? '/growth' : '/educator';
  const courseWorkspaceRoot = isOwnerWorkspace ? '/growth/courses' : '/educator/courses';
  const pricePath = `${dashboardPath}/price`;
  const promotionPath = `${dashboardPath}/promotion`;
  const dashboardViewFromPath: ViewKey = pathname === pricePath
    ? 'price'
    : pathname === promotionPath
      ? 'promotion'
      : 'overview';
  const isCourseWorkspaceRoute = !isOwnerWorkspace && pathname?.startsWith('/educator/courses') === true;
  const isCourseListRoute = !isOwnerWorkspace && pathname === '/educator/courses';
  const courseRouteMatch = !isOwnerWorkspace ? pathname?.match(/^\/educator\/courses\/([^/]+)(?:\/lessons\/([^/]+))?$/) : null;
  const routeCourseId = courseRouteMatch ? decodeURIComponent(courseRouteMatch[1]) : null;
  const routeNodeId = courseRouteMatch?.[2] ? decodeURIComponent(courseRouteMatch[2]) : null;
  const isLessonRoute = Boolean(routeNodeId);
  const isCourseDetailRoute = Boolean(routeCourseId) && !isLessonRoute;
  const selectedCourseRoute = routeCourseId ? `${courseWorkspaceRoot}/${routeCourseId}` : courseWorkspaceRoot;
  const initialPreset: PresetId = isOwnerWorkspace ? 'platform' : 'tutor';
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>(initialPreset);
  const [form, setForm] = useState<LoginPayload>({ ...(isOwnerWorkspace ? PRESETS[0].payload : PRESETS[1].payload) });
  const [session, setSession] = useState<EducatorSession | null>(null);
  const [view, setView] = useState<ViewKey>(initialView || dashboardViewFromPath);
  const isTutorCommerceView = !isOwnerWorkspace && (view === 'price' || view === 'promotion');
  const tutorCommerceMode = view === 'promotion' ? 'course' : 'monthly';
  const dashboardContextLabel = view === 'price'
    ? (isOwnerWorkspace ? 'Price' : 'การขาย')
    : view === 'promotion'
      ? (isOwnerWorkspace ? 'Promotion' : 'การขาย')
      : 'พื้นที่ทำงาน';
  const dashboardSectionLabel = view === 'price'
    ? (isOwnerWorkspace ? 'Price' : 'การขาย')
    : view === 'promotion'
      ? (isOwnerWorkspace ? 'Promotion' : 'การขาย')
      : isOwnerWorkspace ? 'Growth' : 'Workspace';
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenMode>(initialScreen);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    setView(initialView || dashboardViewFromPath);
  }, [dashboardViewFromPath, initialView]);

  const [legacyCourses, setLegacyCourses] = useState<CourseItem[]>([]);
  const [nestCourses, setNestCourses] = useState<CourseItem[]>([]);
  const [students, setStudents] = useState<StudentSummary | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [tutors, setTutors] = useState<TutorDirectory | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [tree, setTree] = useState<CourseTreeNode[]>([]);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [courseSaveState, setCourseSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [treeActionState, setTreeActionState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteCourseState, setDeleteCourseState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [courseOrderState, setCourseOrderState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [coursesSubView, setCoursesSubView] = useState<'catalog' | 'new'>('catalog');
  const [courseDetailCardOrder, setCourseDetailCardOrder] = useState<CourseDetailCardId[]>(COURSE_DETAIL_CARD_ORDER);
  const [draggedCourseDetailCardId, setDraggedCourseDetailCardId] = useState<CourseDetailCardId | null>(null);
  const [activeCourseDetailCardDropId, setActiveCourseDetailCardDropId] = useState<CourseDetailCardId | null>(null);
  const [courseSheetDragY, setCourseSheetDragY] = useState(0);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [activeCourseDropId, setActiveCourseDropId] = useState<string | null>(null);
  const courseSheetDragRef = useRef<{ pointerId: number; startY: number; startX: number; active: boolean } | null>(null);

  const [courseForm, setCourseForm] = useState({ title: '', description: '', subject: '', level: '' });
  const [createCourseForm, setCreateCourseForm] = useState({ title: '', description: '', subject: '', level: '' });
  const [nodeForm, setNodeForm] = useState<{ parentId: string; nodeType: CourseTreeNode['nodeType']; title: string; estimatedMinutes: string }>({
    parentId: '',
    nodeType: 'lesson',
    title: '',
    estimatedMinutes: '30',
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetailTab, setNodeDetailTab] = useState<NodeDetailTab>('transcript');
  const [isVideoManagerOpen, setIsVideoManagerOpen] = useState(false);
  const [nodeEditForm, setNodeEditForm] = useState({ title: '', estimatedMinutes: '0', isPublished: false });
  const [treeNotice, setTreeNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<{ title: string; label: string; message: string } | null>(null);
  const [contentForm, setContentForm] = useState({ contentType: 'article' as const, plainText: '', htmlContent: '' });
  const createEmptyAssetForm = (): AssetFormState => ({
    title: '',
    mimeType: '',
    sizeBytes: '',
    file: null,
  });
  const [lessonAssetForm, setLessonAssetForm] = useState<AssetFormState>(createEmptyAssetForm());
  const [exerciseAssetForm, setExerciseAssetForm] = useState<AssetFormState>(createEmptyAssetForm());
  const [lessonAssetInputKey, setLessonAssetInputKey] = useState(0);
  const [exerciseAssetInputKey, setExerciseAssetInputKey] = useState(0);
  const [assetUploadState, setAssetUploadState] = useState<AssetUploadState | null>(null);
  const assetHydrationNodeRef = useRef<string | null>(null);
  const assetUploadSuccessTimerRef = useRef<number | null>(null);
  const successNoticeTimerRef = useRef<number | null>(null);
  const [transcriptForm, setTranscriptForm] = useState<{
    mode: TranscriptInputMode;
    language: string;
    status: 'ready' | 'processing' | 'failed' | 'uploading';
    rows: TranscriptEditorRow[];
    rawText: string;
  }>({
    mode: 'rows',
    language: 'th',
    status: 'ready',
    rows: [{ id: 'segment-1', seek: '00:00', text: '' }],
    rawText: '',
  });

  const [creatingTutor, setCreatingTutor] = useState(false);
  const [tutorResult, setTutorResult] = useState<TutorCreateResult | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [tutorForm, setTutorForm] = useState<CreateTutorPayload & { packageId: PricingPackage['id'] }>({
    name: '',
    slug: '',
    email: '',
    password: 'password123',
    packageId: 'starter',
  });
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [pricingDraft, setPricingDraft] = useState<PricingConfig | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [monthlyPricingDraft, setMonthlyPricingDraft] = useState(createEmptyMonthlyPricingDraft);
  const [membershipOptionsDraft, setMembershipOptionsDraft] = useState<WorkspaceMembershipOption[]>(createDefaultMembershipOptions);
  const membershipLastSavedRef = useRef('');
  const [pricingOverrideForm, setPricingOverrideForm] = useState<{
    tenantSlug: string;
    tenantName: string;
    packageId: PricingPackage['id'];
    monthlyFee: string;
    revenueSharePct: string;
    videoQuotaGb: string;
    promoFreeMonths: string;
    note: string;
  }>({
    tenantSlug: '',
    tenantName: '',
    packageId: 'starter',
    monthlyFee: '',
    revenueSharePct: '',
    videoQuotaGb: '',
    promoFreeMonths: '3',
    note: '',
  });
  const [coursePricingData, setCoursePricingData] = useState<CoursePricingResponse | null>(null);
  const [coursePricingDraft, setCoursePricingDraft] = useState<ReturnType<typeof createEmptyCoursePricingDraft>>(createEmptyCoursePricingDraft);
  const [courseDiscountForm, setCourseDiscountForm] = useState<{
    mode: 'AUTO' | 'CODE';
    code: string;
    name: string;
    description: string;
    discountType: 'PERCENT' | 'AMOUNT' | 'FREE';
    discountValue: string;
    discountAmountMinor: string;
    currency: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
    stackable: boolean;
    priority: string;
    maxRedemptions: string;
    maxRedemptionsPerStudent: string;
    startsAt: string;
    endsAt: string;
  }>({
    mode: 'CODE',
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '10',
    discountAmountMinor: '',
    currency: 'THB',
    status: 'DRAFT',
    stackable: true,
    priority: '0',
    maxRedemptions: '',
    maxRedemptionsPerStudent: '',
    startsAt: '',
    endsAt: '',
  });
  const [editingCourseDiscountId, setEditingCourseDiscountId] = useState<string | null>(null);
  const [coursePricingLoading, setCoursePricingLoading] = useState(false);
  const [coursePricingSaving, setCoursePricingSaving] = useState(false);
  const [courseDiscountSaving, setCourseDiscountSaving] = useState(false);
  const [courseCommerceError, setCourseCommerceError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ courseId: '' });
  const [paymentConfirmSessionId, setPaymentConfirmSessionId] = useState('');
  const [paymentResult, setPaymentResult] = useState<PaymentSessionResult | null>(null);
  const [paymentConfirmResult, setPaymentConfirmResult] = useState<PaymentConfirmResult | null>(null);
  const [creatingPaymentSession, setCreatingPaymentSession] = useState(false);
  const [confirmingPaymentSession, setConfirmingPaymentSession] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [landingHtml, setLandingHtml] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [landingExists, setLandingExists] = useState(false);
  const [landingLoading, setLandingLoading] = useState(false);
  const [landingSaving, setLandingSaving] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const canManageTutors = isOwnerWorkspace && session?.user.platformRole === 'ADMIN';
  const workspaceMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = safeLocalStorageRead(getThemeStorageKey(mode)) as ThemeMode | null;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorageWrite(getThemeStorageKey(mode), theme);
  }, [mode, theme]);

  useEffect(() => {
    function closeWorkspaceMenu(event: MouseEvent | TouchEvent) {
      const menu = workspaceMenuRef.current;
      if (!menu || !menu.open) return;
      if (event.target instanceof Node && menu.contains(event.target)) return;
      menu.open = false;
    }

    document.addEventListener('mousedown', closeWorkspaceMenu);
    document.addEventListener('touchstart', closeWorkspaceMenu);
    return () => {
      document.removeEventListener('mousedown', closeWorkspaceMenu);
      document.removeEventListener('touchstart', closeWorkspaceMenu);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = safeLocalStorageRead(getCourseDetailCardOrderStorageKey());
    if (!raw) {
      setCourseDetailCardOrder(COURSE_DETAIL_CARD_ORDER);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CourseDetailCardId[];
      const nextOrder = [
        ...parsed.filter((id) => COURSE_DETAIL_CARD_ORDER.includes(id)),
        ...COURSE_DETAIL_CARD_ORDER.filter((id) => !parsed.includes(id)),
      ];
      setCourseDetailCardOrder(nextOrder);
    } catch {
      setCourseDetailCardOrder(COURSE_DETAIL_CARD_ORDER);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorageWrite(getCourseDetailCardOrderStorageKey(), JSON.stringify(courseDetailCardOrder));
  }, [courseDetailCardOrder]);

  useEffect(() => {
    const saved = readSession(mode);
    if (saved) {
      setSession(saved);
      const preset = mode === 'tutor' ? PRESETS[1] : PRESETS[0];
      setSelectedPresetId(preset.id);
      setForm({ email: saved.user.email, password: 'password123' });
      setScreen('dashboard');
    }
    setHydrated(true);
  }, [mode]);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      if (screen === 'dashboard') {
        router.replace(loginPath);
      }
      return;
    }
    if (screen === 'login') {
      router.replace(dashboardPath);
    }
  }, [dashboardPath, hydrated, loginPath, router, screen, session]);

  useEffect(() => {
    if (!isCourseWorkspaceRoute) return;
    setView('courses');
    setCoursesSubView('catalog');
    if (isCourseListRoute) {
      setSelectedCourseId(null);
      setSelectedNodeId(null);
    }
    if (routeCourseId) {
      setSelectedCourseId(routeCourseId);
    }
    if (routeNodeId) {
      setSelectedNodeId(routeNodeId);
    } else {
      setSelectedNodeId(null);
    }
  }, [isCourseDetailRoute, isCourseListRoute, isCourseWorkspaceRoute, routeCourseId, routeNodeId, courseWorkspaceRoot, router]);

  useEffect(() => {
    setCourseSheetDragY(0);
    courseSheetDragRef.current = null;
  }, [selectedCourseId, isCourseDetailRoute]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    const updateViewport = () => setIsCompactViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!selectedCourse || isCourseDetailRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && window.matchMedia('(max-width: 760px)').matches) {
        closeCourseSheet();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCourseDetailRoute, selectedCourse]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;
    let cancelled = false;
    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      setPricingLoading(Boolean(canManageTutors));
      try {
        const [legacy, nest, studentRows, tenantCtx, tutorRows, pricingRows] = await Promise.all([
          fetchCourses(currentSession),
          fetchNestCourses(currentSession).catch(() => []),
          fetchStudents(currentSession).catch((fetchError) => {
            if (fetchError instanceof ApiError && fetchError.status === 403) return null;
            throw fetchError;
          }),
          fetchTenantContext(currentSession).catch(() => null),
          canManageTutors
            ? fetchTutors(currentSession).catch((fetchError) => {
                if (fetchError instanceof ApiError && (fetchError.status === 403 || fetchError.status === 404)) return null;
                throw fetchError;
              })
            : Promise.resolve(null),
          canManageTutors
            ? fetchPricingConfig(currentSession).catch((fetchError) => {
                if (fetchError instanceof ApiError && (fetchError.status === 403 || fetchError.status === 404)) return null;
                throw fetchError;
              })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setLegacyCourses(legacy);
        setNestCourses(nest);
        setStudents(studentRows);
        setTenantContext(tenantCtx);
        setTutors(tutorRows);
        setPricingConfig(pricingRows);
        setPricingDraft(pricingRows);
        setPaymentForm((current) => ({
          courseId: current.courseId || String((nest[0] || legacy[0] || {}).id || ''),
        }));
      } catch (loadError) {
        if (!cancelled && loadError instanceof ApiError && loadError.status === 401) {
          // A token can become invalid after a backend redeploy or secret rotation.
          // Do not keep rendering the dashboard with the same stale token and
          // repeatedly show the API error; force a clean login instead.
          setSession(null);
          writeSession(mode, null);
          setError(null);
          router.replace(loginPath);
          return;
        }
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setPricingLoading(false);
      }
    }
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [session, selectedCourseId, canManageTutors]);

  useEffect(() => {
    if (!session || !selectedCourseId) return;
    const currentSession = session;
    const currentCourseId = selectedCourseId;
    let cancelled = false;
    async function loadCourseDetail() {
      setCourseDetailLoading(true);
      try {
        const [treeResponse, legacyDetail] = await Promise.all([
          fetchCourseTree(currentSession, currentCourseId),
          fetchCourseDetail(currentSession, currentCourseId).catch(() => null),
        ]);
        if (cancelled) return;
        setSelectedCourse({ ...legacyDetail, ...treeResponse.data.course, modules: legacyDetail?.modules || [] });
        setTree(treeResponse.data.nodes || []);
        setCourseForm({
          title: (legacyDetail?.title || treeResponse.data.course.title) || '',
          description: (legacyDetail?.description || treeResponse.data.course.description) || '',
          subject: (legacyDetail?.subject || treeResponse.data.course.subject) || '',
          level: (legacyDetail?.level || treeResponse.data.course.level) || '',
        });
      } catch {
        if (!cancelled) {
          const fallback = [...nestCourses, ...legacyCourses].find((course) => String(course.id) === currentCourseId) || null;
          setSelectedCourse(fallback);
          setTree([]);
          setCourseForm({
            title: fallback?.title || '',
            description: fallback?.description || '',
            subject: fallback?.subject || '',
            level: fallback?.level || '',
          });
        }
      } finally {
        if (!cancelled) setCourseDetailLoading(false);
      }
    }
    void loadCourseDetail();
    return () => {
      cancelled = true;
    };
  }, [session, selectedCourseId, nestCourses, legacyCourses]);

  useEffect(() => {
    if (!session || !selectedCourseId) {
      setCoursePricingData(null);
      setCoursePricingDraft(createEmptyCoursePricingDraft());
      return;
    }

    const currentSession = session;
    const currentCourseId = selectedCourseId;
    let cancelled = false;

    async function loadCoursePricing() {
      setCoursePricingLoading(true);
      setCourseCommerceError(null);
      try {
        const result = await fetchCoursePricing(currentSession, currentCourseId);
        if (cancelled) return;
        setCoursePricingData(result);
        setCoursePricingDraft({
          priceMinor: minorToBahtInput(result.pricing?.priceMinor ?? 0),
          compareAtPriceMinor: minorToBahtInput(result.pricing?.compareAtPriceMinor ?? null),
          currency: result.pricing?.currency || 'THB',
          accessDurationMonths: String(result.pricing?.metadata?.accessDurationMonths || '3'),
          allowCoupons: result.pricing?.allowCoupons ?? true,
          allowPromotions: result.pricing?.allowPromotions ?? true,
          showPricePublicly: result.pricing?.showPricePublicly ?? true,
          salesStartsAt: result.pricing?.salesStartsAt ? new Date(result.pricing.salesStartsAt).toISOString().slice(0, 16) : '',
          salesEndsAt: result.pricing?.salesEndsAt ? new Date(result.pricing.salesEndsAt).toISOString().slice(0, 16) : '',
        });
      } catch (loadError) {
        if (!cancelled) {
          setCoursePricingData(null);
          setCoursePricingDraft(createEmptyCoursePricingDraft());
          if (!(loadError instanceof ApiError && loadError.status === 404)) {
            setCourseCommerceError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลราคาไม่สำเร็จ');
          }
        }
      } finally {
        if (!cancelled) setCoursePricingLoading(false);
      }
    }

    void loadCoursePricing();
    return () => {
      cancelled = true;
    };
  }, [session, selectedCourseId]);

  useEffect(() => {
    const serializedMembershipOptions = serializeMembershipOptions(
      tenantContext?.pricing?.membershipOptions?.length
        ? tenantContext.pricing.membershipOptions
        : createDefaultMembershipOptions()
    );
    membershipLastSavedRef.current = serializedMembershipOptions;
    setMonthlyPricingDraft({
      monthlyFee: minorToBahtInput(tenantContext?.billingProfile?.monthlyFeeMinor ?? ((tenantContext?.pricing?.monthlyFee ?? null) === null ? null : Math.round((tenantContext?.pricing?.monthlyFee ?? 0) * 100))),
      renewalIntervalMonths: String(tenantContext?.pricing?.renewalIntervalMonths ?? 1),
      promoEnabled: tenantContext?.pricing?.promoEnabled ?? false,
      promoFreeMonths: String(tenantContext?.pricing?.promoFreeMonths ?? 0),
      currency: tenantContext?.billingProfile?.currency || 'THB',
      notes: tenantContext?.billingProfile?.notes || '',
    });
    setMembershipOptionsDraft(
      tenantContext?.pricing?.membershipOptions?.length
        ? tenantContext.pricing.membershipOptions.map((option) => ({
            id: option.id,
            name: option.name,
            durationMonths: option.durationMonths,
            compareAtPrice: option.compareAtPrice ?? null,
            salePrice: option.salePrice ?? null,
            enabled: option.enabled,
            includedCourseIds: option.includedCourseIds || [],
          }))
        : createDefaultMembershipOptions(),
    );
  }, [tenantContext]);

  useEffect(() => {
    if (courseSaveState !== 'saved') return;
    setSuccessNotice({
      title: 'บันทึกคอร์สแล้ว',
      label: 'สำเร็จ',
      message: 'ข้อมูลคอร์สถูกบันทึกเรียบร้อยแล้ว',
    });
  }, [courseSaveState]);

  useEffect(() => {
    if (publishState !== 'saved') return;
    setSuccessNotice({
      title: 'เปลี่ยนสถานะการเผยแพร่แล้ว',
      label: 'สำเร็จ',
      message: 'สถานะการเผยแพร่ถูกบันทึกเรียบร้อยแล้ว',
    });
  }, [publishState]);

  useEffect(() => {
    if (deleteCourseState !== 'saved') return;
    setSuccessNotice({
      title: 'ลบคอร์สแล้ว',
      label: 'สำเร็จ',
      message: 'รายการคอร์สถูกลบเรียบร้อยแล้ว',
    });
  }, [deleteCourseState]);

  useEffect(() => {
    if (courseOrderState !== 'saved') return;
    setSuccessNotice({
      title: 'จัดลำดับคอร์สแล้ว',
      label: 'สำเร็จ',
      message: 'ลำดับคอร์สถูกบันทึกเรียบร้อยแล้ว',
    });
  }, [courseOrderState]);

  useEffect(() => {
    if (!successNotice) return;
    if (successNoticeTimerRef.current !== null) {
      window.clearTimeout(successNoticeTimerRef.current);
    }
    successNoticeTimerRef.current = window.setTimeout(() => {
      setSuccessNotice(null);
      successNoticeTimerRef.current = null;
    }, 3200);
    return () => {
      if (successNoticeTimerRef.current !== null) {
        window.clearTimeout(successNoticeTimerRef.current);
        successNoticeTimerRef.current = null;
      }
    };
  }, [successNotice]);

  useEffect(() => {
    if (!isOwnerWorkspace && view === 'growth') {
      setView('overview');
    }
  }, [isOwnerWorkspace, view]);

  useEffect(() => {
    if (!session || view !== 'website') return;
    void handleLoadLandingPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, view]);

  const selectedPreset = useMemo(() => PRESETS.find((preset) => preset.id === selectedPresetId) || PRESETS[0], [selectedPresetId]);
  const displayedCourses = useMemo(() => {
    if (nestCourses.length > 0) {
      return nestCourses;
    }
    return legacyCourses;
  }, [nestCourses, legacyCourses]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);
  const lessonParentOptions = useMemo(() => flatNodes.filter((node) => canAcceptChildNodes(node)), [flatNodes]);
  const sectionContainerOptions = useMemo(
    () => flatNodes.filter((node) => normalizeNodeTypeValue(node.nodeType) === 'section'),
    [flatNodes],
  );
  const needsSectionParent = normalizeNodeTypeValue(nodeForm.nodeType) === 'lesson';
  const needsRootPlacement = normalizeNodeTypeValue(nodeForm.nodeType) === 'section';
  const hasLessonParentOptions = lessonParentOptions.length > 0;
  const sectionCount = flatNodes.filter((node) => normalizeNodeTypeValue(node.nodeType) === 'section').length;
  const lessonCount = flatNodes.filter((node) => normalizeNodeTypeValue(node.nodeType) === 'lesson').length;
  const publishedNodeCount = flatNodes.filter((node) => node.isPublished).length;
  const selectedNode = flatNodes.find((node) => node.id === selectedNodeId) || null;
  const canQuickAddSection = Boolean(selectedNode && selectedNode.depth === 0);
  const lessonDetailLabel = selectedNode ? (normalizeNodeTypeValue(selectedNode.nodeType) === 'lesson' ? 'รายละเอียดบทเรียนย่อย' : 'รายละเอียดบทเรียน') : 'รายละเอียดบทเรียน';
  const selectedModule = selectedCourse?.modules?.find((item) => String(item.id) === selectedNodeId) || null;
  const applyCoursePatch = (courseId: string, patch: Partial<CourseItem>) => {
    setNestCourses((current) => current.map((course) => (String(course.id) === courseId ? { ...course, ...patch } : course)));
    setLegacyCourses((current) => current.map((course) => (String(course.id) === courseId ? { ...course, ...patch } : course)));
    setSelectedCourse((current) => (current && String(current.id) === courseId ? { ...current, ...patch } : current));
  };
  const removeCourseFromState = (courseId: string) => {
    setNestCourses((current) => current.filter((course) => String(course.id) !== courseId));
    setLegacyCourses((current) => current.filter((course) => String(course.id) !== courseId));
    setSelectedCourse((current) => (current && String(current.id) === courseId ? null : current));
    setTree([]);
    setSelectedNodeId(null);
    setCourseForm({ title: '', description: '', subject: '', level: '' });
  };
  const setCourseListOrder = (orderedCourseIds: string[]) => {
    setNestCourses((current) => reorderItemsByIds(current, orderedCourseIds));
    setLegacyCourses((current) => reorderItemsByIds(current, orderedCourseIds));
  };
  const persistCourseOrder = async (orderedCourseIds: string[]) => {
    if (!session || !orderedCourseIds.length) return;
    setCourseOrderState('saving');
    try {
      await reorderCourses(session, orderedCourseIds);
      setCourseListOrder(orderedCourseIds);
      setCourseOrderState('saved');
      setTimeout(() => setCourseOrderState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'จัดลำดับคอร์สไม่สำเร็จ');
      setCourseOrderState('idle');
    } finally {
      setDraggedCourseId(null);
      setActiveCourseDropId(null);
    }
  };
  const handleMoveCourse = async (courseId: string, direction: 'up' | 'down') => {
    const currentIds = displayedCourses.map((course) => String(course.id));
    const index = currentIds.indexOf(courseId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;
    const nextIds = moveItem(currentIds, index, targetIndex);
    await persistCourseOrder(nextIds);
  };
  const closeCourseSheet = () => {
    setSelectedCourseId(null);
    setCoursesSubView('catalog');
    setView('courses');
    setCourseSheetDragY(0);
    courseSheetDragRef.current = null;
  };

  const handleCloseCourseSheet = () => {
    closeCourseSheet();
    router.replace(courseWorkspaceRoot);
  };
  const handleCloseLessonWorkspace = () => {
    setSelectedNodeId(null);
    setNodeDetailTab('overview');
    router.replace(selectedCourseRoute);
  };
  const handleBackToCourseList = () => {
    router.push(courseWorkspaceRoot);
  };
  const handleBackToCourseDetail = () => {
    router.push(selectedCourseRoute);
  };
  const handleCourseSheetPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (isCourseDetailRoute || !selectedCourseId) return;
    if (window.matchMedia('(min-width: 761px)').matches) return;
    courseSheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startX: event.clientX,
      active: false,
    };
    setCourseSheetDragY(0);
  };
  const handleCourseSheetPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = courseSheetDragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - state.startY;
    const deltaX = event.clientX - state.startX;
    if (!state.active) {
      if (deltaY < 10 || Math.abs(deltaX) > Math.abs(deltaY) + 12) return;
      state.active = true;
    }
    event.preventDefault();
    setCourseSheetDragY(Math.max(0, deltaY));
  };
  const finishCourseSheetSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const state = courseSheetDragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const shouldClose = state.active && courseSheetDragY > 96;
    courseSheetDragRef.current = null;
    setCourseSheetDragY(0);
    if (shouldClose) closeCourseSheet();
  };
  const refreshSelectedCourse = async () => {
    if (!session || !selectedCourseId) return;
    const legacyDetail = await fetchCourseDetail(session, selectedCourseId).catch(() => null);
    if (legacyDetail) {
      setSelectedCourse((current) => ({ ...(current || legacyDetail), ...legacyDetail }));
    }
  };
  const refreshSelectedTree = async () => {
    if (!session || !selectedCourseId) return;
    const refreshed = await fetchCourseTree(session, selectedCourseId).catch(() => null);
    if (refreshed?.data?.nodes) {
      setTree(refreshed.data.nodes);
    }
  };
  const videoUploadFlow = useVideoUploadFlow({
    session,
    selectedNodeId,
    selectedVideoAssetId: selectedModule?.videoAssetId,
    selectedVideoMediaId: selectedModule?.videoMediaId,
    selectedTranscriptFullText: selectedModule?.transcriptFullText || null,
    onRefreshCourse: refreshSelectedCourse,
    onRefreshTree: refreshSelectedTree,
    onError: (message) => setError(message),
  });
  const { resetUploadState } = videoUploadFlow;
  const activeStudents = students?.active ?? 0;
  const expiringStudents = students?.expiring ?? 0;
  const totalStudents = students?.total ?? 0;
  const publishedCourses = displayedCourses.filter((course) => course.status === 'published').length;
  const draftCourses = displayedCourses.filter((course) => course.status !== 'published').length;
  const tutorCount = tutors?.total ?? 0;
  const recentTutorCount = tutors?.tutors?.filter((entry) => {
    const createdAt = new Date(entry.tenant.createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    return Date.now() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length ?? 0;
  const tenantRows = (tutors?.tutors || []).map((entry) => {
    const isNew = Date.now() - new Date(entry.tenant.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 30;
    const tenantHealth = entry.tutor.platformRole === 'ADMIN' ? (isNew ? 'ramping' : 'stable') : 'watch';
    return {
      ...entry,
      tenantHealth,
      launchStage: isNew ? 'new' : 'live',
    };
  });
  const tutorHealthLabel = tutorCount ? (recentTutorCount > 0 ? 'expanding' : 'steady') : 'starting';
  const licenseHealthLabel = tenantContext?.license.status || session?.license?.status || 'active';
  const licensePlanLabel = tenantContext?.license.plan || session?.license?.plan || 'starter';
  const licenseDaysLeft = daysUntil(tenantContext?.license.expiresAt || session?.license?.expiresAt || null);
  const licenseWindowLabel = licenseDaysLeft === null ? 'no renewal date' : licenseDaysLeft < 0 ? 'expired' : `${licenseDaysLeft} day${licenseDaysLeft === 1 ? '' : 's'} left`;
  const packagePriceLabel = formatMoney(tenantContext?.pricing?.monthlyFee ?? null);
  const packageQuotaLabel = formatStorageGb(tenantContext?.usage?.videoQuotaGb ?? tenantContext?.pricing?.videoQuotaGb ?? null);
  const packageUsedLabel = formatStorageGb(tenantContext?.usage?.videoStorageGbUsed ?? 0);
  const packagePromoLabel = tenantContext?.pricing?.promoEnabled
    ? `${tenantContext?.pricing?.promoFreeMonths ?? 0} เดือนแรกฟรี`
    : 'ไม่มีโปรโมชันฟรี';
  const featureKeys = Object.entries(tenantContext?.features || session?.features || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
  const pricingPackages = pricingDraft?.defaults?.packages || pricingConfig?.defaults?.packages || DEFAULT_PRICING_PACKAGES;
  const pricingPromo = pricingDraft?.defaults?.promo || pricingConfig?.defaults?.promo || {
    enabled: true,
    freeMonths: 3,
    label: 'ฟรีค่าบริการ 3 เดือนแรก',
    note: 'Owner สามารถปรับโปรโมชันนี้ได้จาก Growth',
  };
  const pricingOverrides = pricingDraft?.overrides || pricingConfig?.overrides || [];
  const pricingOverrideRows = pricingOverrides.map((override) => {
    const tenant = tutors?.tutors?.find((entry) => entry.tenant.slug === override.tenantSlug);
    const basePackage = pricingPackages.find((item) => item.id === override.packageId);
    return {
      ...override,
      tenantName: tenant?.tenant.name || override.tenantName || override.tenantSlug,
      tenantUrl: tenant?.tenant.url || `https://${override.tenantSlug}.coursechic.com/`,
      effectivePackage: basePackage || override.effectivePackage,
    };
  });
  const pricingSelectedTutorEntry = pricingOverrideForm.tenantSlug
    ? tutors?.tutors?.find((entry) => entry.tenant.slug === pricingOverrideForm.tenantSlug) || null
    : null;
  const pricingSelectedBasePackage = pricingPackages.find((item) => item.id === pricingOverrideForm.packageId) || pricingPackages[0];
  const pricingSelectedMonthlyFee = pricingOverrideForm.monthlyFee !== ''
    ? Number(pricingOverrideForm.monthlyFee)
    : pricingSelectedBasePackage?.monthlyFee ?? null;
  const pricingSelectedRevenueShare = pricingOverrideForm.revenueSharePct !== ''
    ? Number(pricingOverrideForm.revenueSharePct)
    : pricingSelectedBasePackage?.revenueSharePct ?? null;
  const pricingSelectedVideoQuota = pricingOverrideForm.videoQuotaGb !== ''
    ? Number(pricingOverrideForm.videoQuotaGb)
    : pricingSelectedBasePackage?.videoQuotaGb ?? null;
  const pricingSelectedPromoMonths = pricingOverrideForm.promoFreeMonths !== ''
    ? Number(pricingOverrideForm.promoFreeMonths)
    : pricingPromo.freeMonths;
  const pricingSelectedOverrideLabel = pricingSelectedTutorEntry
    ? `${pricingSelectedTutorEntry.tenant.name} · ${pricingSelectedTutorEntry.tenant.slug}`
    : 'ยังไม่ได้เลือก tutor';
  const serializedMembershipDraft = serializeMembershipOptions(membershipOptionsDraft);
  const membershipPricingChanged = serializedMembershipDraft !== membershipLastSavedRef.current;
  const membershipValidation = validateMembershipOptions(membershipOptionsDraft);
  const shouldShowLoadingShell = screen === 'dashboard' && (!hydrated || !session);
  const selectedCourseCards = selectedCourse
    ? ([
        {
          id: 'status',
          label: 'สถานะ',
          value: selectedCourse.status,
        },
        {
          id: 'slug',
          label: 'รหัสคอร์ส',
          value: selectedCourse.slug,
        },
        {
          id: 'subject',
          label: 'วิชา',
          value: selectedCourse.subject || 'ยังไม่ระบุ',
        },
        {
          id: 'level',
          label: 'ระดับ',
          value: selectedCourse.level || 'ยังไม่ระบุ',
        },
        {
          id: 'lesson_total',
          label: 'บทเรียนทั้งหมด',
          value: String(flatNodes.length),
        },
        {
          id: 'section_total',
          label: 'จำนวนบทหลัก',
          value: String(sectionCount),
        },
        {
          id: 'lesson_child_total',
          label: 'จำนวนบทย่อย',
          value: String(lessonCount),
        },
        {
          id: 'student_total',
          label: 'จำนวนผู้เรียนคอร์สนี้',
          value: String(selectedCourse.enrollmentCount ?? 0),
        },
        {
          id: 'student_completed',
          label: 'จำนวนผู้เรียนที่เรียนจบ',
          value: String(selectedCourse.completedStudentCount ?? 0),
        },
        {
          id: 'student_review',
          label: 'คะแนนรีวิวจากนักเรียน',
          value: selectedCourse.reviewScore !== null && selectedCourse.reviewScore !== undefined ? selectedCourse.reviewScore.toFixed(1) : 'ยังไม่มีรีวิว',
        },
        {
          id: 'published_total',
          label: 'รายการที่เผยแพร่แล้ว',
          value: String(publishedNodeCount),
        },
        {
          id: 'updated_at',
          label: 'อัปเดตล่าสุด',
          value: formatDate(selectedCourse.updatedAt),
          time: formatTime(selectedCourse.updatedAt),
        },
      ] as Array<{ id: CourseDetailCardId; label: string; value: string; time?: string }>)
    : [];
  const orderedSelectedCourseCards = useMemo(() => {
    const cardMap = new Map(selectedCourseCards.map((card) => [card.id, card]));
    const ordered = courseDetailCardOrder
      .map((id) => cardMap.get(id))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
    const remaining = selectedCourseCards.filter((card) => !courseDetailCardOrder.includes(card.id));
    return [...ordered, ...remaining];
  }, [courseDetailCardOrder, selectedCourseCards]);
  const growthActions = [
    `${draftCourses} คอร์สยังไม่ published, ควรตรวจ owner workflow ก่อนขยาย tutor เพิ่ม`,
    `${expiringStudents} นักเรียนใกล้ต่ออายุ, ใช้เป็นฐานต่อยอด billing dashboard`,
    tutorCount ? `มี ${tutorCount} tenant แล้ว, หน้า Growth ควรเป็นจุดรวม health และ usage ต่อจากนี้` : 'เริ่มเปิด tenant แรกเพื่อวาง pattern ของ onboarding และ support',
  ];
  const createCourseSlugPreview = createCourseForm.title ? makeCourseSlug(createCourseForm.title) : 'course-slug';
  const billingSignals = [
    {
      label: 'Plan',
      value: licensePlanLabel,
      hint: 'workspace plan ของบัญชีปัจจุบัน',
    },
    {
      label: 'Renewal',
      value: licenseWindowLabel,
      hint: session?.license?.expiresAt ? formatDate(session.license.expiresAt) : 'ยังไม่มีวันหมดอายุ',
    },
    {
      label: 'Payment risk',
      value: expiringStudents > 0 ? 'watch' : 'quiet',
      hint: expiringStudents > 0 ? 'มี cohort ใกล้ต่ออายุ' : 'ยังไม่เห็นสัญญาณเร่งด่วน',
    },
  ];
  const usageSignals = [
    {
      label: 'Published courses',
      value: String(publishedCourses),
      hint: `${draftCourses} draft`,
    },
    {
      label: 'Active students',
      value: String(activeStudents),
      hint: `${expiringStudents} expiring`,
    },
    {
      label: 'Tutor network',
      value: String(tutorCount),
      hint: `${recentTutorCount} new in 30 days`,
    },
  ];
  const tenantStatusCards = [
    {
      label: 'Membership',
      value: tenantContext?.membership.role || session?.user.role || 'unknown',
      hint: tenantContext?.membership.isDefault ? 'default workspace' : 'secondary workspace',
    },
    {
      label: 'License',
      value: licenseHealthLabel,
      hint: `${licensePlanLabel} · ${licenseWindowLabel}`,
    },
    {
      label: 'Features',
      value: String(featureKeys.length),
      hint: featureKeys.length ? featureKeys.slice(0, 3).join(' • ') : 'no feature flags',
    },
    {
      label: 'Video storage',
      value: packageUsedLabel,
      hint: `quota ${packageQuotaLabel}`,
    },
  ];
  const lessonPreviewFacts = [
    {
      label: 'Content',
      value: selectedModule?.content ? truncateText(selectedModule.content, 180) : 'ยังไม่มี lesson content',
    },
    {
      label: 'Asset',
      value: selectedModule?.asset?.url || selectedModule?.asset?.fileUrl || selectedModule?.asset?.externalUrl || 'ยังไม่มี asset',
    },
    {
      label: 'Transcript',
      value: selectedModule?.transcriptFullText ? truncateText(selectedModule.transcriptFullText, 180) : 'ไม่มี transcript',
    },
    {
      label: 'Playback',
      value: selectedModule?.videoHlsUrl || selectedModule?.videoUrl || 'ยังไม่มีวิดีโอ',
    },
  ];
  const themeToggleLabel = theme === 'dark' ? 'Light mode' : 'Dark mode';
  const isAssetUploadBusy = assetUploadState?.stage === 'uploading' || assetUploadState?.stage === 'finalizing';
  const lessonFileAssets = selectedModule?.assets?.filter((asset) => asset.assetType !== 'assignment') || [];
  const exerciseFileAssets = selectedModule?.assets?.filter((asset) => asset.assetType === 'assignment') || [];
  const getAssetTypeLabel = (assetType?: string | null) => {
    if (assetType === 'assignment') return 'การบ้าน';
    if (assetType === 'attachment') return 'ไฟล์ประกอบบทเรียน';
    if (assetType === 'pdf') return 'PDF';
    if (assetType === 'image') return 'รูปภาพ';
    if (assetType === 'link') return 'ลิงก์';
    return assetType || 'attachment';
  };
  const activeNoticeModal = assetUploadState
    ? {
        source: 'asset-upload' as const,
        title: assetUploadState.title,
        label:
          assetUploadState.stage === 'success'
            ? 'สำเร็จ'
            : assetUploadState.stage === 'error'
              ? 'อัปโหลดไม่สำเร็จ'
              : 'กำลังอัปโหลด',
        message: assetUploadState.message,
      }
    : error
      ? {
          source: 'workspace' as const,
          title: 'มีปัญหาในการดำเนินการ',
          label: 'แจ้งเตือนจากระบบ',
          message: error,
        }
      : landingError
        ? {
            source: 'landing' as const,
            title: 'มีปัญหาในการบันทึก',
            label: 'Landing page',
            message: landingError,
          }
        : paymentError
          ? {
              source: 'payment' as const,
              title: 'มีปัญหาในการชำระเงิน',
              label: 'Payment flow',
              message: paymentError,
            }
        : pricingError
            ? {
                source: 'pricing' as const,
                title: 'มีปัญหาในการตั้งราคา',
                label: isOwnerWorkspace ? 'Price / Promotion' : 'รายเดือน / รายคอร์ส',
                message: pricingError,
              }
          : tutorError
            ? {
                source: 'tutor' as const,
                title: 'มีปัญหาในการสร้างติวเตอร์',
                label: 'Tutor management',
                message: tutorError,
              }
              : null;
  const dashboardNavGroups: Array<{
    label: string;
    items: Array<{ key: ViewKey; label: string; note?: string; active?: boolean }>;
  }> = [
    {
      label: 'Workspace',
      items: [
        { key: 'overview', label: 'Overview', active: view === 'overview' && !isCourseWorkspaceRoute && !isCourseDetailRoute && !isLessonRoute },
        { key: 'courses', label: 'Courses', active: isCourseWorkspaceRoute || view === 'courses' },
        { key: 'students', label: 'Students', active: view === 'students' },
      ],
    },
  ];
  if (session) {
    dashboardNavGroups.push({
      label: 'Commerce',
      items: isOwnerWorkspace
        ? [
            { key: 'price', label: 'Price', note: 'ตั้งราคาแพ็กเกจ', active: view === 'price' },
            { key: 'promotion', label: 'Promotion', note: 'โปรโมชันและส่วนลด', active: view === 'promotion' },
          ]
        : [
            { key: 'price', label: 'การขาย', note: 'รายเดือน และ รายคอร์ส', active: view === 'price' || view === 'promotion' },
          ],
    });
  }
  if (!isOwnerWorkspace) {
    dashboardNavGroups.push({
      label: 'Content',
      items: [{ key: 'website', label: 'Website', active: view === 'website' }],
    });
  }
  if (isOwnerWorkspace) {
    dashboardNavGroups.push({
      label: 'Platform',
      items: [{ key: 'growth', label: 'Growth', active: view === 'growth' }],
    });
  }

  const dashboardNavItems = dashboardNavGroups.flatMap((group) => group.items);

  function handleDashboardNavSelect(key: ViewKey) {
    if (key === 'courses') {
      setCoursesSubView('catalog');
      if (isCompactViewport) {
        setSelectedCourseId(null);
      }
      setView('courses');
      router.push(courseWorkspaceRoot);
      return;
    }
    if (key === 'price') {
      router.push(pricePath);
    } else if (key === 'promotion') {
      router.push(isOwnerWorkspace ? promotionPath : pricePath);
    } else if (isCourseWorkspaceRoute || isCourseDetailRoute || isLessonRoute) {
      router.push(dashboardPath);
    } else if (pathname !== dashboardPath) {
      router.push(dashboardPath);
    }
    setView(!isOwnerWorkspace && key === 'promotion' ? 'price' : key);
  }

  function handleQuickAddChild(node: CourseTreeNode, depth: number) {
    if (!canAcceptChildNodes({ nodeType: node.nodeType, level: depth })) return;
    setNodeForm((current) => ({
      ...current,
      nodeType: 'lesson',
      parentId: node.id,
    }));
    setTreeNotice(`กำลังเตรียมสร้างบทย่อยใต้ "${node.title}"`);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        document.getElementById('course-tree-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function handleQuickAddSection() {
    setNodeForm((current) => ({
      ...current,
      nodeType: 'section',
      parentId: '',
    }));
    setTreeNotice('กำลังเตรียมสร้างบทเรียนหลัก');
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        document.getElementById('course-tree-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function renderTreeNode(node: CourseTreeNode, depth = 0, siblingIndex = 0, siblingCount = 1): ReactElement {
    const isSelected = selectedNodeId === node.id;
    const childCount = node.children?.length || 0;
    const canAcceptChild = canAcceptChildNodes({ nodeType: node.nodeType, level: depth });
    const canDeleteNode = childCount === 0;
    const nodeMeta = [
      `${node.estimatedMinutes || 0} นาที`,
      childCount ? `${childCount} บทเรียนย่อย` : 'ไม่มีบทเรียนย่อย',
      `ลำดับ ${siblingIndex + 1}`,
    ];

    return (
      <article key={node.id} className={`tree-node tree-node-${node.nodeType}${isSelected ? ' is-selected' : ''}`} data-depth={depth}>
        <div className={`tree-node-main${normalizeNodeTypeValue(node.nodeType) === 'section' ? ' is-section' : ' is-lesson'}${isSelected ? ' is-selected' : ''}`}>
          <button
            className="tree-node-main-button"
            type="button"
            onClick={() => {
              setSelectedNodeId(node.id);
              if (selectedCourseId) {
                router.push(`${selectedCourseRoute}/lessons/${node.id}`);
              }
            }}
          >
            <div className="tree-node-copy">
              <div className="tree-node-title-row">
                <span className="tree-node-type">{formatNodeTypeLabel(node.nodeType)}</span>
                <strong>{node.title}</strong>
              </div>
              <div className="tree-node-meta-row">
                {nodeMeta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </button>
          <div className="tree-node-actions">
            <input
              className="tree-node-publish-toggle"
              type="checkbox"
              checked={node.isPublished}
              onChange={() => void handleToggleTreeNodePublish(node)}
              disabled={!session || treeActionState === 'saving'}
              aria-label={node.isPublished ? 'ปิดเผยแพร่' : 'เปิดเผยแพร่'}
              title={node.isPublished ? 'ปิดเผยแพร่' : 'เปิดเผยแพร่'}
            />
            <span className={`tree-node-state tone-${statusTone(node.isPublished ? 'published' : 'draft')}`}>{node.isPublished ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}</span>
            {siblingIndex > 0 ? (
              <button
                className="secondary-button tree-node-move-button"
                type="button"
                onClick={() => void handleMoveTreeNode(node.id, 'up')}
                disabled={!session || treeActionState === 'saving'}
                aria-label={`เลื่อน${formatNodeTypeLabel(node.nodeType)} ${node.title} ขึ้น`}
                title="เลื่อนขึ้น"
              >
                ↑
              </button>
            ) : (
              <span className="tree-node-action-placeholder" aria-hidden="true" />
            )}
            {siblingIndex < siblingCount - 1 ? (
              <button
                className="secondary-button tree-node-move-button"
                type="button"
                onClick={() => void handleMoveTreeNode(node.id, 'down')}
                disabled={!session || treeActionState === 'saving'}
                aria-label={`เลื่อน${formatNodeTypeLabel(node.nodeType)} ${node.title} ลง`}
                title="เลื่อนลง"
              >
                ↓
              </button>
            ) : (
              <span className="tree-node-action-placeholder" aria-hidden="true" />
            )}
            {canDeleteNode ? (
              <button
                className="tree-node-delete-button"
                type="button"
                onClick={() => void handleDeleteNode(node.id)}
                disabled={!session || treeActionState === 'saving'}
                aria-label={`ลบ${formatNodeTypeLabel(node.nodeType)} ${node.title}`}
                title={`ลบ${formatNodeTypeLabel(node.nodeType)}`}
              >
                ลบ
              </button>
            ) : (
              <span className="tree-node-action-placeholder" aria-hidden="true" />
            )}
            {canAcceptChild ? (
              <button
                className="secondary-button tree-node-move-button"
                type="button"
                onClick={() => handleQuickAddChild(node, depth)}
                disabled={!session || treeActionState === 'saving'}
                aria-label={`เพิ่มบทย่อยใต้${formatNodeTypeLabel(node.nodeType)} ${node.title}`}
                title="เพิ่มบทย่อย"
              >
                +ย่อย
              </button>
            ) : (
              <span className="tree-node-action-placeholder" aria-hidden="true" />
            )}
          </div>
        </div>
        {childCount ? <div className="tree-node-children">{node.children.map((child, index) => renderTreeNode(child, depth + 1, index, childCount))}</div> : null}
      </article>
    );
  }

  useEffect(() => {
    if (!selectedNode) return;
    setNodeEditForm({
      title: selectedNode.title,
      estimatedMinutes: String(selectedNode.estimatedMinutes || 0),
      isPublished: Boolean(selectedNode.isPublished),
    });
    setContentForm({
      contentType: 'article',
      plainText: selectedModule?.content || '',
      htmlContent: selectedModule?.content || '',
    });
    setTranscriptForm({
      mode: 'rows',
      language: selectedModule?.transcriptLanguage || 'th',
      status: (selectedModule?.transcriptStatus || 'ready') as 'ready' | 'processing' | 'failed' | 'uploading',
      rows: formatTranscriptSegmentsAsRows(selectedModule?.transcriptSegments?.map((segment) => ({
        seek: segment.seek,
        text: segment.text,
      })) || (selectedModule?.transcriptFullText ? [{ seek: '00:00', text: selectedModule.transcriptFullText }] : null)),
      rawText: formatTranscriptRowsAsRawText(
        formatTranscriptSegmentsAsRows(selectedModule?.transcriptSegments?.map((segment) => ({
          seek: segment.seek,
          text: segment.text,
        })) || (selectedModule?.transcriptFullText ? [{ seek: '00:00', text: selectedModule.transcriptFullText }] : null)),
      ),
    });
  }, [selectedNodeId, selectedNode, selectedModule?.content, selectedModule?.transcriptLanguage, selectedModule?.transcriptStatus, selectedModule?.transcriptSegments, selectedModule?.transcriptFullText]);

  useEffect(() => {
    if (!selectedNodeId) {
      assetHydrationNodeRef.current = null;
      return;
    }
    if (assetHydrationNodeRef.current === selectedNodeId) return;
    const firstLessonAsset = lessonFileAssets[0] || null;
    const firstExerciseAsset = exerciseFileAssets[0] || null;
    setLessonAssetForm({
      title: firstLessonAsset?.fileName || firstLessonAsset?.title || '',
      mimeType: firstLessonAsset?.mimeType || '',
      sizeBytes: firstLessonAsset?.sizeBytes ? String(firstLessonAsset.sizeBytes) : '',
      file: null,
    });
    setExerciseAssetForm({
      title: firstExerciseAsset?.fileName || firstExerciseAsset?.title || '',
      mimeType: firstExerciseAsset?.mimeType || '',
      sizeBytes: firstExerciseAsset?.sizeBytes ? String(firstExerciseAsset.sizeBytes) : '',
      file: null,
    });
    setLessonAssetInputKey((current) => current + 1);
    setExerciseAssetInputKey((current) => current + 1);
    assetHydrationNodeRef.current = selectedNodeId;
  }, [
    lessonFileAssets,
    exerciseFileAssets,
    selectedNodeId,
  ]);

  useEffect(() => {
    if (nodeForm.nodeType !== 'lesson') return;
    if (canPlaceNodeUnderParent(flatNodes, 'lesson', nodeForm.parentId || null)) return;
    setNodeForm((current) => ({ ...current, parentId: '' }));
  }, [flatNodes, nodeForm.nodeType, nodeForm.parentId]);

  useEffect(() => {
    setIsVideoManagerOpen(false);
  }, [selectedNodeId]);

  useEffect(() => {
    if (isVideoManagerOpen) return;
    resetUploadState();
  }, [isVideoManagerOpen, resetUploadState]);

  useEffect(() => {
    setNodeDetailTab(isLessonRoute ? 'transcript' : 'overview');
  }, [isLessonRoute, selectedNodeId]);

  function applyPreset(presetId: PresetId) {
    const preset = PRESETS.find((item) => item.id === presetId) || PRESETS[0];
    setSelectedPresetId(preset.id);
    setForm({ ...preset.payload });
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextSession = await login(form);
      setSession(nextSession);
      writeSession(mode, nextSession);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ลงชื่อเข้าใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  function closeNoticeModal() {
    if (!activeNoticeModal) return;
    switch (activeNoticeModal.source) {
      case 'asset-upload':
        if (assetUploadSuccessTimerRef.current !== null) {
          window.clearTimeout(assetUploadSuccessTimerRef.current);
          assetUploadSuccessTimerRef.current = null;
        }
        setAssetUploadState(null);
        break;
      case 'workspace':
        setError(null);
        break;
      case 'landing':
        setLandingError(null);
        break;
      case 'payment':
        setPaymentError(null);
        break;
      case 'pricing':
        setPricingError(null);
        break;
      case 'tutor':
        setTutorError(null);
        break;
    }
  }

  function handleLogout() {
    setSession(null);
    setLegacyCourses([]);
    setNestCourses([]);
    setStudents(null);
    setTenantContext(null);
    setTutors(null);
    setPricingConfig(null);
    setPricingDraft(null);
    setCoursePricingData(null);
    setCoursePricingLoading(false);
    setCoursePricingSaving(false);
    setCourseDiscountSaving(false);
    setCourseCommerceError(null);
    setEditingCourseDiscountId(null);
    setSelectedCourseId(null);
    setSelectedCourse(null);
    setTree([]);
    setError(null);
    writeSession(mode, null);
    setScreen('login');
    if (typeof window !== 'undefined') {
      window.location.href = loginPath;
    }
  }

  async function handleLoadLandingPage() {
    if (!session) return;
    setLandingLoading(true);
    setLandingError(null);
    try {
      const result = await fetchLandingPageHtml(session);
      setLandingHtml(result.html || '');
      setLandingUrl(result.url || '');
      setLandingExists(Boolean(result.exists));
    } catch (loadError) {
      setLandingError(loadError instanceof Error ? loadError.message : 'โหลด landing page ไม่สำเร็จ');
    } finally {
      setLandingLoading(false);
    }
  }

  async function handleSaveLandingPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setLandingSaving(true);
    setLandingError(null);
    try {
      const result = await saveLandingPageHtml(session, landingHtml);
      setLandingUrl(result.url || landingUrl);
      setLandingExists(true);
      setLandingHtml((current) => current);
    } catch (saveError) {
      setLandingError(saveError instanceof Error ? saveError.message : 'บันทึก landing page ไม่สำเร็จ');
    } finally {
      setLandingSaving(false);
    }
  }

  async function handleCreateTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return setTutorError('ต้องเข้าสู่ระบบก่อน');
    if (!canManageTutors) return setTutorError('บัญชีนี้ไม่มีสิทธิ์เปิด tutor ใหม่');
    setCreatingTutor(true);
    setTutorError(null);
    setTutorResult(null);
    try {
      const result = await createTutor(session, tutorForm);
      setTutorResult(result);
      const refreshedTutors = await fetchTutors(session).catch((fetchError) => {
        if (fetchError instanceof ApiError && (fetchError.status === 403 || fetchError.status === 404)) return null;
        throw fetchError;
      });
      if (refreshedTutors) {
        setTutors(refreshedTutors);
      }
      setTutorForm({ name: '', slug: '', email: '', password: 'password123', packageId: tutorForm.packageId || 'starter' });
    } catch (submitError) {
      setTutorError(submitError instanceof Error ? submitError.message : 'สร้าง tutor ไม่สำเร็จ');
    } finally {
      setCreatingTutor(false);
    }
  }

  function loadPricingOverrideFromTutor(tutorSlug: string) {
    const tutorEntry = tutors?.tutors?.find((entry) => entry.tenant.slug === tutorSlug);
    const configOverride = pricingOverrides.find((item) => item.tenantSlug === tutorSlug);
    const basePackage = pricingPackages.find((item) => item.id === (configOverride?.packageId || 'starter'));
    setPricingOverrideForm({
      tenantSlug: tutorSlug,
      tenantName: tutorEntry?.tenant.name || configOverride?.tenantName || '',
      packageId: (configOverride?.packageId || basePackage?.id || 'starter') as PricingPackage['id'],
      monthlyFee: configOverride?.monthlyFee?.toString() || basePackage?.monthlyFee?.toString() || '',
      revenueSharePct: configOverride?.revenueSharePct?.toString() || basePackage?.revenueSharePct?.toString() || '',
      videoQuotaGb: configOverride?.videoQuotaGb?.toString() || basePackage?.videoQuotaGb?.toString() || '',
      promoFreeMonths: String(configOverride?.promoFreeMonths ?? pricingPromo.freeMonths ?? 3),
      note: configOverride?.note || '',
    });
  }

  async function handleSavePricingConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !pricingDraft) return;
    setPricingSaving(true);
    setPricingError(null);
    try {
      const result = await savePricingConfig(session, pricingDraft);
      setPricingConfig(result);
      setPricingDraft(result);
    } catch (saveError) {
      setPricingError(saveError instanceof Error ? saveError.message : 'บันทึก pricing ไม่สำเร็จ');
    } finally {
      setPricingSaving(false);
    }
  }

  async function handleSaveMonthlyPricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveMonthlyPricingDraft();
  }

  async function saveMonthlyPricingDraft() {
    if (!session) return;
    const validation = validateMembershipOptions(membershipOptionsDraft);
    if (validation.messages.length) {
      setPricingError(`กรอกข้อมูลแผนเรียนให้ครบก่อนบันทึก: ${validation.messages.join(' / ')}`);
      return;
    }
    setPricingSaving(true);
    setPricingError(null);
    try {
      const normalizedMembershipOptions = membershipOptionsDraft.map((option) => ({
        id: option.id,
        name: option.name.trim() || `${option.durationMonths} เดือน`,
        durationMonths: option.durationMonths,
        compareAtPrice: option.compareAtPrice === null || option.compareAtPrice === undefined ? null : Number(option.compareAtPrice),
        salePrice: option.salePrice === null || option.salePrice === undefined ? null : Number(option.salePrice),
        enabled: option.enabled,
        includedCourseIds: [...new Set(option.includedCourseIds)],
      }));
      const primaryEnabledOption = normalizedMembershipOptions.find((option) => option.enabled && option.salePrice !== null)
        || normalizedMembershipOptions.find((option) => option.enabled)
        || normalizedMembershipOptions[0];
      const result = await saveTutorBillingProfile(session, {
        monthlyFeeMinor: primaryEnabledOption?.salePrice !== null && primaryEnabledOption?.salePrice !== undefined
          ? bahtToMinor(primaryEnabledOption.salePrice)
          : (monthlyPricingDraft.monthlyFee.trim() ? bahtToMinor(monthlyPricingDraft.monthlyFee) : null),
        currency: 'THB',
        billingModel: 'MONTHLY',
        checkoutOwner: 'TUTOR',
        studentAccountMode: 'TUTOR_MANAGED',
        active: true,
        notes: monthlyPricingDraft.notes.trim(),
        metadata: {
          saleMode: 'monthly',
        },
        pricing: {
          monthlyFee: primaryEnabledOption?.salePrice ?? (monthlyPricingDraft.monthlyFee.trim() ? Number(monthlyPricingDraft.monthlyFee) : null),
          promoEnabled: monthlyPricingDraft.promoEnabled,
          promoFreeMonths: Number(monthlyPricingDraft.promoFreeMonths || 0),
          renewalIntervalMonths: Number(monthlyPricingDraft.renewalIntervalMonths || 1),
          membershipOptions: normalizedMembershipOptions,
          includedCourseIds: [...new Set(normalizedMembershipOptions.flatMap((option) => option.includedCourseIds))],
        },
      });
      membershipLastSavedRef.current = serializeMembershipOptions(normalizedMembershipOptions);
      setTenantContext((current) => current ? {
        ...current,
        billingProfile: result.billingProfile ?? current.billingProfile ?? null,
        pricing: result.pricing ?? current.pricing ?? null,
      } : current);
      setSuccessNotice({
        title: 'บันทึกแผนเรียนแล้ว',
        label: 'สำเร็จ',
        message: 'รายการแผนเรียนของ workspace นี้ถูกบันทึกเรียบร้อยแล้ว',
      });
    } catch (saveError) {
      setPricingError(saveError instanceof Error ? saveError.message : 'บันทึกแผนเรียนไม่สำเร็จ');
    } finally {
      setPricingSaving(false);
    }
  }

  function updateMembershipOption(id: string, updater: (current: WorkspaceMembershipOption) => WorkspaceMembershipOption) {
    setMembershipOptionsDraft((current) => current.map((option) => (
      option.id === id ? updater(option) : option
    )));
  }

  function toggleMembershipCourse(id: string, courseId: string, checked: boolean) {
    updateMembershipOption(id, (current) => ({
      ...current,
      includedCourseIds: checked
        ? [...new Set([...current.includedCourseIds, courseId])]
        : current.includedCourseIds.filter((id) => id !== courseId),
    }));
  }

  async function handleSavePricingOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !pricingDraft || !pricingOverrideForm.tenantSlug) return;
    setPricingSaving(true);
    setPricingError(null);
    try {
      const basePackage = pricingPackages.find((item) => item.id === pricingOverrideForm.packageId) || pricingPackages[0];
      const nextOverride: PricingTutorOverride = {
        tenantSlug: pricingOverrideForm.tenantSlug.trim().toLowerCase(),
        tenantName: pricingOverrideForm.tenantName.trim() || pricingOverrideForm.tenantSlug.trim().toLowerCase(),
        packageId: pricingOverrideForm.packageId,
        monthlyFee: pricingOverrideForm.monthlyFee ? Number(pricingOverrideForm.monthlyFee) : basePackage?.monthlyFee ?? null,
        revenueSharePct: pricingOverrideForm.revenueSharePct ? Number(pricingOverrideForm.revenueSharePct) : basePackage?.revenueSharePct ?? null,
        videoQuotaGb: pricingOverrideForm.videoQuotaGb ? Number(pricingOverrideForm.videoQuotaGb) : basePackage?.videoQuotaGb ?? null,
        promoFreeMonths: pricingOverrideForm.promoFreeMonths ? Number(pricingOverrideForm.promoFreeMonths) : pricingPromo.freeMonths,
        note: pricingOverrideForm.note.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: session.user.email,
      };
      const overrides = [...pricingDraft.overrides.filter((item) => item.tenantSlug !== nextOverride.tenantSlug), nextOverride];
      const nextConfig = {
        ...pricingDraft,
        updatedAt: new Date().toISOString(),
        defaults: pricingDraft.defaults,
        overrides,
      };
      const result = await savePricingConfig(session, nextConfig);
      setPricingConfig(result);
      setPricingDraft(result);
      setPricingOverrideForm({
        tenantSlug: '',
        tenantName: '',
        packageId: 'starter',
        monthlyFee: '',
        revenueSharePct: '',
        videoQuotaGb: '',
        promoFreeMonths: '3',
        note: '',
      });
    } catch (saveError) {
      setPricingError(saveError instanceof Error ? saveError.message : 'บันทึก tutor override ไม่สำเร็จ');
    } finally {
      setPricingSaving(false);
    }
  }

  async function refreshCourseCommerce(nextCourseId = selectedCourseId) {
    if (!session || !nextCourseId) return;
    try {
      const result = await fetchCoursePricing(session, nextCourseId);
      setCoursePricingData(result);
      setCoursePricingDraft({
        priceMinor: minorToBahtInput(result.pricing?.priceMinor ?? 0),
        compareAtPriceMinor: minorToBahtInput(result.pricing?.compareAtPriceMinor ?? null),
        currency: result.pricing?.currency || 'THB',
        accessDurationMonths: String(result.pricing?.metadata?.accessDurationMonths || '3'),
        allowCoupons: result.pricing?.allowCoupons ?? true,
        allowPromotions: result.pricing?.allowPromotions ?? true,
        showPricePublicly: result.pricing?.showPricePublicly ?? true,
        salesStartsAt: result.pricing?.salesStartsAt ? new Date(result.pricing.salesStartsAt).toISOString().slice(0, 16) : '',
        salesEndsAt: result.pricing?.salesEndsAt ? new Date(result.pricing.salesEndsAt).toISOString().slice(0, 16) : '',
      });
    } catch (refreshError) {
      if (!(refreshError instanceof ApiError && refreshError.status === 404)) {
        setCourseCommerceError(refreshError instanceof Error ? refreshError.message : 'โหลดข้อมูลราคาไม่สำเร็จ');
      }
    }
  }

  async function handleSaveCoursePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCourseId) return;
    setCoursePricingSaving(true);
    setCourseCommerceError(null);
    try {
      const result = await saveCoursePricing(session, selectedCourseId, {
        priceMinor: bahtToMinor(coursePricingDraft.priceMinor),
        compareAtPriceMinor: coursePricingDraft.compareAtPriceMinor.trim()
          ? bahtToMinor(coursePricingDraft.compareAtPriceMinor)
          : null,
        currency: coursePricingDraft.currency.trim() || 'THB',
        allowCoupons: coursePricingDraft.allowCoupons,
        allowPromotions: coursePricingDraft.allowPromotions,
        showPricePublicly: coursePricingDraft.showPricePublicly,
        salesStartsAt: coursePricingDraft.salesStartsAt ? new Date(coursePricingDraft.salesStartsAt).toISOString() : null,
        salesEndsAt: coursePricingDraft.salesEndsAt ? new Date(coursePricingDraft.salesEndsAt).toISOString() : null,
        metadata: {
          source: 'tutor-course-pricing',
          saleMode: 'per_course',
          accessDurationMonths: coursePricingDraft.accessDurationMonths || '3',
          updatedBy: session.user.email,
        },
      });
      setCoursePricingData((current) => current ? { ...current, pricing: result.pricing } : current);
      setSuccessNotice({
        title: 'บันทึกราคาคอร์สแล้ว',
        label: 'สำเร็จ',
        message: 'ราคาและเงื่อนไขการขายของคอร์สนี้ถูกบันทึกเรียบร้อยแล้ว',
      });
      await refreshCourseCommerce(selectedCourseId);
    } catch (saveError) {
      setCourseCommerceError(saveError instanceof Error ? saveError.message : 'บันทึกราคาคอร์สไม่สำเร็จ');
    } finally {
      setCoursePricingSaving(false);
    }
  }

  async function handleCreateCourseDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCourseId) return;
    setCourseDiscountSaving(true);
    setCourseCommerceError(null);
    try {
      await createCourseDiscount(session, selectedCourseId, {
        mode: courseDiscountForm.mode,
        code: courseDiscountForm.mode === 'CODE' ? courseDiscountForm.code.trim().toUpperCase() || null : null,
        name: courseDiscountForm.name.trim() || 'โปรโมชั่นใหม่',
        description: courseDiscountForm.description.trim() || null,
        discountType: courseDiscountForm.discountType,
        discountValue: courseDiscountForm.discountType === 'PERCENT' && courseDiscountForm.discountValue.trim()
          ? Number(courseDiscountForm.discountValue)
          : null,
        discountAmountMinor: courseDiscountForm.discountType === 'AMOUNT' && courseDiscountForm.discountAmountMinor.trim()
          ? bahtToMinor(courseDiscountForm.discountAmountMinor)
          : null,
        status: courseDiscountForm.status,
        stackable: courseDiscountForm.stackable,
        priority: courseDiscountForm.priority.trim() ? Number(courseDiscountForm.priority) : 0,
        maxRedemptions: courseDiscountForm.maxRedemptions.trim() ? Number(courseDiscountForm.maxRedemptions) : null,
        maxRedemptionsPerStudent: courseDiscountForm.maxRedemptionsPerStudent.trim() ? Number(courseDiscountForm.maxRedemptionsPerStudent) : null,
        startsAt: courseDiscountForm.startsAt ? new Date(courseDiscountForm.startsAt).toISOString() : null,
        endsAt: courseDiscountForm.endsAt ? new Date(courseDiscountForm.endsAt).toISOString() : null,
        metadata: {
          source: 'tutor-course-discount',
          createdBy: session.user.email,
        },
      });
      setSuccessNotice({
        title: 'สร้างโปรโมชันแล้ว',
        label: 'สำเร็จ',
        message: 'เพิ่มคูปองหรือแคมเปญส่วนลดให้คอร์สนี้เรียบร้อยแล้ว',
      });
      setCourseDiscountForm((current) => ({
        ...current,
        code: '',
        name: '',
        description: '',
        discountValue: '10',
        discountAmountMinor: '',
        priority: '0',
        maxRedemptions: '',
        maxRedemptionsPerStudent: '',
        startsAt: '',
        endsAt: '',
      }));
      setEditingCourseDiscountId(null);
      await refreshCourseCommerce(selectedCourseId);
    } catch (saveError) {
      setCourseCommerceError(saveError instanceof Error ? saveError.message : 'สร้างโปรโมชันไม่สำเร็จ');
    } finally {
      setCourseDiscountSaving(false);
    }
  }

  function loadCourseDiscountIntoForm(campaign: CoursePricingResponse['discounts'][number]) {
    setEditingCourseDiscountId(String(campaign.id));
    setCourseDiscountForm({
      mode: campaign.mode,
      code: campaign.code || '',
      name: campaign.name || '',
      description: campaign.description || '',
      discountType: campaign.discountType,
      discountValue: campaign.discountType === 'PERCENT' && campaign.discountValue !== null ? String(campaign.discountValue) : '',
      discountAmountMinor: campaign.discountType === 'AMOUNT' && campaign.discountAmountMinor !== null ? String(Math.round(campaign.discountAmountMinor / 100)) : '',
      currency: campaign.currency || 'THB',
      status: campaign.status,
      stackable: campaign.stackable,
      priority: String(campaign.priority || 0),
      maxRedemptions: campaign.maxRedemptions === null ? '' : String(campaign.maxRedemptions),
      maxRedemptionsPerStudent: campaign.maxRedemptionsPerStudent === null ? '' : String(campaign.maxRedemptionsPerStudent),
      startsAt: campaign.startsAt ? new Date(campaign.startsAt).toISOString().slice(0, 16) : '',
      endsAt: campaign.endsAt ? new Date(campaign.endsAt).toISOString().slice(0, 16) : '',
    });
  }

  async function handleUpdateCourseDiscount() {
    if (!session || !selectedCourseId || !editingCourseDiscountId) return;
    setCourseDiscountSaving(true);
    setCourseCommerceError(null);
    try {
      await updateCourseDiscount(session, selectedCourseId, editingCourseDiscountId, {
        code: courseDiscountForm.mode === 'CODE' ? courseDiscountForm.code.trim().toUpperCase() || null : null,
        name: courseDiscountForm.name.trim() || 'โปรโมชั่นใหม่',
        description: courseDiscountForm.description.trim() || null,
        discountType: courseDiscountForm.discountType,
        discountValue: courseDiscountForm.discountType === 'PERCENT' && courseDiscountForm.discountValue.trim()
          ? Number(courseDiscountForm.discountValue)
          : null,
        discountAmountMinor: courseDiscountForm.discountType === 'AMOUNT' && courseDiscountForm.discountAmountMinor.trim()
          ? bahtToMinor(courseDiscountForm.discountAmountMinor)
          : null,
        status: courseDiscountForm.status,
        stackable: courseDiscountForm.stackable,
        priority: courseDiscountForm.priority.trim() ? Number(courseDiscountForm.priority) : 0,
        maxRedemptions: courseDiscountForm.maxRedemptions.trim() ? Number(courseDiscountForm.maxRedemptions) : null,
        maxRedemptionsPerStudent: courseDiscountForm.maxRedemptionsPerStudent.trim() ? Number(courseDiscountForm.maxRedemptionsPerStudent) : null,
        startsAt: courseDiscountForm.startsAt ? new Date(courseDiscountForm.startsAt).toISOString() : null,
        endsAt: courseDiscountForm.endsAt ? new Date(courseDiscountForm.endsAt).toISOString() : null,
        metadata: {
          source: 'tutor-course-discount',
          updatedBy: session.user.email,
        },
      });
      setEditingCourseDiscountId(null);
      setSuccessNotice({
        title: 'อัปเดตโปรโมชันแล้ว',
        label: 'สำเร็จ',
        message: 'คูปอง/โปรโมชันถูกอัปเดตเรียบร้อยแล้ว',
      });
      await refreshCourseCommerce(selectedCourseId);
    } catch (updateError) {
      setCourseCommerceError(updateError instanceof Error ? updateError.message : 'อัปเดตโปรโมชันไม่สำเร็จ');
    } finally {
      setCourseDiscountSaving(false);
    }
  }

  async function handleDeleteCourseDiscount(discountId: string) {
    if (!session || !selectedCourseId) return;
    if (typeof window !== 'undefined' && !window.confirm('ลบโปรโมชันนี้ใช่หรือไม่')) return;
    setCourseDiscountSaving(true);
    setCourseCommerceError(null);
    try {
      await deleteCourseDiscount(session, selectedCourseId, discountId);
      if (editingCourseDiscountId === discountId) {
        setEditingCourseDiscountId(null);
      }
      setSuccessNotice({
        title: 'ลบโปรโมชันแล้ว',
        label: 'สำเร็จ',
        message: 'คูปอง/โปรโมชันถูกลบออกจากคอร์สแล้ว',
      });
      await refreshCourseCommerce(selectedCourseId);
    } catch (deleteError) {
      setCourseCommerceError(deleteError instanceof Error ? deleteError.message : 'ลบโปรโมชันไม่สำเร็จ');
    } finally {
      setCourseDiscountSaving(false);
    }
  }

  async function handleCreatePaymentSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setCreatingPaymentSession(true);
    setPaymentError(null);
    setPaymentResult(null);
    setPaymentConfirmResult(null);
    try {
      const result = await createPaymentSession(session, paymentForm.courseId || selectedCourseId || '');
      setPaymentResult(result);
      setPaymentConfirmSessionId(result.sessionId);
    } catch (submitError) {
      setPaymentError(submitError instanceof Error ? submitError.message : 'สร้าง payment session ไม่สำเร็จ');
    } finally {
      setCreatingPaymentSession(false);
    }
  }

  async function handleConfirmPaymentSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const courseId = paymentForm.courseId || selectedCourseId || '';
    if (!courseId || !paymentConfirmSessionId) {
      setPaymentError('ต้องมี course และ sessionId ก่อนยืนยันการจ่ายเงิน');
      return;
    }

    setConfirmingPaymentSession(true);
    setPaymentError(null);
    try {
      const result = await confirmPaymentSession(session, {
        courseId,
        sessionId: paymentConfirmSessionId,
      });
      setPaymentConfirmResult(result);
    } catch (submitError) {
      setPaymentError(submitError instanceof Error ? submitError.message : 'ยืนยัน payment session ไม่สำเร็จ');
    } finally {
      setConfirmingPaymentSession(false);
    }
  }

  async function handleSaveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCourseId) return;
    setCourseSaveState('saving');
    try {
      const response = await updateCourse(session, selectedCourseId, courseForm);
      setSelectedCourse((current) => ({ ...(current || response.data), ...response.data }));
      setNestCourses((current) => current.map((course) => (String(course.id) === selectedCourseId ? { ...course, ...response.data } : course)));
      setLegacyCourses((current) => current.map((course) => (String(course.id) === selectedCourseId ? { ...course, ...response.data } : course)));
      setCourseSaveState('saved');
      setTimeout(() => setCourseSaveState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกคอร์สไม่สำเร็จ');
      setCourseSaveState('idle');
    }
  }

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setCourseSaveState('saving');
    try {
      const response = await createCourse(session, {
        ...createCourseForm,
        slug: createCourseForm.title ? makeCourseSlug(createCourseForm.title) : makeCourseSlug('course'),
      });
      const nextCourses = [...displayedCourses, response.data];
      setNestCourses(nextCourses);
      setLegacyCourses(nextCourses);
      setSelectedCourseId(response.data.id);
      setSelectedCourse({ ...response.data, modules: [] });
      setView('courses');
      setCoursesSubView('catalog');
      setError(null);
      setCreateCourseForm({ title: '', description: '', subject: '', level: '' });
      setCourseSaveState('saved');
      setTimeout(() => setCourseSaveState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'สร้างคอร์สไม่สำเร็จ');
      setCourseSaveState('idle');
    }
  }

  async function handleCreateNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedCourseId) return;
    if (!canPlaceNodeUnderParent(flatNodes, nodeForm.nodeType, nodeForm.parentId || null)) {
      setTreeNotice(
        normalizeNodeTypeValue(nodeForm.nodeType) === 'lesson'
          ? `บทย่อยต้องอยู่ใต้บทเรียนหรือบทย่อยที่ยังไม่ครบ ${MAX_LESSON_DEPTH} ระดับ`
          : 'ไม่สามารถสร้างรายการในตำแหน่งนี้ได้',
      );
      return;
    }
    setTreeActionState('saving');
    setTreeNotice(null);
    try {
      await createLessonNode(session, selectedCourseId, {
        parentId: nodeForm.parentId || undefined,
        nodeType: nodeForm.nodeType,
        title: nodeForm.title,
        estimatedMinutes: Number(nodeForm.estimatedMinutes || 0),
      });
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setNodeForm({ parentId: '', nodeType: 'lesson', title: '', estimatedMinutes: '30' });
      setTreeNotice('บันทึกโครงสร้างบทเรียนแล้ว');
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'สร้างบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleUpdateNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedNodeId || !selectedCourseId) return;
    setTreeActionState('saving');
    try {
      await updateLessonNode(session, selectedNodeId, {
        title: nodeEditForm.title,
        estimatedMinutes: Number(nodeEditForm.estimatedMinutes || 0),
        isPublished: nodeEditForm.isPublished,
      });
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'อัปเดตบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleToggleNodePublish() {
    if (!session || !selectedNodeId || !selectedCourseId) return;
    setTreeActionState('saving');
    try {
      await updateLessonNode(session, selectedNodeId, {
        title: nodeEditForm.title,
        estimatedMinutes: Number(nodeEditForm.estimatedMinutes || 0),
        isPublished: !nodeEditForm.isPublished,
      });
      setNodeEditForm((current) => ({ ...current, isPublished: !current.isPublished }));
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เปลี่ยนสถานะบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleToggleTreeNodePublish(node: CourseTreeNode) {
    if (!session || !selectedCourseId) return;
    setTreeActionState('saving');
    try {
      await updateLessonNode(session, node.id, {
        title: node.title,
        estimatedMinutes: Number(node.estimatedMinutes || 0),
        isPublished: !node.isPublished,
      });
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เปลี่ยนสถานะบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleDeleteNode(nodeId = selectedNodeId) {
    if (!session || !nodeId || !selectedCourseId) return;
    const targetNode = flatNodes.find((node) => node.id === nodeId);
    if (targetNode && normalizeNodeTypeValue(targetNode.nodeType) === 'section' && (targetNode.children?.length || 0) > 0) {
      setTreeNotice('บทเรียนหลักที่มีบทเรียนย่อยอยู่แล้วจะยังลบไม่ได้ กรุณาลบบทเรียนย่อยออกก่อน');
      return;
    }
    const targetLabel = targetNode ? formatNodeTypeLabel(targetNode.nodeType) : 'บทเรียน';
    const targetTitle = targetNode?.title || '';
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`ลบ${targetLabel}${targetTitle ? ` "${targetTitle}"` : ''} ใช่หรือไม่?${targetNode?.children?.length ? ' บทเรียนย่อยภายในจะถูกลบด้วย' : ''}`);
      if (!confirmed) return;
    }
    setTreeActionState('saving');
    setTreeNotice(null);
    try {
      await deleteLessonNode(session, nodeId);
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      if (selectedNodeId === nodeId || !flattenTree(refreshed.data.nodes || []).some((node) => node.id === selectedNodeId)) {
        setSelectedNodeId(null);
      }
      setTreeNotice('ลบบทเรียนแล้ว');
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'ลบบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleToggleCoursePublish() {
    if (!session || !selectedCourseId || !selectedCourse) return;
    setPublishState('saving');
    try {
      const action = selectedCourse.status === 'published' ? unpublishCourse : publishCourse;
      const response = await action(session, selectedCourseId);
      applyCoursePatch(selectedCourseId, {
        status: response.data.status,
        updatedAt: new Date().toISOString(),
      });
      await refreshSelectedCourse();
      setPublishState('saved');
      setTimeout(() => setPublishState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เปลี่ยนสถานะการเผยแพร่ไม่สำเร็จ');
      setPublishState('idle');
    }
  }

  async function handleDeleteCourseAction() {
    if (!session || !selectedCourseId || !selectedCourse) return;
    const confirmMessage = `ลบคอร์ส "${selectedCourse.title}" ใช่หรือไม่? การลบจะลบโครงสร้าง บทเรียน และข้อมูลที่ผูกกับคอร์สนี้ทั้งหมด`;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    setDeleteCourseState('saving');
    try {
      await deleteCourse(session, selectedCourseId);
      removeCourseFromState(selectedCourseId);
      setSelectedCourseId(null);
      setCoursesSubView('catalog');
      router.push(courseWorkspaceRoot);
      setDeleteCourseState('saved');
      setTimeout(() => setDeleteCourseState('idle'), 1200);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบคอร์สไม่สำเร็จ');
      setDeleteCourseState('idle');
    }
  }

  function handleCourseDragStart(event: ReactDragEvent<HTMLElement>, courseId: string) {
    setDraggedCourseId(courseId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', courseId);
  }

  function handleCourseDragEnd() {
    setDraggedCourseId(null);
    setActiveCourseDropId(null);
  }

  function handleCourseDragOver(event: ReactDragEvent<HTMLElement>, courseId: string) {
    if (!draggedCourseId || draggedCourseId === courseId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveCourseDropId(courseId);
  }

  async function handleCourseDrop(event: ReactDragEvent<HTMLElement>, courseId: string) {
    event.preventDefault();
    if (!draggedCourseId || draggedCourseId === courseId) {
      handleCourseDragEnd();
      return;
    }

    const currentIds = displayedCourses.map((course) => String(course.id));
    const sourceIndex = currentIds.indexOf(draggedCourseId);
    const targetIndex = currentIds.indexOf(courseId);
    if (sourceIndex < 0 || targetIndex < 0) {
      handleCourseDragEnd();
      return;
    }

    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(sourceIndex, 1);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextIds.splice(adjustedTargetIndex, 0, moved);
    await persistCourseOrder(nextIds);
  }

  async function handleSaveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedNodeId || !selectedCourseId) return;
    setTreeActionState('saving');
    try {
      await upsertLessonContent(session, selectedNodeId, contentForm);
      const legacyDetail = await fetchCourseDetail(session, selectedCourseId).catch(() => null);
      if (legacyDetail) {
        setSelectedCourse((current) => ({ ...(current || legacyDetail), ...legacyDetail }));
      }
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกเนื้อหาไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function submitAssetUpload(
    kind: AssetUploadKind,
    form: AssetFormState,
    setForm: Dispatch<SetStateAction<AssetFormState>>,
    setInputKey: Dispatch<SetStateAction<number>>,
  ) {
    if (!session || !selectedNodeId || !selectedCourseId) return;
    if (assetUploadSuccessTimerRef.current !== null) {
      window.clearTimeout(assetUploadSuccessTimerRef.current);
      assetUploadSuccessTimerRef.current = null;
    }
    const uploadLabel = kind === 'exercise' ? 'การบ้าน' : 'ไฟล์ประกอบบทเรียน';
    try {
      if (!form.file) {
        setAssetUploadState({
          kind,
          stage: 'error',
          title: 'เลือกไฟล์ก่อน',
          fileName: '',
          fileSize: 0,
          progress: 0,
          message: `กรุณาเลือก${uploadLabel}ก่อนกดบันทึก`,
        });
        return;
      }

      const file = form.file;
      setAssetUploadState({
        kind,
        stage: 'uploading',
        title: 'กำลังอัปโหลดไฟล์',
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        message: 'กำลังส่งไฟล์ไปยังเซิร์ฟเวอร์, โปรดรอจนกว่าการอัปโหลดจะเสร็จ',
      });

      await saveLessonAssetFile(
        session,
        selectedNodeId,
        {
          file,
          title: form.title.trim() || file?.name || uploadLabel,
          assetType: kind === 'exercise' ? 'assignment' : 'attachment',
        },
        {
          onProgress: (progress) => {
            setAssetUploadState((current) => {
              if (!current || current.stage === 'error' || current.stage === 'success') return current;
              return {
                ...current,
                stage: 'uploading',
                progress,
                message: progress >= 100
                  ? 'ไฟล์ถูกส่งขึ้นครบแล้ว, กำลังอัปเดตข้อมูลบทเรียน'
                  : 'กำลังส่งไฟล์ไปยังเซิร์ฟเวอร์, โปรดรอจนกว่าการอัปโหลดจะเสร็จ',
              };
            });
          },
        },
      );

      setAssetUploadState({
        kind,
        stage: 'finalizing',
        title: 'อัปโหลดเสร็จแล้ว',
        fileName: file.name,
        fileSize: file.size,
        progress: 100,
        message: 'ไฟล์ถูกส่งขึ้นครบแล้ว, กำลังอัปเดตข้อมูลบทเรียน',
      });
      const legacyDetail = await fetchCourseDetail(session, selectedCourseId).catch(() => null);
      if (legacyDetail) {
        setSelectedCourse((current) => ({ ...(current || legacyDetail), ...legacyDetail }));
      }
      setForm(createEmptyAssetForm());
      setInputKey((current) => current + 1);
      setAssetUploadState({
        kind,
        stage: 'success',
          title: kind === 'exercise' ? 'อัปโหลดการบ้านแล้ว' : 'อัปโหลดไฟล์ประกอบบทเรียนแล้ว',
        fileName: file.name,
        fileSize: file.size,
        progress: 100,
        message: kind === 'exercise'
          ? 'การบ้านถูกอัปโหลดและผูกกับบทเรียนเรียบร้อยแล้ว'
          : 'ไฟล์ถูกอัปโหลดและผูกกับบทเรียนเรียบร้อยแล้ว',
      });
      assetUploadSuccessTimerRef.current = window.setTimeout(() => {
        setAssetUploadState(null);
        assetUploadSuccessTimerRef.current = null;
      }, 1400);
    } catch (saveError) {
      setAssetUploadState({
        kind,
        stage: 'error',
        title: 'อัปโหลดไฟล์ไม่สำเร็จ',
        fileName: form.file?.name || '',
        fileSize: form.file?.size || 0,
        progress: 0,
        message: saveError instanceof Error ? saveError.message : `บันทึก${uploadLabel}ไม่สำเร็จ`,
      });
    }
  }

  async function handleSaveLessonAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAssetUpload('lesson', lessonAssetForm, setLessonAssetForm, setLessonAssetInputKey);
  }

  async function handleSaveExerciseAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAssetUpload('exercise', exerciseAssetForm, setExerciseAssetForm, setExerciseAssetInputKey);
  }

  async function handleDeleteLessonAsset(assetId: string) {
    if (!session || !selectedNodeId || !selectedCourseId) return;
    if (typeof window !== 'undefined' && !window.confirm('ลบไฟล์ประกอบบทเรียนนี้ใช่หรือไม่')) return;
    setTreeActionState('saving');
    try {
      await deleteLessonAsset(session, selectedNodeId, assetId);
      const legacyDetail = await fetchCourseDetail(session, selectedCourseId).catch(() => null);
      if (legacyDetail) {
        setSelectedCourse((current) => ({ ...(current || legacyDetail), ...legacyDetail }));
      }
      setTreeActionState('saved');
      setSuccessNotice({
        title: 'ลบไฟล์ประกอบบทเรียนแล้ว',
        label: 'สำเร็จ',
        message: 'ไฟล์ถูกลบออกจากบทเรียนเรียบร้อยแล้ว',
      });
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบไฟล์ประกอบบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleSaveTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedNodeId || !selectedCourseId) return;
    setTreeActionState('saving');
    try {
      const sourceRows =
        transcriptForm.mode === 'raw'
          ? parseTranscriptRawText(transcriptForm.rawText).map((row, index) => ({
              id: `segment-${index + 1}`,
              seek: row.seek,
              text: row.text,
            }))
          : transcriptForm.rows;
      const normalizedRows = sourceRows
        .map((row) => ({
          seek: row.seek.trim(),
          text: row.text.trim(),
        }))
        .filter((row) => row.seek || row.text);
      const sortedRows = sortTranscriptRowsBySeek(
        normalizedRows.map((row, index) => ({
          id: `segment-${index + 1}`,
          seek: row.seek,
          text: row.text,
        })),
      );
      if (!sortedRows.length) {
        throw new Error('กรุณาใส่ transcript อย่างน้อย 1 บรรทัด');
      }
      if (transcriptForm.mode === 'raw' && parseTranscriptRawText(transcriptForm.rawText).length !== normalizedRows.length) {
        throw new Error('รูปแบบ raw transcript ต้องขึ้นต้นด้วยเวลา เช่น 0:00 หรือ 00:00');
      }
      const invalidRow = sortedRows.find((row) => parseTranscriptSeek(row.seek) === null);
      if (invalidRow) {
        throw new Error(`เวลา transcript ไม่ถูกต้อง: ${invalidRow.seek || '(ว่าง)'}`);
      }
      const segments = sortedRows.map((row, index) => ({
        seek: formatTranscriptSeek(parseTranscriptSeek(row.seek) || 0),
        progress: Math.round(((index + 1) / Math.max(1, normalizedRows.length)) * 100),
        text: row.text,
      }));
      await upsertLessonTranscript(session, selectedNodeId, {
        language: transcriptForm.language,
        status: transcriptForm.status,
        fullText: normalizedRows.map((row) => row.text).join('\n'),
        segments,
      });
      setTranscriptForm((current) => ({
        ...current,
        mode: current.mode,
        rows: sortedRows.map((row, index) => ({
          id: row.id || `segment-${index + 1}`,
          seek: formatTranscriptSeek(parseTranscriptSeek(row.seek) || 0),
          text: row.text,
        })),
        rawText: formatTranscriptRowsAsRawText(
          sortedRows.map((row, index) => ({
            id: row.id || `segment-${index + 1}`,
            seek: formatTranscriptSeek(parseTranscriptSeek(row.seek) || 0),
            text: row.text,
          })),
        ),
      }));
      const legacyDetail = await fetchCourseDetail(session, selectedCourseId).catch(() => null);
      if (legacyDetail) {
        setSelectedCourse((current) => ({ ...(current || legacyDetail), ...legacyDetail }));
      }
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึก transcript ไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleMoveNode(direction: 'up' | 'down') {
    if (!session || !selectedCourseId || !selectedNodeId) return;
    const moves = collectSiblingMoves(tree, selectedNodeId, direction);
    if (!moves.length) return;
    setTreeActionState('saving');
    try {
      await reorderCourseTree(session, selectedCourseId, moves);
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'จัดลำดับบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function handleMoveTreeNode(nodeId: string, direction: 'up' | 'down') {
    if (!session || !selectedCourseId) return;
    const moves = collectSiblingMoves(tree, nodeId, direction);
    if (!moves.length) return;
    setTreeActionState('saving');
    try {
      await reorderCourseTree(session, selectedCourseId, moves);
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'จัดลำดับบทเรียนไม่สำเร็จ');
      setTreeActionState('idle');
    }
  }

  async function applyTreeMoves(moves: Array<{ nodeId: string; newParentId?: string | null; newSortOrder: number }>, fallbackMessage: string) {
    if (!session || !selectedCourseId || !moves.length) return;
    setTreeActionState('saving');
    try {
      await reorderCourseTree(session, selectedCourseId, moves);
      const refreshed = await fetchCourseTree(session, selectedCourseId);
      setTree(refreshed.data.nodes || []);
      await refreshSelectedCourse();
      setTreeActionState('saved');
      setTimeout(() => setTreeActionState('idle'), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : fallbackMessage);
      setTreeActionState('idle');
    }
  }

  function handleCourseDetailCardDragStart(event: ReactDragEvent<HTMLElement>, cardId: CourseDetailCardId) {
    setDraggedCourseDetailCardId(cardId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
  }

  function handleCourseDetailCardDragEnd() {
    setDraggedCourseDetailCardId(null);
    setActiveCourseDetailCardDropId(null);
  }

  function handleCourseDetailCardDragOver(event: ReactDragEvent<HTMLElement>, cardId: CourseDetailCardId) {
    if (!draggedCourseDetailCardId || draggedCourseDetailCardId === cardId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveCourseDetailCardDropId(cardId);
  }

  function handleCourseDetailCardDrop(event: ReactDragEvent<HTMLElement>, targetCardId: CourseDetailCardId) {
    if (!draggedCourseDetailCardId || draggedCourseDetailCardId === targetCardId) return;
    event.preventDefault();
    setCourseDetailCardOrder((current) => {
      const withoutDragged = current.filter((id) => id !== draggedCourseDetailCardId);
      const targetIndex = withoutDragged.indexOf(targetCardId);
      if (targetIndex < 0) return current;
      const next = [...withoutDragged];
      next.splice(targetIndex, 0, draggedCourseDetailCardId);
      return next;
    });
    setDraggedCourseDetailCardId(null);
    setActiveCourseDetailCardDropId(null);
  }

  function updatePricingPackageDraft(packageId: PricingPackage['id'], field: 'monthlyFee' | 'revenueSharePct' | 'videoQuotaGb' | 'name' | 'note' | 'highlighted', value: string | boolean) {
    setPricingDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        defaults: {
          ...current.defaults,
          packages: current.defaults.packages.map((item) =>
            item.id === packageId
              ? {
                  ...item,
                  [field]:
                    field === 'highlighted'
                      ? Boolean(value)
                      : field === 'name' || field === 'note'
                        ? String(value)
                        : value === ''
                          ? null
                          : Number(value),
                }
              : item,
          ),
        },
      };
    });
  }

  function updatePricingPromoDraft(field: 'enabled' | 'freeMonths' | 'label' | 'note', value: string | boolean) {
    setPricingDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        defaults: {
          ...current.defaults,
          promo: {
            ...current.defaults.promo,
            [field]:
              field === 'enabled'
                ? Boolean(value)
                : field === 'freeMonths'
                  ? Number(value)
                  : String(value),
          },
        },
      };
    });
  }

  if (shouldShowLoadingShell) {
    return (
      <main
        className="educator-app"
        data-theme={theme}
        data-route="loading"
        data-workspace={mode}
        data-screen={screen}
      >
        <div className="halo halo-a" />
        <div className="halo halo-b" />
        <section className="workspace-shell workspace-loading-shell">
          <div className="content-panel">
            <div className="panel-head">
              <div>
                <span className="section-label">Loading</span>
                <h3>กำลังเตรียมพื้นที่ทำงาน</h3>
              </div>
            </div>
            <div className="empty-state">
              <strong>{hydrated ? 'กำลังเชื่อมต่อ session' : 'กำลังโหลดข้อมูลผู้ใช้'}</strong>
              <p>ระบบจะพาไปยังหน้าใช้งานจริงทันทีเมื่อ session พร้อม</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="educator-app"
      data-theme={theme}
      data-route={isLessonRoute ? 'lesson-detail' : isCourseDetailRoute ? 'course-detail' : isCourseWorkspaceRoute ? 'courses' : view}
      data-workspace={mode}
      data-screen={screen}
      data-course-selected={selectedCourseId ? 'true' : 'false'}
      data-course-sheet-open={selectedCourse && !isCourseDetailRoute ? 'true' : 'false'}
    >
      <div className="halo halo-a" />
      <div className="halo halo-b" />
      <div className="page-decor page-decor-stars" aria-hidden="true" />
      <div className="page-decor page-decor-flowers" aria-hidden="true" />
      <div className="page-decor page-decor-stars-left" aria-hidden="true" />
      <div className="page-decor page-decor-stars-right" aria-hidden="true" />
      <div className="page-decor page-decor-flowers-left" aria-hidden="true" />
      <div className="page-decor page-decor-flowers-right" aria-hidden="true" />
      {screen === 'login' ? (
        <section className="hero-panel login-screen">
          <div className="hero-copy">
            <div className="hero-head">
              <span className="hero-kicker">{isOwnerWorkspace ? 'เข้าสู่ระบบ owner' : 'เข้าสู่ระบบ tutor'}</span>
              <button className="theme-toggle" type="button" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} aria-pressed={theme === 'light'}>
                {themeToggleLabel}
              </button>
            </div>
            <h1>{isOwnerWorkspace ? 'ศูนย์ควบคุมสำหรับ owner ที่ดูแล tenant, การเงิน และเครือข่าย tutor' : 'พื้นที่ทำงานสำหรับ tutor ที่โฟกัสคอร์ส นักเรียน และการสอน'}</h1>
            <p>{isOwnerWorkspace ? 'หน้า owner แยกจาก tutor ชัดเจน เพื่อให้ศูนย์ควบคุม, onboarding และงานปฏิบัติการอยู่คนละส่วนกับงานสอนประจำวัน.' : 'หน้าทางเข้าของ tutor แยกออกจากศูนย์ควบคุม เพื่อให้ workflow การสอนเรียบและไม่ปนกับงานแพลตฟอร์ม.'}</p>
            <div className="hero-rail">
              <article className="hero-note"><strong>{isOwnerWorkspace ? 'เข้าใช้งานที่ `/growth`' : 'เข้าใช้งานที่ `/educator`'}</strong><span>{isOwnerWorkspace ? 'นี่คือศูนย์ควบคุมของเจ้าของแพลตฟอร์ม' : 'นี่คือพื้นที่ทำงานของ tutor เท่านั้น'}</span></article>
              <article className="hero-note"><strong>{isOwnerWorkspace ? 'บัญชี owner' : 'บัญชี tutor'}</strong><span>{isOwnerWorkspace ? '`coursechic@gmail.com` ใช้สำหรับจัดการแพลตฟอร์ม' : '`lungteelek@gmail.com` ใช้สำหรับงานสอน'}</span></article>
            </div>
          </div>
          <div className="login-panel">
            {!session ? (
              <div className="profile-switcher" role="tablist" aria-label="Login profile">
                {(isOwnerWorkspace ? [PRESETS[0]] : [PRESETS[1]]).map((preset) => (
                  <button key={preset.id} className="profile-chip is-active" type="button" onClick={() => applyPreset(preset.id)}>
                    <span>{preset.label}</span><small>{preset.description}</small>
                  </button>
                ))}
              </div>
            ) : null}
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="section-label">เข้าสู่ระบบ</div>
              <label className="field"><span>อีเมลหรือชื่อผู้ใช้</span><input type="text" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
              <label className="field"><span>รหัสผ่าน</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label>
              <p className="login-hint">เข้าสู่พื้นที่ทำงานกลางของ <strong>educator</strong> ได้จาก URL ใดก็ได้</p>
              <button className="primary-button" type="submit" disabled={loading}>{loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่พื้นที่ทำงาน'}</button>
            </form>
          </div>
        </section>
      ) : null}

      {screen === 'dashboard' ? (
      <section className="workspace-shell">
        <header className="workspace-bar">
          <div>
            <span className="section-label">{isCourseWorkspaceRoute ? 'จัดการคอร์ส' : dashboardSectionLabel}</span>
            <h2>{session ? WORKSPACE_NAME : 'ยังไม่ได้เข้าสู่ระบบ'}</h2>
            {!isCourseWorkspaceRoute && (view === 'price' || view === 'promotion') ? (
              <p className="workspace-breadcrumb">
                <button type="button" className="breadcrumb-link" onClick={() => router.push(dashboardPath)}>
                  พื้นที่ทำงาน
                </button>
                <span>/</span>
                <span>{dashboardContextLabel}</span>
              </p>
            ) : null}
            {isCourseWorkspaceRoute ? (
              <p className="workspace-breadcrumb">
                <button type="button" className="breadcrumb-link" onClick={() => router.push('/educator')}>
                  พื้นที่ทำงาน
                </button>
                <span>/</span>
                <button type="button" className="breadcrumb-link" onClick={() => router.push(courseWorkspaceRoot)}>
                  รายการคอร์ส
                </button>
                {isCourseDetailRoute && selectedCourse ? (
                  <span>/ {selectedCourse.title}</span>
                ) : null}
                {isLessonRoute ? (
                  <>
                    <button type="button" className="breadcrumb-link" onClick={handleBackToCourseDetail}>
                      {selectedCourse?.title || routeCourseId || 'คอร์สนี้'}
                    </button>
                    <span>/</span>
                    <span>
                      {selectedNode?.nodeType ? `${formatNodeTypeLabel(selectedNode.nodeType)} · ` : 'บทเรียน · '}
                      {selectedNode?.title || routeNodeId || 'บทเรียนนี้'}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="workspace-actions">
                {session ? (
                  <details className="workspace-menu" ref={workspaceMenuRef}>
                    <summary className="workspace-menu-summary">
                      <span className="workspace-menu-role">{isOwnerWorkspace ? formatRole(session.user.role) : 'Educator'}</span>
                      <span className="workspace-menu-email">{session.user.email}</span>
                      <span className="workspace-menu-chevron" aria-hidden="true">⌄</span>
                    </summary>
                    <div className="workspace-menu-panel">
                      <button className="workspace-menu-item" type="button" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} aria-pressed={theme === 'light'}>
                        {themeToggleLabel}
                      </button>
                      <button className="workspace-menu-item is-danger" type="button" onClick={handleLogout}>
                        ออกจากระบบ
                      </button>
                    </div>
                  </details>
            ) : <div className="session-pill is-muted"><strong>Guest</strong><span>ล็อกอินเพื่อโหลดข้อมูลจาก backend</span></div>}
          </div>
        </header>
        {successNotice ? (
          <div className="workspace-banner is-success" role="status" aria-live="polite">
            <div className="workspace-banner-copy">
              <span className="section-label">{successNotice.label}</span>
              <strong>{successNotice.title}</strong>
              <p>{successNotice.message}</p>
            </div>
            <button className="secondary-button workspace-banner-close" type="button" onClick={() => setSuccessNotice(null)}>
              ปิด
            </button>
          </div>
        ) : null}

        <nav className="mobile-workspace-nav" aria-label="Workspace navigation">
          {dashboardNavItems.map((item) => (
            <button
              key={item.key}
              className={`mobile-nav-link${view === item.key ? ' is-active' : ''}`}
              type="button"
              onClick={() => handleDashboardNavSelect(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {screen === 'dashboard' && !isCourseWorkspaceRoute && !isCourseDetailRoute ? (
          <section className="mobile-dashboard-launcher" aria-label="Quick navigation">
            <div className="mobile-dashboard-launcher-copy">
              <span className="section-label">เมนูด่วน</span>
              <h3>เลือกหน้าที่จะไปต่อ</h3>
              <p>ปุ่มนี้จะอยู่บนสุดบนมือถือ เพื่อเข้า Courses ได้ทันทีหลังล็อกอิน</p>
            </div>
            <div className="mobile-dashboard-launcher-actions">
              <button type="button" className={`mobile-launcher-button${view === 'overview' ? ' is-active' : ''}`} onClick={() => handleDashboardNavSelect('overview')}>
                ภาพรวม
              </button>
              <button type="button" className={`mobile-launcher-button mobile-launcher-button-primary${view === 'courses' ? ' is-active' : ''}`} onClick={() => handleDashboardNavSelect('courses')}>
                ไปหน้า Courses
              </button>
              <button type="button" className={`mobile-launcher-button${view === 'students' ? ' is-active' : ''}`} onClick={() => handleDashboardNavSelect('students')}>
                นักเรียน
              </button>
              {session ? (
                <>
                  <button type="button" className={`mobile-launcher-button${view === 'price' ? ' is-active' : ''}`} onClick={() => handleDashboardNavSelect('price')}>
                    {isOwnerWorkspace ? 'Price' : 'การขาย'}
                  </button>
                  {isOwnerWorkspace ? (
                    <button type="button" className={`mobile-launcher-button${view === 'promotion' ? ' is-active' : ''}`} onClick={() => handleDashboardNavSelect('promotion')}>
                      Promotion
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="workspace-grid">
          {!isLessonRoute ? <WorkspaceSidebar groups={dashboardNavGroups} onNavigate={(key) => handleDashboardNavSelect(key as ViewKey)} /> : null}

          <div className="workspace-main">
            {(view === 'price' || view === 'promotion') ? (
              <section className="panel-stack">
                <article className="content-panel">
                  <div className="panel-head">
                    <div>
                      <span className="section-label">{view === 'price' ? 'การขาย' : 'โปรโมชัน'}</span>
                      <h3>{view === 'price' ? 'ตั้งค่าการขายของ workspace นี้' : 'ตั้งค่าโปรโมชันของ workspace นี้'}</h3>
                    </div>
                    <span className="status-pill">{session ? 'ready' : 'pending'}</span>
                  </div>
                  <div className="pricing-summary-grid">
                    <article className="pricing-summary-card">
                      <span>{view === 'price' ? 'ค่าสมาชิกรายเดือน' : 'โปรโมชันปัจจุบัน'}</span>
                      <strong>{view === 'price' ? packagePriceLabel : packagePromoLabel}</strong>
                      <small>{view === 'price' ? 'ใช้สำหรับการเข้าเรียนทั้ง workspace' : 'ผูกกับสิทธิ์หรือแคมเปญที่ใช้งานอยู่'}</small>
                    </article>
                    <article className="pricing-summary-card">
                      <span>{view === 'price' ? 'สิทธิ์เรียน' : 'คอร์สเป้าหมาย'}</span>
                      <strong>{view === 'price' ? 'ทุกคอร์สในระบบ' : 'รายคอร์ส'}</strong>
                      <small>{view === 'price' ? 'เหมาะกับโมเดลสมัครสมาชิก' : 'เหมาะกับการขายแยกตามคอร์ส'}</small>
                    </article>
                    <article className="pricing-summary-card">
                      <span>การตั้งค่าต่อไป</span>
                      <strong>{view === 'price' ? 'ไป Courses' : 'กลับไปตรวจราคา'}</strong>
                      <small>{view === 'price' ? 'ตั้งราคาคอร์สได้จากหน้าคอร์สแต่ละรายการ' : 'ตรวจรายละเอียดการขายจากหน้าราคา'}</small>
                    </article>
                  </div>
                  <div className="priority-grid">
                    {view === 'price' ? (
                      <>
                        <div className="priority-card"><strong>รายเดือน</strong><p>นักเรียนจ่ายครั้งเดียว แล้วเข้าเรียนได้ทุกคอร์สในช่วงรอบบิลที่กำหนด</p></div>
                        <div className="priority-card"><strong>สิทธิ์เรียน</strong><p>โฟกัสที่การเข้าถึงทั้ง workspace มากกว่าคอร์สเดี่ยว</p></div>
                        <div className="priority-card"><strong>ต่อไป</strong><p>ถ้าต้องการขายแยกเป็นคอร์ส ให้ไปที่หน้าคอร์สและตั้งราคาประจำคอร์ส</p></div>
                      </>
                    ) : (
                      <>
                        <div className="priority-card"><strong>โปรโมชัน</strong><p>ใช้กับแคมเปญหรือส่วนลดที่ต้องผูกกับการขายของ workspace นี้</p></div>
                        <div className="priority-card"><strong>การใช้งาน</strong><p>ตั้งค่า label, note และเงื่อนไขโปรโมชันจากจุดเดียว</p></div>
                        <div className="priority-card"><strong>ต่อไป</strong><p>หากต้องการคุมรายคอร์ส ให้จัดการจากหน้าคอร์สแต่ละรายการ</p></div>
                      </>
                    )}
                  </div>
                  {!isOwnerWorkspace && view === 'price' ? (
                    <form className="editor-form" onSubmit={handleSaveMonthlyPricing}>
                      <div className="pricing-intro">
                        <strong>ตั้งชื่อแผนเรียนและเงื่อนไขการเข้าเรียนได้เอง</strong>
                        <span>กำหนดชื่อแผนเรียน, ราคาก่อนลด, ราคาขาย, จำนวนเดือน และคอร์สที่เข้าเรียนได้ แล้วกดบันทึกเมื่อพร้อมใช้งาน</span>
                      </div>
                      {pricingError ? (
                        <p className="form-error" role="alert">
                          {pricingError}
                        </p>
                      ) : null}
                      <div className="price-duration-stack">
                        {membershipOptionsDraft.map((option) => {
                          const optionIssues = getMembershipOptionValidation(option);
                          const showOptionIssues = option.enabled && membershipValidation.invalidOptionIds.has(option.id);

                          return (
                          <div key={option.id} className={`price-duration-row${showOptionIssues ? ' has-error' : ''}`}>
                            <label className="field field-check">
                              <input
                                type="checkbox"
                                checked={option.enabled}
                                onChange={(event) => updateMembershipOption(option.id, (current) => ({ ...current, enabled: event.target.checked }))}
                              />
                              <span>เปิดใช้แผนเรียน</span>
                            </label>
                            <label className="field">
                              <span>ชื่อแผนเรียน</span>
                              <input
                                value={option.name}
                                aria-invalid={option.enabled && optionIssues.name}
                                onChange={(event) => updateMembershipOption(option.id, (current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))}
                              />
                            </label>
                            <label className="field">
                              <span>จำนวนเดือน</span>
                              <select
                                value={String(option.durationMonths)}
                                aria-invalid={option.enabled && optionIssues.duration}
                                onChange={(event) => updateMembershipOption(option.id, (current) => ({
                                  ...current,
                                  durationMonths: Number(event.target.value) as 1 | 3 | 6 | 12 | 18 | 24,
                                }))}
                              >
                                <option value="1">1 เดือน</option>
                                <option value="3">3 เดือน</option>
                                <option value="6">6 เดือน</option>
                                <option value="12">12 เดือน</option>
                                <option value="18">18 เดือน</option>
                                <option value="24">24 เดือน</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>ราคาก่อนลด</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={option.compareAtPrice ?? ''}
                                aria-invalid={option.enabled && optionIssues.compareAtPrice}
                                onChange={(event) => updateMembershipOption(option.id, (current) => ({
                                  ...current,
                                  compareAtPrice: event.target.value === '' ? null : Number(event.target.value),
                                }))}
                                disabled={!option.enabled}
                              />
                            </label>
                            <label className="field">
                              <span>ราคาขาย</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={option.salePrice ?? ''}
                                aria-invalid={option.enabled && optionIssues.salePrice}
                                onChange={(event) => updateMembershipOption(option.id, (current) => ({
                                  ...current,
                                  salePrice: event.target.value === '' ? null : Number(event.target.value),
                                }))}
                                disabled={!option.enabled}
                              />
                            </label>
                            <div className="field">
                              <span>คอร์สที่เรียนได้</span>
                              <div className="tag-list" aria-invalid={option.enabled && optionIssues.includedCourses}>
                                {displayedCourses.length ? displayedCourses.map((course) => {
                                  const checked = option.includedCourseIds.includes(String(course.id));
                                  return (
                                    <label key={`${option.id}-${course.id}`} className="feature-tag">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!option.enabled}
                                        onChange={(event) => toggleMembershipCourse(option.id, String(course.id), event.target.checked)}
                                      />
                                      <span>{course.title}</span>
                                    </label>
                                  );
                                }) : <span className="feature-tag">ยังไม่มีคอร์สให้เลือก</span>}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      <div className="action-row">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setMembershipOptionsDraft((current) => [
                            ...current,
                            {
                              id: `pkg-${Date.now()}`,
                              name: 'แผนเรียนใหม่',
                              durationMonths: 1,
                              compareAtPrice: null,
                              salePrice: null,
                              enabled: true,
                              includedCourseIds: [],
                            },
                          ])}
                        >
                          เพิ่มแผนเรียน
                        </button>
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={!session || pricingSaving || !membershipPricingChanged}
                        >
                          {pricingSaving ? 'กำลังบันทึก...' : 'บันทึกแผนเรียน'}
                        </button>
                        <span className="action-caption">
                          {membershipPricingChanged ? 'มีการแก้ไขที่ยังไม่ได้บันทึก' : 'ข้อมูลล่าสุดถูกบันทึกแล้ว'}
                        </span>
                      </div>
                    </form>
                  ) : null}
                </article>
              </section>
            ) : null}

            {view === 'overview' && !isCourseWorkspaceRoute && !isCourseDetailRoute && !isLessonRoute ? (
              <section className="metrics-row">
                <article className="metric"><span>คอร์สที่เผยแพร่แล้ว</span><strong>{hydrated && session ? publishedCourses : '-'}</strong><small>{draftCourses} ฉบับรอจัดการต่อ</small></article>
                <article className="metric"><span>นักเรียนที่ใช้งานอยู่</span><strong>{hydrated && session ? activeStudents : '-'}</strong><small>{expiringStudents} รายใกล้ต่ออายุ</small></article>
                <article className="metric"><span>โหมดพื้นที่ทำงาน</span><strong>{session ? selectedPreset.label : '-'}</strong><small>{session ? WORKSPACE_NAME : 'รอการเชื่อมต่อ'}</small></article>
                <article className="metric"><span>Total students</span><strong>{hydrated && session ? totalStudents : '-'}</strong><small>{session?.license?.plan || 'starter'} plan</small></article>
              </section>
            ) : null}

            {view === 'overview' ? (
              <section className="panel-stack">
                <article className="content-panel">
                  <div className="panel-head"><div><span className="section-label">โฟกัสงาน</span><h3>สิ่งที่ควรเห็นทันทีเมื่อเข้ามาทำงาน</h3></div>{loading ? <span className="status-pill">กำลังซิงก์</span> : <span className="status-pill is-ready">พร้อมใช้งาน</span>}</div>
                  <div className="priority-grid">
                    <div className="priority-card"><strong>คอร์ส</strong><p>จัดคิวงานคอร์ส, ดูสถานะฉบับร่าง/เผยแพร่ และใช้เป็นฐานสำหรับย้าย course builder มาที่นี่</p></div>
                    <div className="priority-card"><strong>นักเรียน</strong><p>จับสัญญาณต่ออายุ, กลุ่มที่กำลังเรียน และคอร์สล่าสุดของผู้เรียน โดยไม่ต้องเปิดหลายหน้าต่าง</p></div>
                    <div className="priority-card"><strong>การเติบโต</strong><p>ใช้เป็นชั้นควบคุม SaaS: เปิด tutor, จัดการ tenant, การเงิน, การต่ออายุ และตรวจคุณภาพ</p></div>
                  </div>
                </article>
                <article className="content-panel">
                  <div className="panel-head"><div><span className="section-label">งานถัดไป</span><h3>งานที่ควรทำต่อทันที</h3></div></div>
                  <div className="queue-list">
                    <div className="queue-item"><strong>คอร์สรอเผยแพร่</strong><span>{draftCourses} รายการยังเป็นฉบับร่าง</span></div>
                    <div className="queue-item"><strong>นักเรียนใกล้ต่ออายุ</strong><span>{expiringStudents} รายการควรตามต่อ</span></div>
                    <div className="queue-item"><strong>ขยายเครือข่าย tutor</strong><span>ใช้หน้า Growth เพื่อเปิด tenant ใหม่โดยไม่ออกจากศูนย์ควบคุม</span></div>
                  </div>
                </article>
              </section>
            ) : null}

            {isLessonRoute ? (
              <section className="lesson-route-standalone">
                <section className="content-panel lesson-focus-panel">
                  <div className="panel-head">
                    <div>
                      <span className="section-label">{lessonDetailLabel}</span>
                      <h3>{selectedNode?.title || 'รายละเอียดบทเรียน'}</h3>
                    </div>
                    <div className="section-toolbar-actions">
                      <button type="button" className="secondary-button lesson-back-button" onClick={handleCloseLessonWorkspace}>
                        กลับไปโครงสร้างคอร์ส
                      </button>
                      <button type="button" className="primary-button" onClick={() => setIsVideoManagerOpen(true)}>
                        จัดการวีดีโอ
                      </button>
                    </div>
                  </div>
                  <div className="node-summary-mini-grid is-six">
                    <div className="node-summary-mini-card"><span>ประเภทบทเรียน</span><strong>{formatNodeTypeLabel(selectedNode?.nodeType || 'lesson')}</strong></div>
                    <div className="node-summary-mini-card"><span>เวลาประเมิน</span><strong>{selectedNode?.estimatedMinutes || 0} นาที</strong></div>
                    <div className="node-summary-mini-card"><span>Playback</span><strong>{selectedModule?.videoHlsUrl || selectedModule?.videoUrl ? 'พร้อมเปิดดู' : 'ยังไม่มีวิดีโอ'}</strong></div>
                    <div className="node-summary-mini-card"><span>Transcript</span><strong>{selectedModule?.transcriptFullText ? 'มี' : 'ยังไม่มี'}</strong></div>
                    <div className="node-summary-mini-card"><span>ไฟล์ประกอบบทเรียน</span><strong>{selectedModule?.asset?.url || selectedModule?.asset?.fileUrl || selectedModule?.asset?.externalUrl ? 'มี' : 'ยังไม่มี'}</strong></div>
                    <div className="node-summary-mini-card"><span>เคล็ดลับในการเรียน</span><strong>{selectedModule?.content ? 'มี' : 'ยังไม่มี'}</strong></div>
                  </div>
                </section>

                <section className="content-panel lesson-workbench-panel">
                  <div className="panel-head">
                    <div>
                      <span className="section-label">Lesson workspace</span>
                      <h3>Transcript และไฟล์ของบทเรียน</h3>
                    </div>
                    <div className="section-toolbar-actions">
                      <button type="button" className="secondary-button lesson-back-button" onClick={handleCloseLessonWorkspace}>
                        กลับไปโครงสร้างคอร์ส
                      </button>
                    </div>
                  </div>
                  <section className="section-card lesson-transcript-panel">
                    <div className="panel-head compact-head">
                      <div>
                        <span className="section-label">Lesson settings</span>
                        <h3>แก้ชื่อบทเรียนและเวลาประเมิน</h3>
                      </div>
                    </div>
                    <form className="editor-form fold-panel-body" onSubmit={handleUpdateNode}>
                      <label className="field">
                        <span>ชื่อบทเรียน</span>
                        <input
                          value={nodeEditForm.title}
                          onChange={(event) => setNodeEditForm((current) => ({ ...current, title: event.target.value }))}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>เวลาประเมิน (นาที)</span>
                        <input
                          type="number"
                          min="0"
                          value={nodeEditForm.estimatedMinutes}
                          onChange={(event) => setNodeEditForm((current) => ({ ...current, estimatedMinutes: event.target.value }))}
                        />
                      </label>
                      <div className="action-row action-row-split">
                        <button className="primary-button lesson-save-button" type="submit" disabled={!session || treeActionState === 'saving'}>
                          {treeActionState === 'saving' ? 'กำลังบันทึก...' : 'บันทึกชื่อและเวลา'}
                        </button>
                        <span className="action-caption">ใช้เมื่อพิมพ์ชื่อบทเรียนหรือเวลาประเมินผิด</span>
                      </div>
                    </form>
                  </section>
                  <div className="node-detail-tabs" role="tablist" aria-label="รายละเอียดบทเรียน">
                    <button type="button" role="tab" aria-selected={nodeDetailTab === 'transcript'} className={`node-tab${nodeDetailTab === 'transcript' ? ' is-active' : ''}`} onClick={() => setNodeDetailTab('transcript')}>
                      Transcript
                    </button>
                    <button type="button" role="tab" aria-selected={nodeDetailTab === 'lesson-assets'} className={`node-tab${nodeDetailTab === 'lesson-assets' ? ' is-active' : ''}`} onClick={() => setNodeDetailTab('lesson-assets')}>
                      ไฟล์ประกอบบทเรียน
                    </button>
                    <button type="button" role="tab" aria-selected={nodeDetailTab === 'exercise-assets'} className={`node-tab${nodeDetailTab === 'exercise-assets' ? ' is-active' : ''}`} onClick={() => setNodeDetailTab('exercise-assets')}>
                      การบ้าน
                    </button>
                    <button type="button" role="tab" aria-selected={nodeDetailTab === 'content'} className={`node-tab${nodeDetailTab === 'content' ? ' is-active' : ''}`} onClick={() => setNodeDetailTab('content')}>
                      เคล็ดลับในการเรียน
                    </button>
                  </div>

                  {nodeDetailTab === 'transcript' ? (
                    <div className="node-detail-stack">
                      <section className="section-card lesson-transcript-panel">
                        <div className="panel-head compact-head">
                          <div>
                            <span className="section-label">Transcript</span>
                            <h3>โหลดหรือแก้ transcript ของบทเรียนนี้</h3>
                          </div>
                          <div className="transcript-panel-actions">
                            <button
                              className={`secondary-button transcript-mode-button${transcriptForm.mode === 'rows' ? ' is-active' : ''}`}
                              type="button"
                              onClick={() => setTranscriptForm((current) => ({
                                ...current,
                                mode: 'rows',
                                rawText: current.rawText || formatTranscriptRowsAsRawText(current.rows),
                              }))}
                            >
                              แบบแถว
                            </button>
                            <button
                              className={`secondary-button transcript-mode-button${transcriptForm.mode === 'raw' ? ' is-active' : ''}`}
                              type="button"
                              onClick={() => setTranscriptForm((current) => ({
                                ...current,
                                mode: 'raw',
                                rawText: current.rawText || formatTranscriptRowsAsRawText(current.rows),
                              }))}
                            >
                              วางข้อความ
                            </button>
                          </div>
                        </div>
                        <form className="editor-form fold-panel-body" onSubmit={handleSaveTranscript}>
                          <div className="inline-note transcript-editor-note">
                            <strong>{transcriptForm.mode === 'raw' ? 'วางข้อความตามตัวอย่าง' : 'รูปแบบที่แนะนำ'}</strong>
                            <span>
                              {transcriptForm.mode === 'raw'
                                ? 'วางทีละบรรทัด เช่น 0:00 เปิด — ทดสอบ 3 model redesign เว็บด้วย Open Design. ระบบจะแยกเวลาและข้อความให้เองตอนบันทึก'
                                : 'ใส่เวลาและข้อความแยกเป็นบรรทัด, เช่น 00:00 เปิดบทเรียน, 00:18 อธิบายตัวอย่าง. เมื่อบันทึก, กดที่บรรทัดในตัวเล่นวิดีโอเพื่อข้ามเวลาได้ทันที'}
                            </span>
                          </div>
                          {transcriptForm.mode === 'raw' ? (
                            <label className="field transcript-raw-field">
                              <span>วาง transcript</span>
                              <textarea
                                rows={12}
                                value={transcriptForm.rawText}
                                onChange={(event) => setTranscriptForm((current) => ({ ...current, rawText: event.target.value }))}
                                placeholder={`0:00 เปิด — ทดสอบ 3 model redesign เว็บด้วย Open Design\n1:33 ปัญหา: ภาพปกบทความหน้า Writings เล็กไป`}
                              />
                            </label>
                          ) : (
                            <div className="transcript-editor-list">
                              {transcriptForm.rows.map((row, index) => (
                                <div key={row.id} className="transcript-editor-row">
                                  <label className="field transcript-editor-seek">
                                    <span>เวลา</span>
                                    <input
                                      value={row.seek}
                                      onChange={(event) => setTranscriptForm((current) => ({
                                        ...current,
                                        rows: current.rows.map((item) => (item.id === row.id ? { ...item, seek: event.target.value } : item)),
                                      }))}
                                      placeholder="00:00"
                                    />
                                  </label>
                                  <label className="field transcript-editor-text">
                                    <span>ข้อความ</span>
                                    <textarea
                                      rows={2}
                                      value={row.text}
                                      onChange={(event) => setTranscriptForm((current) => ({
                                        ...current,
                                        rows: current.rows.map((item) => (item.id === row.id ? { ...item, text: event.target.value } : item)),
                                      }))}
                                      placeholder="พิมพ์ข้อความของช่วงนี้"
                                    />
                                  </label>
                                  <div className="transcript-editor-row-actions">
                                    <button
                                      className="tree-node-delete-button transcript-editor-remove"
                                      type="button"
                                      onClick={() => setTranscriptForm((current) => ({
                                        ...current,
                                        rows: current.rows.length > 1
                                          ? current.rows.filter((item) => item.id !== row.id)
                                          : [{ id: 'segment-1', seek: '00:00', text: '' }],
                                      }))}
                                    >
                                      ลบ
                                    </button>
                                    <span className="transcript-editor-index">{String(index + 1).padStart(2, '0')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="action-row action-row-split">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                if (transcriptForm.mode === 'raw') {
                                  setTranscriptForm((current) => ({
                                    ...current,
                                    rawText: `${current.rawText.trimEnd()}\n${formatTranscriptSeek(parseTranscriptRawText(current.rawText).length * 10)} `,
                                  }));
                                  return;
                                }
                                setTranscriptForm((current) => ({
                                  ...current,
                                  rows: [
                                    ...current.rows,
                                    { id: `segment-${Date.now()}-${current.rows.length + 1}`, seek: formatTranscriptSeek((current.rows.length + 1) * 10), text: '' },
                                  ],
                                }));
                              }}
                            >
                              เพิ่มบรรทัด
                            </button>
                            <span className="action-caption">
                              {transcriptForm.mode === 'raw'
                                ? 'ระบบจะแยกเวลาและข้อความจากบรรทัดที่วางให้เอง'
                                : 'แต่ละบรรทัดจะถูกบันทึกเป็น segment ที่กดข้ามได้'}
                            </span>
                          </div>
                          <button className="primary-button lesson-save-button" type="submit" disabled={!session}>บันทึก transcript</button>
                        </form>
                      </section>
                    </div>
                  ) : null}

                  {nodeDetailTab === 'lesson-assets' ? (
                    <div className="node-detail-stack">
                      <section className="section-card lesson-asset-panel">
                        <div className="panel-head compact-head">
                          <div>
                            <span className="section-label">ไฟล์ประกอบบทเรียน</span>
                            <h3>อัปโหลดไฟล์จริงประกอบบทเรียน</h3>
                          </div>
                        </div>
                        <form className="editor-form" onSubmit={handleSaveLessonAsset}>
                          <label className="field">
                            <span>ชื่อ</span>
                            <input
                              value={lessonAssetForm.title}
                              onChange={(event) => setLessonAssetForm((current) => ({ ...current, title: event.target.value }))}
                              placeholder="ชื่อไฟล์ประกอบบทเรียน"
                              disabled={isAssetUploadBusy}
                            />
                          </label>
                          <label className="field file-picker-field">
                            <span>เลือกไฟล์จริง</span>
                            <input
                              key={lessonAssetInputKey}
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,image/*,application/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                setLessonAssetForm((current) => ({
                                  ...current,
                                  file,
                                  title: current.title.trim() || file?.name || '',
                                  mimeType: file?.type || '',
                                  sizeBytes: file ? String(file.size) : '',
                                }));
                              }}
                              disabled={isAssetUploadBusy}
                              required
                            />
                          </label>
                          <div className="asset-meta-grid">
                            <div className="asset-meta-card">
                              <span>ชนิด MIME</span>
                              <strong>{lessonAssetForm.mimeType || 'ยังไม่ได้เลือกไฟล์'}</strong>
                              <small>ระบบใช้บอกประเภทไฟล์ให้เบราว์เซอร์และ backend รู้ว่าเป็น PDF, Word, รูป หรือไฟล์แนบ</small>
                            </div>
                            <div className="asset-meta-card">
                              <span>ขนาด bytes</span>
                              <strong>{lessonAssetForm.sizeBytes ? Number(lessonAssetForm.sizeBytes).toLocaleString() : 'ยังไม่ได้เลือกไฟล์'}</strong>
                              <small>ใช้ระบุขนาดไฟล์จริงสำหรับตรวจสอบพื้นที่เก็บและการแสดงผล</small>
                            </div>
                          </div>
                          <p className="field-hint">รองรับไฟล์ PDF, Word, รูปภาพ และไฟล์แนบอื่น ๆ</p>
                          <button className="primary-button lesson-save-button" type="submit" disabled={!session || isAssetUploadBusy}>
                            {isAssetUploadBusy ? 'กำลังอัปโหลด...' : 'บันทึกไฟล์ประกอบบทเรียน'}
                          </button>
                        </form>
                        <div className="attached-assets-block">
                          <div className="panel-head panel-head-compact">
                            <div>
                              <span className="section-label">ไฟล์ปัจจุบัน</span>
                              <h4>ไฟล์ที่ผูกกับบทเรียนนี้</h4>
                            </div>
                          </div>
                          {lessonFileAssets.length ? (
                            <div className="attached-assets-list">
                              {lessonFileAssets.map((asset) => (
                                <article key={asset.id} className="attached-asset-row">
                                  <div>
                                    <strong>{asset.title || asset.fileName || 'ไฟล์ประกอบบทเรียน'}</strong>
                                    <p>
                                      {asset.mimeType || asset.assetType || 'attachment'}
                                      {asset.sizeBytes ? ` · ${Number(asset.sizeBytes).toLocaleString()} bytes` : ''}
                                    </p>
                                  </div>
                                  <div className="attached-asset-actions">
                                    {asset.fileUrl || asset.url ? (
                                      <button
                                        className="secondary-button attached-asset-button"
                                        type="button"
                                        onClick={() => window.open(asset.fileUrl || asset.url || '#', '_blank', 'noopener,noreferrer')}
                                      >
                                        เปิด
                                      </button>
                                    ) : null}
                                    <button
                                      className="tree-node-delete-button attached-asset-button"
                                      type="button"
                                      onClick={() => void handleDeleteLessonAsset(asset.id)}
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="field-hint">ยังไม่มีไฟล์แนบสำหรับบทเรียนนี้</p>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {nodeDetailTab === 'exercise-assets' ? (
                    <div className="node-detail-stack">
                      <section className="section-card lesson-asset-panel">
                        <div className="panel-head compact-head">
                          <div>
                            <span className="section-label">การบ้าน</span>
                            <h3>อัปโหลดไฟล์ที่ใช้ทำการบ้าน</h3>
                          </div>
                        </div>
                        <form className="editor-form" onSubmit={handleSaveExerciseAsset}>
                          <label className="field">
                            <span>ชื่อ</span>
                            <input
                              value={exerciseAssetForm.title}
                              onChange={(event) => setExerciseAssetForm((current) => ({ ...current, title: event.target.value }))}
                              placeholder="ชื่อการบ้าน"
                              disabled={isAssetUploadBusy}
                            />
                          </label>
                          <label className="field file-picker-field">
                            <span>เลือกไฟล์จริง</span>
                              <input
                                key={exerciseAssetInputKey}
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,image/*,application/*"
                                onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                setExerciseAssetForm((current) => ({
                                  ...current,
                                  file,
                                  title: current.title.trim() || file?.name || '',
                                  mimeType: file?.type || '',
                                  sizeBytes: file ? String(file.size) : '',
                                }));
                              }}
                              disabled={isAssetUploadBusy}
                              required
                            />
                          </label>
                          <div className="asset-meta-grid">
                            <div className="asset-meta-card">
                              <span>ชนิด MIME</span>
                              <strong>{exerciseAssetForm.mimeType || 'ยังไม่ได้เลือกไฟล์'}</strong>
                              <small>ใช้แยกชนิดเอกสารหรือไฟล์การบ้านจากไฟล์ประกอบบทเรียน</small>
                            </div>
                            <div className="asset-meta-card">
                              <span>ขนาด bytes</span>
                              <strong>{exerciseAssetForm.sizeBytes ? Number(exerciseAssetForm.sizeBytes).toLocaleString() : 'ยังไม่ได้เลือกไฟล์'}</strong>
                              <small>ใช้ระบุขนาดไฟล์จริงสำหรับตรวจสอบพื้นที่เก็บและการแสดงผล</small>
                            </div>
                          </div>
                          <p className="field-hint">แท็บนี้สำหรับไฟล์การบ้านของบทเรียนนี้</p>
                          <button className="primary-button lesson-save-button" type="submit" disabled={!session || isAssetUploadBusy}>
                            {isAssetUploadBusy ? 'กำลังอัปโหลด...' : 'บันทึกการบ้าน'}
                          </button>
                        </form>
                        <div className="attached-assets-block">
                          <div className="panel-head panel-head-compact">
                            <div>
                              <span className="section-label">ไฟล์ปัจจุบัน</span>
                              <h4>ไฟล์การบ้านของบทเรียนนี้</h4>
                            </div>
                          </div>
                          {exerciseFileAssets.length ? (
                            <div className="attached-assets-list">
                              {exerciseFileAssets.map((asset) => (
                                <article key={asset.id} className="attached-asset-row">
                                  <div>
                                    <strong>{asset.title || asset.fileName || 'ไฟล์การบ้าน'}</strong>
                                    <p>
                                      {asset.mimeType || getAssetTypeLabel(asset.assetType)}
                                      {asset.sizeBytes ? ` · ${Number(asset.sizeBytes).toLocaleString()} bytes` : ''}
                                    </p>
                                  </div>
                                  <div className="attached-asset-actions">
                                    {asset.fileUrl || asset.url ? (
                                      <button
                                        className="secondary-button attached-asset-button"
                                        type="button"
                                        onClick={() => window.open(asset.fileUrl || asset.url || '#', '_blank', 'noopener,noreferrer')}
                                      >
                                        เปิด
                                      </button>
                                    ) : null}
                                    <button
                                      className="tree-node-delete-button attached-asset-button"
                                      type="button"
                                      onClick={() => void handleDeleteLessonAsset(asset.id)}
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="field-hint">ยังไม่มีไฟล์การบ้านสำหรับบทเรียนนี้</p>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {nodeDetailTab === 'content' ? (
                    <div className="node-detail-stack">
                      <details className="content-editor fold-panel" open>
                        <summary>
                          <span>เคล็ดลับในการเรียน</span>
                          <small>ข้อความหลักและชนิดเนื้อหา</small>
                        </summary>
                        <form className="editor-form fold-panel-body" onSubmit={handleSaveContent}>
                          <div className="inline-note transcript-editor-note">
                            <strong>เคล็ดลับในการเรียน</strong>
                            <span>ใช้เก็บเนื้อหาหลักของบทเรียน เช่น บทอ่าน, คำอธิบาย, หรือ HTML ของหน้าเนื้อหา</span>
                          </div>
                          <label className="field">
                            <span>ประเภทเนื้อหา</span>
                            <select value={contentForm.contentType} onChange={(event) => setContentForm((current) => ({ ...current, contentType: event.target.value as typeof current.contentType }))}>
                              <option value="article">บทความ</option>
                              <option value="video">วิดีโอ</option>
                              <option value="pdf">ไฟล์ PDF</option>
                              <option value="external_link">ลิงก์ภายนอก</option>
                              <option value="mixed">ผสม</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>ข้อความล้วน</span>
                            <textarea rows={6} value={contentForm.plainText} onChange={(event) => setContentForm((current) => ({ ...current, plainText: event.target.value }))} />
                          </label>
                          <label className="field">
                            <span>เนื้อหา HTML</span>
                            <textarea rows={8} value={contentForm.htmlContent} onChange={(event) => setContentForm((current) => ({ ...current, htmlContent: event.target.value }))} />
                          </label>
                          <div className="action-row action-row-split">
                            <button className="primary-button" type="submit" disabled={!session}>
                              บันทึกเคล็ดลับ
                            </button>
                            <span className="action-caption">บันทึกกลับไปที่ lesson-node content ของบทเรียนนี้</span>
                          </div>
                        </form>
                      </details>
                    </div>
                  ) : null}
                </section>
              </section>
            ) : isCourseWorkspaceRoute || isCourseDetailRoute ? (
              <section className="courses-workspace">
                <div className="section-toolbar">
                  {isLessonRoute ? (
                    <>
                      <div>
                        <span className="section-label">กำลังแก้บทเรียน</span>
                        <h3>{selectedNode?.title || (courseDetailLoading ? 'กำลังโหลดบทเรียน' : 'ยังไม่พบบทเรียน')}</h3>
                      </div>
                      <div className="section-toolbar-actions">
                        <button className="secondary-button section-toolbar-back" type="button" onClick={handleBackToCourseList}>
                          กลับไปโครงสร้างคอร์ส
                        </button>
                      </div>
                    </>
                  ) : isCourseDetailRoute ? (
                    <>
                      <div>
                        <span className="section-label">กำลังแก้ไขคอร์ส</span>
                        <h3>{selectedCourse?.title || (courseDetailLoading ? 'กำลังโหลดข้อมูลคอร์ส' : 'ยังไม่พบคอร์ส')}</h3>
                      </div>
                      <div className="section-toolbar-actions">
                        <button className="secondary-button section-toolbar-back" type="button" onClick={handleBackToCourseList}>
                          กลับไปรายการคอร์ส
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="subnav" role="tablist" aria-label="Course sections">
                        <button type="button" className={`subnav-link${coursesSubView === 'catalog' ? ' is-active' : ''}`} onClick={() => setCoursesSubView('catalog')}>
                          รายการคอร์ส
                        </button>
                        <button type="button" className={`subnav-link${coursesSubView === 'new' ? ' is-active' : ''}`} onClick={() => setCoursesSubView('new')}>
                          สร้างคอร์สใหม่
                        </button>
                      </div>
                      <p className="section-note">สร้างคอร์สใหม่เป็นโหมดแยกออกจากรายการคอร์ส เพื่อให้ workflow ชัดและเมนูไม่รกรวมกัน</p>
                    </>
                  )}
                </div>
                {!isLessonRoute && coursesSubView === 'catalog' ? (
                  <>
                    {!isCourseDetailRoute ? (
                      <section className={`dual-panel${isCompactViewport ? ' is-mobile-stack' : ''}`}>
                        <article className="content-panel">
                          <div className="panel-head"><div><span className="section-label">รายการคอร์ส</span><h3>{`คอร์สทั้งหมดของ ${WORKSPACE_NAME}`}</h3></div></div>
                          {displayedCourses.length ? (
                            <div className="table-list selectable-list">
                              {displayedCourses.map((course, index) => (
                                <article
                                  key={course.id}
                                  className={`table-row selectable-row course-row-draggable${selectedCourseId === String(course.id) ? ' is-selected' : ''}${draggedCourseId === String(course.id) ? ' is-dragging' : ''}${activeCourseDropId === String(course.id) ? ' is-drop-target' : ''}${selectedCourseId === String(course.id) && selectedCourse && !isCourseDetailRoute ? ' is-sheet-selected' : ''}`}
                                  draggable={!isCompactViewport}
                                  onDragStart={(event) => handleCourseDragStart(event, String(course.id))}
                                  onDragEnd={handleCourseDragEnd}
                                  onDragOver={(event) => handleCourseDragOver(event, String(course.id))}
                                  onDrop={(event) => handleCourseDrop(event, String(course.id))}
                                >
                                  <button
                                    className="course-row-main"
                                    type="button"
                                    onClick={() => {
                                      setSelectedCourseId(String(course.id));
                                    }}
                                  >
                                    <div className="course-row-copy">
                                      <strong>{course.title}</strong>
                                      <p>{truncateText(course.description || '', 160)}</p>
                                    </div>
                                    <div className="course-row-meta">
                                      <div className={`badge tone-${statusTone(course.status)}`}>{course.status}</div>
                                      <div className="row-meta">
                                        <span>วิชา {course.subject || 'ยังไม่ระบุ'}</span>
                                        <span>ระดับ {course.level || 'ยังไม่ระบุ'}</span>
                                        <span>{course.enrollmentCount ?? 0} ผู้เรียน</span>
                                        <span>รหัสคอร์ส {course.slug}</span>
                                        <span>อัปเดต {formatDate(course.updatedAt)}</span>
                                      </div>
                                    </div>
                                  </button>
                                  <div className="course-row-actions">
                                    {index > 0 ? (
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleMoveCourse(String(course.id), 'up');
                                        }}
                                        disabled={courseOrderState === 'saving'}
                                      >
                                        ↑
                                      </button>
                                    ) : null}
                                    {index < displayedCourses.length - 1 ? (
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleMoveCourse(String(course.id), 'down');
                                        }}
                                        disabled={courseOrderState === 'saving'}
                                      >
                                        ↓
                                      </button>
                                    ) : null}
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        const nextCourseId = String(course.id);
                                        setSelectedCourseId(nextCourseId);
                                        router.push(`${courseWorkspaceRoot}/${nextCourseId}`);
                                      }}
                                    >
                                      แก้ไขคอร์ส
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : <div className="empty-state"><strong>{session ? 'ยังไม่มีคอร์ส' : 'ล็อกอินก่อนเพื่อดูคอร์ส'}</strong><p>หลังจากนี้หน้าเดียวกันจะเป็นฐานสำหรับ editor ใหม่แทน course builder เก่า</p></div>}
                        </article>

                        {!isLessonRoute && (selectedCourse || isCourseDetailRoute) ? (
                          <article
                            className={`content-panel course-detail-sheet${courseSheetDragY ? ' is-dragging' : ''}`}
                            style={courseSheetDragY ? { transform: `translateY(${courseSheetDragY}px)`, opacity: Math.max(0.82, 1 - courseSheetDragY / 1800) } : undefined}
                          >
                            <div
                              className="panel-head course-detail-sheet-head"
                              onPointerDown={handleCourseSheetPointerDown}
                              onPointerMove={handleCourseSheetPointerMove}
                              onPointerUp={finishCourseSheetSwipe}
                              onPointerCancel={finishCourseSheetSwipe}
                            >
                              <div>
                                <div className="course-detail-sheet-handle" aria-hidden="true" />
                                <span className="section-label">รายละเอียดคอร์ส</span>
                                <h3>{selectedCourse?.title || 'เลือกคอร์สจากรายการด้านซ้าย'}</h3>
                              </div>
                              <div className="course-detail-sheet-actions">
                                {isCompactViewport && (selectedCourse || isCourseDetailRoute) ? (
                                  <button
                                    className="secondary-button course-detail-sheet-close"
                                    type="button"
                                    onClick={handleCloseCourseSheet}
                                  >
                                    {isCourseDetailRoute ? 'กลับไปรายการคอร์ส' : 'ปิด'}
                                  </button>
                                ) : null}
                                {courseDetailLoading ? <span className="status-pill">กำลังโหลด</span> : null}
                              </div>
                            </div>
                            {selectedCourse ? (
                              <>
                                <div className="detail-grid course-detail-card-grid">
                                  {orderedSelectedCourseCards.map((card) => (
                                    <article
                                      key={card.id}
                                      className={`detail-card detail-card-draggable${draggedCourseDetailCardId === card.id ? ' is-dragging' : ''}${activeCourseDetailCardDropId === card.id ? ' is-drop-target' : ''}`}
                                      draggable
                                      onDragStart={(event) => handleCourseDetailCardDragStart(event, card.id)}
                                      onDragEnd={handleCourseDetailCardDragEnd}
                                      onDragOver={(event) => handleCourseDetailCardDragOver(event, card.id)}
                                      onDrop={(event) => handleCourseDetailCardDrop(event, card.id)}
                                    >
                                      <span>{card.label}</span>
                                      <strong>
                                        {card.value}
                                        {'time' in card && card.time ? <span className="inline-time"> {card.time}</span> : null}
                                      </strong>
                                    </article>
                                  ))}
                                </div>
                                <form id="course-editor-form" className="editor-form" onSubmit={handleSaveCourse}>
                                  <label className="field"><span>ชื่อคอร์ส</span><input value={courseForm.title} onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))} required /></label>
                                  <label className="field"><span>คำอธิบาย</span><textarea value={courseForm.description} onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))} rows={4} /></label>
                                  <div className="field-grid">
                                    <label className="field"><span>วิชา</span><input value={courseForm.subject} onChange={(event) => setCourseForm((current) => ({ ...current, subject: event.target.value }))} /></label>
                                    <label className="field"><span>ระดับ</span><input value={courseForm.level} onChange={(event) => setCourseForm((current) => ({ ...current, level: event.target.value }))} /></label>
                                  </div>
                                  <div className="action-row">
                                  <button className="primary-button" type="submit" disabled={!session || courseSaveState === 'saving'}>{courseSaveState === 'saving' ? 'กำลังบันทึก...' : 'บันทึกข้อมูลคอร์ส'}</button>
                                    <button className="secondary-button" type="button" onClick={handleToggleCoursePublish} disabled={!session || publishState === 'saving'}>
                                      {publishState === 'saving'
                                        ? 'กำลังอัปเดตสถานะ...'
                                        : selectedCourse.status === 'published'
                                          ? 'หยุดเผยแพร่'
                                          : 'เผยแพร่คอร์ส'}
                                    </button>
                                    <button
                                      className="danger-button"
                                      type="button"
                                      onClick={handleDeleteCourseAction}
                                      disabled={!session || deleteCourseState === 'saving'}
                                    >
                                      {deleteCourseState === 'saving' ? 'กำลังลบ...' : 'ลบคอร์ส'}
                                    </button>
                                  </div>
                                </form>
                                <div className="mobile-course-action-bar" aria-label="Course actions">
                                  <button className="primary-button" type="submit" form="course-editor-form" disabled={!session || courseSaveState === 'saving'}>
                                    {courseSaveState === 'saving' ? 'กำลังบันทึก...' : 'บันทึกข้อมูลคอร์ส'}
                                  </button>
                                  <button className="secondary-button" type="button" onClick={handleToggleCoursePublish} disabled={!session || publishState === 'saving'}>
                                    {publishState === 'saving'
                                      ? 'กำลังอัปเดตสถานะ...'
                                      : selectedCourse.status === 'published'
                                        ? 'หยุดเผยแพร่'
                                        : 'เผยแพร่คอร์ส'}
                                  </button>
                                  <button className="danger-button" type="button" onClick={handleDeleteCourseAction} disabled={!session || deleteCourseState === 'saving'}>
                                    {deleteCourseState === 'saving' ? 'กำลังลบ...' : 'ลบคอร์ส'}
                                  </button>
                                </div>
                              </>
                            ) : <div className="empty-state"><strong>เลือกคอร์สเพื่อเริ่มแก้ไข</strong><p>เมื่อเลือกแล้ว จะใช้ panel นี้แทน editor ฝั่งเก่า</p></div>}
                          </article>
                        ) : null}
                      </section>
                    ) : null}

                {isLessonRoute ? (
                  <section className="content-panel lesson-focus-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">จัดการวีดีโอ</span>
                        <h3>อัปโหลดวิดีโอและจัดการสื่อของบทเรียนนี้</h3>
                      </div>
                    </div>
                    <VideoUploadPanel
                      flow={videoUploadFlow}
                      selectedModule={selectedModule}
                      selectedLessonTitle={selectedNode?.title || null}
                      sessionReady={!!session}
                    />
                  </section>
                ) : null}

                {/* Course pricing and promotions are intentionally hidden for the educator-only workspace. */}
                {/*
                {isCourseDetailRoute ? (
                  <section className="content-panel pricing-panel course-commerce-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">รายคอร์ส</span>
                        <h3>ตั้งราคาขายคอร์ส และกำหนดสิทธิ์เรียนของคอร์สนี้</h3>
                      </div>
                      <div className="section-toolbar-actions">
                        {coursePricingLoading ? <span className="status-pill">กำลังโหลด</span> : null}
                        <span className="status-pill">
                          {coursePricingData?.billingProfile?.billingModel === 'MONTHLY'
                            ? 'Monthly'
                            : coursePricingData?.billingProfile?.billingModel === 'REVENUE_SHARE'
                              ? 'Revenue share'
                              : 'Pricing ready'}
                        </span>
                      </div>
                    </div>
                    <div className="pricing-intro">
                      <strong>หน้านี้ใช้เฉพาะตอนที่คุณเลือกขายแบบรายคอร์ส</strong>
                      <span>กำหนดราคา, ราคาเดิม, สิทธิ์เรียนกี่เดือน, คูปอง และโปรโมชันของคอร์สนี้แยกจากคอร์สอื่นได้</span>
                    </div>
                    {courseCommerceError ? (
                      <div className="composer-note is-live" role="status">
                        {courseCommerceError}
                      </div>
                    ) : null}
                    <>
                      {coursePricingData ? (
                        <div className="pricing-summary-grid">
                          <article className="pricing-summary-card">
                            <span>โมเดลการขาย</span>
                            <strong>รายคอร์ส</strong>
                            <small>
                              {coursePricingData.billingProfile?.checkoutOwner === 'TUTOR'
                                ? 'tutor รับเงินเอง'
                                : 'platform รับชำระเงินให้'}
                            </small>
                          </article>
                          <article className="pricing-summary-card">
                            <span>ราคาคอร์สปัจจุบัน</span>
                            <strong>{formatBaht(coursePricingData.pricing?.priceMinor ? coursePricingData.pricing.priceMinor / 100 : 0)}</strong>
                            <small>{formatAccessDuration(coursePricingData.pricing?.metadata?.accessDurationMonths as string | undefined)}</small>
                          </article>
                          <article className="pricing-summary-card">
                            <span>คูปอง / โปรโมชัน</span>
                            <strong>{coursePricingData.discounts.length} รายการ</strong>
                            <small>
                              {coursePricingData.pricing?.allowCoupons && coursePricingData.pricing?.allowPromotions
                                ? 'เปิดใช้ส่วนลดและโปรโมชัน'
                                : 'จำกัดการใช้ส่วนลดบางส่วน'}
                            </small>
                          </article>
                        </div>
                      ) : (
                        <div className="empty-state">
                          <strong>คอร์สนี้ยังไม่ได้ตั้งราคาขาย</strong>
                          <p>กรอกราคาและเลือกสิทธิ์เรียนก่อนบันทึกครั้งแรก ระบบจะสร้างข้อมูลการขายแบบรายคอร์สของคอร์สนี้ให้อัตโนมัติ</p>
                        </div>
                      )}

                      <form className="editor-form" onSubmit={handleSaveCoursePricing}>
                        <div className="field-grid">
                          <label className="field">
                            <span>ราคาขาย</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={coursePricingDraft.priceMinor}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, priceMinor: event.target.value }))}
                              required
                            />
                          </label>
                          <label className="field">
                            <span>ราคาเดิมก่อนลด</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={coursePricingDraft.compareAtPriceMinor}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, compareAtPriceMinor: event.target.value }))}
                            />
                          </label>
                          <label className="field">
                            <span>สกุลเงิน</span>
                            <input
                              value={coursePricingDraft.currency}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                              placeholder="THB"
                            />
                          </label>
                          <label className="field">
                            <span>สิทธิ์เรียน</span>
                            <select
                              value={coursePricingDraft.accessDurationMonths}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, accessDurationMonths: event.target.value }))}
                            >
                              <option value="1">1 เดือน</option>
                              <option value="3">3 เดือน</option>
                              <option value="6">6 เดือน</option>
                              <option value="12">12 เดือน</option>
                              <option value="18">18 เดือน</option>
                              <option value="24">24 เดือน</option>
                              <option value="36">36 เดือน</option>
                              <option value="lifetime">ตลอดชีพ</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>เริ่มขาย</span>
                            <input
                              type="datetime-local"
                              value={coursePricingDraft.salesStartsAt}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, salesStartsAt: event.target.value }))}
                            />
                          </label>
                          <label className="field">
                            <span>สิ้นสุดการขาย</span>
                            <input
                              type="datetime-local"
                              value={coursePricingDraft.salesEndsAt}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, salesEndsAt: event.target.value }))}
                            />
                          </label>
                        </div>
                        <div className="field-grid">
                          <label className="field field-check">
                            <input
                              type="checkbox"
                              checked={coursePricingDraft.allowCoupons}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, allowCoupons: event.target.checked }))}
                            />
                            <span>เปิดใช้คูปองส่วนลด</span>
                          </label>
                          <label className="field field-check">
                            <input
                              type="checkbox"
                              checked={coursePricingDraft.allowPromotions}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, allowPromotions: event.target.checked }))}
                            />
                            <span>เปิดใช้โปรโมชัน</span>
                          </label>
                          <label className="field field-check">
                            <input
                              type="checkbox"
                              checked={coursePricingDraft.showPricePublicly}
                              onChange={(event) => setCoursePricingDraft((current) => ({ ...current, showPricePublicly: event.target.checked }))}
                            />
                            <span>แสดงราคาในหน้าสาธารณะ</span>
                          </label>
                        </div>
                        <div className="action-row action-row-split">
                          <button className="primary-button" type="submit" disabled={!session || coursePricingSaving}>
                            {coursePricingSaving ? 'กำลังบันทึก...' : 'บันทึกราคาคอร์ส'}
                          </button>
                          <span className="action-caption">นักเรียนที่ซื้อคอร์สนี้จะได้สิทธิ์เรียนตามช่วงเวลาที่กำหนดในฟอร์มนี้</span>
                        </div>
                      </form>

                      {coursePricingData ? (
                        <>
                        <div className="pricing-inline-note">
                          <strong>Billing profile ของ tutor</strong>
                          <span>
                            {coursePricingData.billingProfile
                              ? `${coursePricingData.billingProfile.checkoutOwner === 'TUTOR' ? 'tutor รับเงินเอง' : 'platform รับเงินให้'} · ${coursePricingData.billingProfile.studentAccountMode === 'TUTOR_MANAGED' ? 'เปิด account นักเรียนโดย tutor' : 'platform จัดการ account นักเรียน'}`
                              : 'ยังไม่มี billing profile'}
                          </span>
                        </div>

                        <div className="pricing-preview-grid">
                          <article className="pricing-preview-card">
                            <span>ราคาขายจริง</span>
                            <strong>{formatBaht(coursePricingData.pricing?.priceMinor ? coursePricingData.pricing.priceMinor / 100 : 0)}</strong>
                            <small>{coursePricingData.pricing?.compareAtPriceMinor ? `ราคาเดิม ${formatBaht(coursePricingData.pricing.compareAtPriceMinor / 100)}` : 'ยังไม่มีราคาเดิม'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>สิทธิ์เรียน</span>
                            <strong>{formatAccessDuration(coursePricingData.pricing?.metadata?.accessDurationMonths as string | undefined)}</strong>
                            <small>หมดสิทธิ์เรียนตามช่วงเวลาที่กำหนดหลังนักเรียนเริ่มคอร์ส</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>คูปอง</span>
                            <strong>{coursePricingData.pricing?.allowCoupons ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</strong>
                            <small>{coursePricingData.pricing?.allowPromotions ? 'อนุญาตโปรโมชันเพิ่มเติม' : 'ไม่อนุญาตโปรโมชัน'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>การแสดงผลหน้าร้าน</span>
                            <strong>{coursePricingData.pricing?.showPricePublicly ? 'แสดงราคา' : 'ซ่อนราคา'}</strong>
                            <small>{coursePricingData.pricing?.salesStartsAt || coursePricingData.pricing?.salesEndsAt ? 'มีช่วงเวลาเริ่ม/จบการขาย' : 'ยังไม่มีช่วงเวลา'}</small>
                          </article>
                        </div>

                        <div className="embedded-panel">
                          <div className="panel-head">
                            <div>
                              <span className="section-label">โปรโมชั่น / คูปอง</span>
                              <h3>เพิ่มแคมเปญส่วนลดสำหรับคอร์สนี้</h3>
                            </div>
                          </div>
                          <form className="editor-form" onSubmit={handleCreateCourseDiscount}>
                            <div className="field-grid">
                              <label className="field">
                                <span>ประเภทแคมเปญ</span>
                                <select value={courseDiscountForm.mode} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, mode: event.target.value as 'AUTO' | 'CODE' }))}>
                                  <option value="CODE">Code coupon</option>
                                  <option value="AUTO">Auto apply</option>
                                </select>
                              </label>
                              <label className="field">
                                <span>รหัสคูปอง</span>
                                <input
                                  value={courseDiscountForm.code}
                                  onChange={(event) => setCourseDiscountForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                                  placeholder="SAVE10"
                                  disabled={courseDiscountForm.mode === 'AUTO'}
                                />
                              </label>
                              <label className="field">
                                <span>ชื่อแคมเปญ</span>
                                <input
                                  value={courseDiscountForm.name}
                                  onChange={(event) => setCourseDiscountForm((current) => ({ ...current, name: event.target.value }))}
                                  placeholder="ส่วนลดเปิดตัวคอร์ส"
                                  required
                                />
                              </label>
                              <label className="field">
                                <span>สถานะ</span>
                                <select value={courseDiscountForm.status} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, status: event.target.value as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' }))}>
                                  <option value="DRAFT">Draft</option>
                                  <option value="ACTIVE">Active</option>
                                  <option value="PAUSED">Paused</option>
                                  <option value="ENDED">Ended</option>
                                </select>
                              </label>
                            </div>
                            <div className="field-grid">
                              <label className="field">
                                <span>ชนิดส่วนลด</span>
                                <select value={courseDiscountForm.discountType} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, discountType: event.target.value as 'PERCENT' | 'AMOUNT' | 'FREE' }))}>
                                  <option value="PERCENT">Percent</option>
                                  <option value="AMOUNT">Amount</option>
                                  <option value="FREE">Free access</option>
                                </select>
                              </label>
                              <label className="field">
                                <span>เปอร์เซ็นต์ส่วนลด</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={courseDiscountForm.discountValue}
                                  onChange={(event) => setCourseDiscountForm((current) => ({ ...current, discountValue: event.target.value }))}
                                  disabled={courseDiscountForm.discountType !== 'PERCENT'}
                                />
                              </label>
                              <label className="field">
                                <span>ส่วนลดเป็นเงิน</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={courseDiscountForm.discountAmountMinor}
                                  onChange={(event) => setCourseDiscountForm((current) => ({ ...current, discountAmountMinor: event.target.value }))}
                                  disabled={courseDiscountForm.discountType !== 'AMOUNT'}
                                />
                              </label>
                              <label className="field">
                                <span>สกุลเงิน</span>
                                <input
                                  value={courseDiscountForm.currency}
                                  onChange={(event) => setCourseDiscountForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                                />
                              </label>
                            </div>
                            <div className="field-grid">
                              <label className="field">
                                <span>เริ่มใช้</span>
                                <input type="datetime-local" value={courseDiscountForm.startsAt} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, startsAt: event.target.value }))} />
                              </label>
                              <label className="field">
                                <span>สิ้นสุดใช้</span>
                                <input type="datetime-local" value={courseDiscountForm.endsAt} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, endsAt: event.target.value }))} />
                              </label>
                              <label className="field">
                                <span>จำกัดการใช้ทั้งหมด</span>
                                <input type="number" min="0" step="1" value={courseDiscountForm.maxRedemptions} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, maxRedemptions: event.target.value }))} />
                              </label>
                              <label className="field">
                                <span>จำกัดต่อคน</span>
                                <input type="number" min="0" step="1" value={courseDiscountForm.maxRedemptionsPerStudent} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, maxRedemptionsPerStudent: event.target.value }))} />
                              </label>
                            </div>
                            <label className="field">
                              <span>รายละเอียด</span>
                              <textarea rows={3} value={courseDiscountForm.description} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, description: event.target.value }))} />
                            </label>
                            <label className="field field-check">
                              <input type="checkbox" checked={courseDiscountForm.stackable} onChange={(event) => setCourseDiscountForm((current) => ({ ...current, stackable: event.target.checked }))} />
                              <span>อนุญาตให้ซ้อนกับส่วนลดอื่น</span>
                            </label>
                            <div className="action-row action-row-split">
                              <button className="primary-button" type="submit" disabled={!session || courseDiscountSaving}>
                                {courseDiscountSaving ? 'กำลังสร้าง...' : 'สร้างโปรโมชัน / คูปอง'}
                              </button>
                              <span className="action-caption">คูปองที่สร้างจะผูกกับคอร์สนี้โดยตรงและใช้หน้าบ้านขายคอร์สได้ทันที</span>
                            </div>
                          </form>

                          <div className="table-list">
                            {coursePricingData.discounts.length ? coursePricingData.discounts.map((campaign) => (
                              <article key={campaign.id} className="table-row pricing-discount-row">
                                <div>
                                  <strong>{campaign.name}</strong>
                                  <p>{campaign.description || campaign.code || 'ไม่มีรายละเอียด'}</p>
                                </div>
                                <div className="row-meta">
                                  <span>{campaign.discountType}</span>
                                  <span>{campaign.status}</span>
                                </div>
                                <div className="row-meta">
                                  <span>{campaign.discountType === 'PERCENT' ? `${campaign.discountValue ?? 0}%` : campaign.discountType === 'AMOUNT' ? formatBaht(campaign.discountAmountMinor ? campaign.discountAmountMinor / 100 : 0) : 'free'}</span>
                                  <span>{campaign.code || 'auto'}</span>
                                </div>
                                <div className="student-catalog-actions">
                                  <button className="secondary-button" type="button" onClick={() => loadCourseDiscountIntoForm(campaign)}>
                                    {editingCourseDiscountId === String(campaign.id) ? 'กำลังแก้ไข' : 'แก้ไข'}
                                  </button>
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => void handleUpdateCourseDiscount()}
                                    disabled={!editingCourseDiscountId || editingCourseDiscountId !== String(campaign.id) || courseDiscountSaving}
                                  >
                                    บันทึก
                                  </button>
                                  <button
                                    className="danger-button"
                                    type="button"
                                    onClick={() => void handleDeleteCourseDiscount(String(campaign.id))}
                                    disabled={courseDiscountSaving}
                                  >
                                    ลบ
                                  </button>
                                </div>
                              </article>
                            )) : (
                              <div className="empty-state">
                                <strong>ยังไม่มีคูปองหรือโปรโมชัน</strong>
                                <p>สร้างแคมเปญแรกเพื่อทดลอง discount flow ของคอร์สนี้</p>
                              </div>
                            )}
                          </div>
                        </div>
                        </>
                      ) : null}
                    </>
                  </section>
                ) : null}
                */}

                {isCourseDetailRoute ? (
                <section id="course-tree-editor" className={`triple-panel${selectedNode ? '' : ' is-tree-only'}`}>
                  <article className="content-panel lesson-tree-panel">
                    <div className="panel-head"><div><span className="section-label">โครงสร้างบทเรียน</span><h3>เพิ่มบทเรียนและโครงสร้าง</h3></div>{treeActionState !== 'idle' ? <span className="status-pill">{treeActionState === 'saving' ? 'กำลังบันทึก' : 'บันทึกแล้ว'}</span> : null}</div>
                    <div className="content-editor section-card section-card-topless">
                      <div className="panel-head compact-head">
                        <div><span className="section-label">ตัวสร้างบทเรียน</span><h3>เพิ่มรายการใหม่ในโครงสร้าง</h3></div>
                      </div>
                      {treeNotice ? <div className="composer-note is-live" role="status">{treeNotice}</div> : null}
                      <form className="editor-form node-composer-form" onSubmit={handleCreateNode}>
                        <div className="tree-type-switch" role="group" aria-label="ประเภทบทเรียน">
                          {(['section', 'lesson', 'quiz', 'assignment'] as CourseTreeNode['nodeType'][]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`tree-type-chip${nodeForm.nodeType === type ? ' is-active' : ''}`}
                              onClick={() => setNodeForm((current) => ({ ...current, nodeType: type }))}
                            >
                              {formatNodeTypeLabel(type)}
                            </button>
                          ))}
                        </div>
                        <div className="field-grid">
                          <label className="field"><span>{needsSectionParent ? 'บทเรียนแม่' : 'ระดับบนสุด'}</span><select value={nodeForm.parentId} onChange={(event) => setNodeForm((current) => ({ ...current, parentId: event.target.value }))} disabled={needsSectionParent && !hasLessonParentOptions}><option value="">{needsSectionParent ? (hasLessonParentOptions ? 'เลือกบทเรียนแม่' : 'ยังไม่มีบทเรียนแม่ที่ใช้ได้') : 'ระดับบนสุด'}</option>{(needsSectionParent ? lessonParentOptions : sectionContainerOptions).map((node) => <option key={node.id} value={node.id}>{'· '.repeat(node.level)}{formatNodeTypeLabel(node.nodeType)} · {node.title}</option>)}</select></label>
                          <div className="field field-readonly"><span>โหมด</span><p>{normalizeNodeTypeValue(nodeForm.nodeType) === 'section' ? 'สร้างบทเรียนหลัก' : normalizeNodeTypeValue(nodeForm.nodeType) === 'lesson' ? 'สร้างบทย่อย' : `สร้าง ${formatNodeTypeLabel(nodeForm.nodeType)}`}</p></div>
                        </div>
                        {needsRootPlacement ? (
                          <div className="composer-note" role="note">
                            บทเรียนหลักสร้างได้เฉพาะระดับบนสุดของคอร์ส
                          </div>
                        ) : null}
                        {needsSectionParent && !hasLessonParentOptions ? (
                          <div className="composer-note" role="note">
                            สร้างบทเรียนหรือบทย่อยที่อยู่ลึกไม่เกิน {MAX_LESSON_DEPTH} ระดับก่อน
                          </div>
                        ) : null}
                        <label className="field"><span>ชื่อ</span><input value={nodeForm.title} onChange={(event) => setNodeForm((current) => ({ ...current, title: event.target.value }))} required /></label>
                        <label className="field"><span>เวลาประเมิน (นาที)</span><input type="number" min="0" value={nodeForm.estimatedMinutes} onChange={(event) => setNodeForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} /></label>
                        <div className="action-row action-row-split">
                          <button className="primary-button" type="submit" disabled={!session || !selectedCourseId || (needsSectionParent && !hasLessonParentOptions)}>เพิ่มเข้าโครงสร้าง</button>
                          <span className="action-caption">สร้างจากบนลงล่างก่อน แล้วค่อยจัดลำดับภายหลัง</span>
                        </div>
                      </form>
                    </div>
                    <div className="tree-canvas">
                      {tree.length ? tree.map((node, index) => renderTreeNode(node, 0, index)) : <div className="empty-state compact-empty"><strong>ยังไม่มีโครงสร้างบทเรียน</strong><p>สร้างบทเรียนก่อน แล้วค่อยเพิ่มบทย่อยใต้บทเรียนหลักนั้นเพื่อให้จัดการง่ายขึ้น</p></div>}
                    </div>
                  </article>

                  {selectedNode ? (
                    <article className="content-panel lesson-workbench-panel">
                      <div className="panel-head">
                        <div>
                          <span className="section-label">รายละเอียดบทเรียน</span>
                          <h3>{selectedNode?.title || 'เลือกบทเรียนจากรายการ'}</h3>
                        </div>
                        <div className="action-row action-row-quiet">
                          {canAcceptChildNodes({ nodeType: selectedNode.nodeType, level: selectedNode.depth }) ? (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleQuickAddChild(selectedNode, selectedNode.depth)}
                              disabled={!session || treeActionState === 'saving'}
                            >
                              +ย่อยใต้รายการนี้
                            </button>
                          ) : null}
                          {canQuickAddSection ? (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={handleQuickAddSection}
                              disabled={!session || treeActionState === 'saving'}
                            >
                              +บทเรียนหลัก
                            </button>
                          ) : null}
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => {
                              if (!selectedCourseId) return;
                              router.push(`${selectedCourseRoute}/lessons/${selectedNode.id}`);
                            }}
                          >
                            เปิดหน้าแก้ไขบทเรียน
                          </button>
                        </div>
                      </div>
                      <NodeSummaryCard
                        title="สรุปบทเรียนแบบอ่านอย่างเดียว"
                        summaryLabel="Quick overview"
                        compact
                        nodeTypeLabel={formatNodeTypeLabel(selectedNode.nodeType)}
                        estimatedMinutes={selectedNode.estimatedMinutes || 0}
                        selectedModule={selectedModule}
                        lessonPreviewFacts={lessonPreviewFacts}
                        onOpenVideoManager={() => setIsVideoManagerOpen(true)}
                        primaryActionLabel="ไปที่ lesson editor"
                        primaryAction={() => {
                          if (!selectedCourseId) return;
                          router.push(`${selectedCourseRoute}/lessons/${selectedNode.id}`);
                        }}
                        actionCaption="ฟอร์มแก้ไขจริงอยู่ที่หน้า lesson route เดียว"
                      />
                    </article>
                  ) : null}
                </section>
                ) : null}
                  </>
                ) : !isCourseDetailRoute ? (
                  <section className="dual-panel">
                    <article className="content-panel course-launch-panel">
                      <div className="panel-head">
                        <div>
                          <span className="section-label">สร้างคอร์ส</span>
                          <h3>เปิดคอร์สใหม่</h3>
                        </div>
                        {courseSaveState !== 'idle' ? <span className={`status-pill${courseSaveState === 'saved' ? ' is-ready' : ''}`}>{courseSaveState === 'saving' ? 'กำลังบันทึก' : 'บันทึกแล้ว'}</span> : null}
                      </div>
                      <p className="course-launch-copy">ใช้เป็นพื้นที่ออกแบบคอร์สใหม่, ตั้งชื่อ, ระบุวิชา, และเริ่มโครงก่อนค่อยลงบทเรียนทีหลัง</p>
                      {session ? (
                        <div className="inline-note course-launch-note">
                          <strong>ก่อนสร้างคอร์สใหม่</strong>
                          <span>กำหนดก่อนว่าจะขายแบบรายเดือนหรือรายคอร์ส เพื่อให้วิธีคิดเงินกับนักเรียนของคอร์สใหม่ชัดเจนตั้งแต่ต้น</span>
                          <div className="section-toolbar-actions">
                            <button type="button" className="secondary-button" onClick={() => handleDashboardNavSelect('price')}>
                              ไปที่รายเดือน
                            </button>
                            <button type="button" className="secondary-button" onClick={() => handleDashboardNavSelect('promotion')}>
                              ไปที่รายคอร์ส
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <form className="editor-form" onSubmit={handleCreateCourse}>
                        <label className="field"><span>ชื่อคอร์ส</span><input value={createCourseForm.title} onChange={(event) => setCreateCourseForm((current) => ({ ...current, title: event.target.value }))} required /></label>
                        <p className="form-hint">รหัสคอร์สจะสร้างอัตโนมัติจากชื่อคอร์ส: <strong>{createCourseSlugPreview}</strong></p>
                        <label className="field"><span>คำอธิบาย</span><textarea value={createCourseForm.description} onChange={(event) => setCreateCourseForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
                        <div className="field-grid">
                          <label className="field"><span>วิชา</span><input value={createCourseForm.subject} onChange={(event) => setCreateCourseForm((current) => ({ ...current, subject: event.target.value }))} /></label>
                          <label className="field"><span>ระดับ</span><input value={createCourseForm.level} onChange={(event) => setCreateCourseForm((current) => ({ ...current, level: event.target.value }))} /></label>
                        </div>
                        <button className="primary-button" type="submit" disabled={!session || courseSaveState === 'saving'}>สร้างคอร์สใหม่</button>
                      </form>
                    </article>
                    <article className="content-panel course-launch-note-panel">
                      <div className="panel-head"><div><span className="section-label">รายการตรวจสอบ</span><h3>สิ่งที่ระบบจะเติมให้หลังสร้าง</h3></div></div>
                      <div className="queue-list">
                        <div className="queue-item queue-item-stack"><strong>รหัสคอร์ส</strong><span>ระบบ generate จากชื่อคอร์สให้อัตโนมัติ</span></div>
                        <div className="queue-item queue-item-stack"><strong>รายการคอร์ส</strong><span>คอร์สใหม่จะกลับไปโผล่ในรายการทันทีหลังบันทึก</span></div>
                        <div className="queue-item queue-item-stack"><strong>ขั้นตอนถัดไป</strong><span>หลังสร้างเสร็จค่อยกลับไปที่รายการคอร์สเพื่อวางโครงสร้างบทเรียน</span></div>
                      </div>
                    </article>
                  </section>
                ) : null}
              </section>
            ) : null}

            {view === 'students' ? (
              <section className="panel-stack">
                <article className="content-panel">
                  <div className="panel-head"><div><span className="section-label">สัญญาณนักเรียน</span><h3>นักเรียนที่ต้องติดตาม</h3></div></div>
                  {students?.students?.length ? (
                    <div className="table-list">
                      {students.students.map((student) => (
                        <article key={student.id} className="table-row">
                          <div><strong>{student.name}</strong><p>{student.email}</p></div>
                          <div className={`badge tone-${statusTone(student.status)}`}>{student.status}</div>
                          <div className="row-meta"><span>{student.progress}% progress</span><span>ต่ออายุ {formatDate(student.renewalDue)}</span></div>
                        </article>
                      ))}
                    </div>
                  ) : <div className="empty-state"><strong>{session ? 'บัญชีนี้ยังไม่มี student summary' : 'ล็อกอินก่อนเพื่อดูนักเรียน'}</strong><p>ถ้าบัญชีไม่มีสิทธิ์ admin endpoint นี้จะถูกซ่อนโดยไม่ทำให้หน้าแตก</p></div>}
                </article>
                <article className="content-panel">
                  <div className="panel-head"><div><span className="section-label">ภาพรวมการรักษานักเรียน</span><h3>ภาพรวม cohort แบบตัดสินใจเร็ว</h3></div></div>
                  <div className="retention-grid">
                    <div className="detail-card"><span>Active</span><strong>{activeStudents}</strong></div>
                    <div className="detail-card"><span>Expiring</span><strong>{expiringStudents}</strong></div>
                    <div className="detail-card"><span>Expired</span><strong>{students?.expired ?? 0}</strong></div>
                  </div>
                </article>
              </section>
            ) : null}

            {view === 'website' ? (
              <section className="website-workspace">
                <div className="section-toolbar">
                  <div>
                    <span className="section-label">Website editor</span>
                    <h3>index.html สำหรับหน้าเว็บของ tutor</h3>
                  </div>
                  <div className="toolbar-actions">
                    <button className="secondary-button" type="button" onClick={handleLoadLandingPage} disabled={!session || landingLoading}>
                      {landingLoading ? 'กำลังโหลด...' : 'Reload'}
                    </button>
                    <button className="theme-toggle" type="button" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} aria-pressed={theme === 'light'}>
                      {themeToggleLabel}
                    </button>
                  </div>
                </div>
                <div className="dual-panel">
                  <article className="content-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">Raw HTML</span>
                        <h3>บันทึก index.html ของ tenant นี้</h3>
                      </div>
                      {landingExists ? <span className="status-pill is-ready">saved</span> : <span className="status-pill">new</span>}
                    </div>
                    <form className="editor-form" onSubmit={handleSaveLandingPage}>
                      <label className="field">
                        <span>URL</span>
                        <input value={landingUrl || (session ? `https://${session.user.tenant.slug}.coursechic.com/` : '')} readOnly />
                      </label>
                      <label className="field">
                        <span>HTML content</span>
                        <textarea rows={20} value={landingHtml} onChange={(event) => setLandingHtml(event.target.value)} placeholder="วาง HTML ของหน้า tutor ที่นี่" />
                      </label>
                      <div className="action-row">
                        <button className="primary-button" type="submit" disabled={!session || landingSaving}>
                          {landingSaving ? 'กำลังบันทึก...' : 'บันทึก index.html'}
                        </button>
                        <button className="secondary-button" type="button" onClick={() => void handleLoadLandingPage()} disabled={!session || landingLoading}>
                          โหลดจาก backend
                        </button>
                      </div>
                    </form>
                  </article>
                  <article className="content-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">Preview</span>
                        <h3>ดูหน้าเว็บก่อน publish</h3>
                      </div>
                    </div>
                    <div className="website-preview-shell">
                      <iframe
                        className="website-preview-frame"
                        srcDoc={landingHtml || '<!doctype html><html><body><main style="font-family:Sarabun,sans-serif;padding:40px">ยังไม่มี HTML</main></body></html>'}
                        title="Landing page preview"
                        sandbox="allow-forms allow-popups allow-scripts allow-same-origin"
                      />
                    </div>
                    <div className="preview-grid">
                      <article className="preview-card">
                        <span>Status</span>
                        <strong>{landingExists ? 'saved' : 'draft'}</strong>
                        <small>{landingLoading ? 'กำลังโหลดข้อมูล' : 'ข้อมูลดึงจาก backend เดิม'}</small>
                      </article>
                      <article className="preview-card">
                        <span>Public URL</span>
                        <strong>{landingUrl || (session ? `https://${session.user.tenant.slug}.coursechic.com/` : 'ยังไม่มี URL')}</strong>
                        <small>แก้ไฟล์เดียวให้หน้า tutor ใช้งานได้ทันที</small>
                      </article>
                      <article className="preview-card">
                        <span>File</span>
                        <strong>{landingExists ? 'index.html' : 'unsaved'}</strong>
                        <small>{session ? `tenant: ${session.user.tenant.slug}` : 'login ก่อนถึงจะบันทึกได้'}</small>
                      </article>
                    </div>
                  </article>
                </div>
              </section>
            ) : null}

            {isOwnerWorkspace ? (
              <>
                {view === 'growth' ? (
                  <section className="content-panel">
                <div className="panel-head"><div><span className="section-label">SaaS roadmap</span><h3>เปิด tutor และขยาย control plane</h3></div></div>
                <div className="priority-grid">
                  <div className="priority-card"><strong>Tutor onboarding</strong><p>ต่อกับ `/api/admin/tutors` เพื่อเปิดบัญชี tutor ใหม่และสร้าง tenant landing page จากจุดเดียว</p></div>
                  <div className="priority-card"><strong>Billing and payments</strong><p>เพิ่ม subscription state, payout, ใบเสร็จ, และเหตุการณ์ชำระเงินโดยไม่ต้องย้อนกลับไปใช้หน้าเก่า</p></div>
                  <div className="priority-card"><strong>Tenant health</strong><p>แสดง license, usage, media backlog, และการแจ้งเตือนที่ระดับ SaaS control plane</p></div>
                </div>
                <div className="growth-signals">
                  <article className="signal-card">
                    <span>Tutors onboarded</span>
                    <strong>{session ? tutorCount : '-'}</strong>
                    <small>{recentTutorCount} รายเปิดใหม่ใน 30 วันล่าสุด</small>
                  </article>
                  <article className="signal-card">
                    <span>License health</span>
                    <strong>{session ? licenseHealthLabel : '-'}</strong>
                    <small>{session?.license?.plan || 'starter'} plan ของ workspace ปัจจุบัน</small>
                  </article>
                  <article className="signal-card">
                    <span>Network tempo</span>
                    <strong>{session ? tutorHealthLabel : '-'}</strong>
                    <small>{tutorCount ? 'ใช้ directory นี้เป็นฐานต่อยอด billing และ usage' : 'เริ่มจากเปิด tutor รายแรกในระบบ'}</small>
                  </article>
                </div>
                <div className="growth-board">
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Operating lane</span><h3>งาน owner ที่ควรไล่ต่อ</h3></div></div>
                    <div className="queue-list">
                      {growthActions.map((item) => (
                        <div key={item} className="queue-item queue-item-stack">
                          <strong>Next</strong>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Platform brief</span><h3>สรุปสภาพของเครือข่าย tutor</h3></div></div>
                    <div className="preview-grid">
                      <article className="preview-card">
                        <span>Primary workspace</span>
                        <strong>{session?.user.tenant.slug || 'coursechic'}</strong>
                      </article>
                      <article className="preview-card">
                        <span>Latest launch</span>
                        <strong>{tenantRows[0]?.tenant.slug || 'ยังไม่มี tenant เพิ่มเติม'}</strong>
                      </article>
                      <article className="preview-card">
                        <span>Owner contact</span>
                        <strong>{session?.user.email || 'coursechic@gmail.com'}</strong>
                      </article>
                    </div>
                  </article>
                </div>
                <div className="growth-board">
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Billing readiness</span><h3>จุดที่ต้องพร้อมก่อน payment flow</h3></div></div>
                    <div className="queue-list">
                      {billingSignals.map((item) => (
                        <div key={item.label} className="queue-item queue-item-stack">
                          <strong>{item.label}</strong>
                          <span>{item.value}</span>
                          <small>{item.hint}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Usage snapshot</span><h3>ภาพรวม traffic และ load แบบย่อ</h3></div></div>
                    <div className="preview-grid">
                      {usageSignals.map((item) => (
                        <article key={item.label} className="preview-card">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.hint}</small>
                        </article>
                      ))}
                    </div>
                  </article>
                </div>
                <div className="growth-board">
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Payment sandbox</span><h3>ทดสอบการสร้าง checkout session</h3></div></div>
                    <form className="editor-form" onSubmit={handleCreatePaymentSession}>
                      <label className="field">
                        <span>Course</span>
                        <select value={paymentForm.courseId} onChange={(event) => setPaymentForm((current) => ({ ...current, courseId: event.target.value }))}>
                          <option value="">เลือกคอร์ส</option>
                          {displayedCourses.map((course) => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                          ))}
                        </select>
                      </label>
                      <button className="primary-button" type="submit" disabled={!session || creatingPaymentSession || !paymentForm.courseId}>
                        {creatingPaymentSession ? 'กำลังสร้าง session...' : 'สร้าง payment session'}
                      </button>
                    </form>
                    {paymentResult ? (
                      <>
                        <div className="result-card payment-result">
                          <strong>{paymentResult.courseTitle}</strong>
                          <p>{paymentResult.sessionId}</p>
                          <div className="identity-grid compact-grid">
                            <div><dt>Amount</dt><dd>{paymentResult.amount} {paymentResult.currency.toUpperCase()}</dd></div>
                            <div><dt>Status</dt><dd>ready</dd></div>
                          </div>
                        </div>
                        <form className="editor-form payment-confirm-form" onSubmit={handleConfirmPaymentSession}>
                          <label className="field">
                            <span>Session ID</span>
                            <input value={paymentConfirmSessionId} onChange={(event) => setPaymentConfirmSessionId(event.target.value)} required />
                          </label>
                          <button className="secondary-button" type="submit" disabled={!session || confirmingPaymentSession || !paymentConfirmSessionId}>
                            {confirmingPaymentSession ? 'กำลังยืนยัน...' : 'ยืนยันการจ่ายเงิน'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="empty-state compact-empty">
                        <strong>ยังไม่มี payment session</strong>
                        <p>ใช้คอร์สที่มีอยู่เพื่อทดสอบ flow ชำระเงินแบบ end-to-end บน tenant นี้</p>
                      </div>
                    )}
                    {paymentConfirmResult ? (
                      <div className="result-card payment-result">
                        <strong>{paymentConfirmResult.message}</strong>
                        <div className="identity-grid compact-grid">
                          <div><dt>Enrollment</dt><dd>{paymentConfirmResult.enrollment.id || '-'}</dd></div>
                          <div><dt>Course</dt><dd>{paymentConfirmResult.enrollment.courseId || '-'}</dd></div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                  <article className="content-panel embedded-panel">
                    <div className="panel-head"><div><span className="section-label">Feature flags</span><h3>ความสามารถที่เปิดอยู่ใน tenant นี้</h3></div></div>
                    {featureKeys.length ? (
                      <div className="tag-list">
                        {featureKeys.map((feature) => (
                          <span key={feature} className="feature-tag">{feature}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state compact-empty">
                        <strong>ยังไม่มี feature flags</strong>
                        <p>เมื่อ backend ส่ง feature map มา ส่วนนี้จะสะท้อน capability ของ tenant แบบทันที</p>
                      </div>
                    )}
                  </article>
                </div>
                  </section>
                ) : null}
                {(isOwnerWorkspace ? view === 'price' : false) ? (
                  canManageTutors ? (
                  <section className="content-panel pricing-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">Price</span>
                        <h3>ตั้งราคาแพ็กเกจและ override ราย tutor</h3>
                      </div>
                      <span className="status-pill">{pricingLoading ? 'syncing' : 'ready'}</span>
                    </div>
                    <div className="pricing-summary-grid">
                      <article className="pricing-summary-card">
                        <span>Price packages</span>
                        <strong>{pricingPackages.length} packages</strong>
                        <small>{pricingPackages.filter((pkg) => pkg.highlighted).length ? 'มีแพ็กเกจที่ถูกเน้นเป็นตัวเลือกแนะนำ' : 'ยังไม่มีแพ็กเกจที่ไฮไลต์'}</small>
                      </article>
                      <article className="pricing-summary-card">
                        <span>Tutor overrides</span>
                        <strong>{pricingOverrideRows.length} workspaces</strong>
                        <small>{pricingSelectedOverrideLabel}</small>
                      </article>
                      <article className="pricing-summary-card">
                        <span>Selected package</span>
                        <strong>{pricingSelectedBasePackage?.name || 'Starter'}</strong>
                        <small>{pricingSelectedMonthlyFee !== null ? `${pricingSelectedMonthlyFee} บาท / เดือน` : 'ตกลงตามเงื่อนไของค์กร'}</small>
                      </article>
                    </div>
                    <div className="pricing-intro">
                      <strong>ตั้งค่าหลักก่อน แล้วค่อย override ราย workspace</strong>
                      <span>ดูแล monthly fee, revenue share และ video quota</span>
                    </div>
                    <form className="editor-form" onSubmit={handleSavePricingConfig}>
                      <div className="pricing-packages-grid">
                        {pricingPackages.map((pkg) => (
                          <article key={pkg.id} className={`pricing-package-card${pkg.highlighted ? ' is-highlighted' : ''}`}>
                            <div className="pricing-package-head">
                              <div>
                                <span className="section-label">{pkg.id}</span>
                                <h4>{pkg.name}</h4>
                              </div>
                              {pkg.highlighted ? <span className="badge tone-good">recommended</span> : null}
                            </div>
                            <div className="field-grid pricing-mini-grid">
                              <label className="field">
                                <span>รายเดือน</span>
                                <input type="number" min="0" step="1" value={pkg.monthlyFee ?? ''} onChange={(event) => updatePricingPackageDraft(pkg.id, 'monthlyFee', event.target.value)} />
                              </label>
                              <label className="field">
                                <span>Revenue share %</span>
                                <input type="number" min="0" step="1" value={pkg.revenueSharePct ?? ''} onChange={(event) => updatePricingPackageDraft(pkg.id, 'revenueSharePct', event.target.value)} />
                              </label>
                              <label className="field">
                                <span>Video quota GB</span>
                                <input type="number" min="0" step="1" value={pkg.videoQuotaGb ?? ''} onChange={(event) => updatePricingPackageDraft(pkg.id, 'videoQuotaGb', event.target.value)} />
                              </label>
                            </div>
                            <label className="field">
                              <span>หมายเหตุ</span>
                              <textarea rows={3} value={pkg.note} onChange={(event) => updatePricingPackageDraft(pkg.id, 'note', event.target.value)} />
                            </label>
                          </article>
                        ))}
                      </div>
                      <button className="primary-button" type="submit" disabled={!session || pricingSaving}>
                        {pricingSaving ? 'กำลังบันทึก...' : 'บันทึก default price'}
                      </button>
                    </form>
                    <div className="pricing-override-grid">
                      <form className="content-panel embedded-panel pricing-override-form" onSubmit={handleSavePricingOverride}>
                        <div className="panel-head">
                          <div>
                            <span className="section-label">Tutor price override</span>
                            <h3>ปรับค่าราคาเฉพาะราย tutor</h3>
                          </div>
                        </div>
                        <div className="pricing-inline-note">
                          เลือก tutor ก่อน แล้วระบบจะดึง package หลักให้พร้อมแก้ราคาเฉพาะ workspace นั้น
                        </div>
                        <div className="field-grid">
                          <label className="field">
                            <span>เลือก tutor</span>
                            <select value={pricingOverrideForm.tenantSlug} onChange={(event) => {
                              const slug = event.target.value;
                              const tutorEntry = tutors?.tutors?.find((entry) => entry.tenant.slug === slug);
                              setPricingOverrideForm((current) => ({
                                ...current,
                                tenantSlug: slug,
                                tenantName: tutorEntry?.tenant.name || current.tenantName,
                              }));
                              if (slug) loadPricingOverrideFromTutor(slug);
                            }}>
                              <option value="">เลือก tutor</option>
                              {(tutors?.tutors || []).map((entry) => (
                                <option key={entry.tenant.slug} value={entry.tenant.slug}>{entry.tenant.name} ({entry.tenant.slug})</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Package</span>
                            <select value={pricingOverrideForm.packageId} onChange={(event) => {
                              const packageId = event.target.value as PricingPackage['id'];
                              const basePackage = pricingPackages.find((item) => item.id === packageId);
                              setPricingOverrideForm((current) => ({
                                ...current,
                                packageId,
                                monthlyFee: basePackage?.monthlyFee?.toString() || '',
                                revenueSharePct: basePackage?.revenueSharePct?.toString() || '',
                                videoQuotaGb: basePackage?.videoQuotaGb?.toString() || '',
                              }));
                            }}>
                              {pricingPackages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="pricing-preview-grid">
                          <article className="pricing-preview-card">
                            <span>Tutor</span>
                            <strong>{pricingSelectedOverrideLabel}</strong>
                            <small>{pricingSelectedTutorEntry?.tenant.url || 'ยังไม่มี workspace ที่เลือก'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>Effective package</span>
                            <strong>{pricingSelectedBasePackage?.name || 'Starter'}</strong>
                            <small>{pricingSelectedMonthlyFee !== null ? `${pricingSelectedMonthlyFee} บาท / เดือน` : 'ตกลงตามเงื่อนไของค์กร'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>Package quota</span>
                            <strong>{pricingSelectedVideoQuota !== null ? `${pricingSelectedVideoQuota} GB` : 'ไม่จำกัด'}</strong>
                            <small>{pricingSelectedRevenueShare !== null ? `${pricingSelectedRevenueShare}% revenue share` : 'ใช้ตามเงื่อนไของค์กร'}</small>
                          </article>
                        </div>
                        <div className="field-grid">
                          <label className="field"><span>รายเดือน</span><input type="number" min="0" step="1" value={pricingOverrideForm.monthlyFee} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, monthlyFee: event.target.value }))} /></label>
                          <label className="field"><span>Revenue share %</span><input type="number" min="0" step="1" value={pricingOverrideForm.revenueSharePct} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, revenueSharePct: event.target.value }))} /></label>
                          <label className="field"><span>Video quota GB</span><input type="number" min="0" step="1" value={pricingOverrideForm.videoQuotaGb} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, videoQuotaGb: event.target.value }))} /></label>
                        </div>
                        <label className="field">
                          <span>หมายเหตุ override</span>
                          <textarea rows={3} value={pricingOverrideForm.note} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, note: event.target.value }))} />
                        </label>
                        <button className="primary-button" type="submit" disabled={!session || pricingSaving || !pricingOverrideForm.tenantSlug}>
                          {pricingSaving ? 'กำลังบันทึก...' : 'บันทึก tutor price override'}
                        </button>
                      </form>
                      <article className="content-panel embedded-panel">
                        <div className="panel-head"><div><span className="section-label">Override list</span><h3>ค่าราคาที่ตั้งไว้ราย tutor</h3></div></div>
                        {pricingOverrideRows.length ? (
                          <div className="table-list">
                            {pricingOverrideRows.map((override) => (
                              <button key={override.tenantSlug} type="button" className="table-row selectable-row pricing-override-row" onClick={() => loadPricingOverrideFromTutor(override.tenantSlug)}>
                                <div>
                                  <strong>{override.tenantName}</strong>
                                  <p>{override.note || 'ยังไม่มีหมายเหตุ'}</p>
                                </div>
                                <div className="row-meta">
                                  <span>{override.packageId}</span>
                                  <span>{override.tenantSlug}</span>
                                </div>
                                <div className="row-meta">
                                  <span>{override.monthlyFee ?? '-'} บาท</span>
                                  <span>{override.revenueSharePct ?? '-'}%</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <strong>ยังไม่มี tutor override</strong>
                            <p>เลือก tutor แล้วกำหนดราคาเฉพาะรายได้จากจุดนี้</p>
                          </div>
                        )}
                      </article>
                    </div>
                  </section>
                  ) : (
                    <section id="tutor-monthly-pricing" className="content-panel pricing-panel">
                      <div className="panel-head">
                        <div>
                          <span className="section-label">การขาย</span>
                          <h3>ตั้งค่าการเก็บเงินกับนักเรียนของ workspace นี้</h3>
                        </div>
                        <span className="status-pill">{tenantContext?.pricing?.monthlyFee ? 'active' : 'pending'}</span>
                      </div>
                      <div className="node-detail-tabs" role="tablist" aria-label="รูปแบบการขาย">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorCommerceMode === 'monthly'}
                          className={`node-tab${tutorCommerceMode === 'monthly' ? ' is-active' : ''}`}
                          onClick={() => router.push(pricePath)}
                        >
                          รายเดือน
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorCommerceMode === 'course'}
                          className={`node-tab${tutorCommerceMode === 'course' ? ' is-active' : ''}`}
                          onClick={() => router.push(promotionPath)}
                        >
                          รายคอร์ส
                        </button>
                      </div>
                      <div className="pricing-intro pricing-intro-strong">
                        <strong>โมเดลนี้เหมาะกับ tutor ที่อยากให้นักเรียนจ่ายครั้งเดียวต่อรอบบิล แล้วเรียนได้ทุกคอร์สใน workspace</strong>
                        <span>ราคาที่นี่คือค่าสมาชิกของนักเรียน ไม่ใช่ค่าระบบของแพลตฟอร์ม</span>
                      </div>
                      {pricingError ? (
                        <div className="composer-note is-live" role="status">
                          {pricingError}
                        </div>
                      ) : null}
                      <div className="pricing-summary-grid">
                        <article className="pricing-summary-card">
                          <span>ค่าสมาชิกรายเดือน</span>
                          <strong>{packagePriceLabel}</strong>
                          <small>{tenantContext?.pricing?.renewalIntervalMonths ? `ต่ออายุทุก ${tenantContext.pricing.renewalIntervalMonths} เดือน` : 'ยังไม่กำหนดรอบต่ออายุ'}</small>
                        </article>
                        <article className="pricing-summary-card">
                          <span>สิทธิ์การเรียน</span>
                          <strong>ทุกคอร์สในระบบ</strong>
                          <small>นักเรียนไม่ต้องซื้อแยกทีละคอร์สเมื่ออยู่ในแพ็กเกจรายเดือน</small>
                        </article>
                        <article className="pricing-summary-card">
                          <span>โปรโมชันปัจจุบัน</span>
                          <strong>{packagePromoLabel}</strong>
                          <small>{tenantContext?.billingProfile?.checkoutOwner === 'TUTOR' ? 'tutor รับชำระเงินเอง' : 'platform รับชำระเงินให้'}</small>
                        </article>
                      </div>
                    </section>
                  )
                ) : null}

                {(isOwnerWorkspace ? view === 'promotion' : isTutorCommerceView && tutorCommerceMode === 'course') ? (
                  canManageTutors ? (
                  <section className="content-panel pricing-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-label">Promotion</span>
                        <h3>ตั้งโปรโมชันและส่วนลดของ tutor</h3>
                      </div>
                      <span className="status-pill">{pricingLoading ? 'syncing' : 'ready'}</span>
                    </div>
                    <div className="promo-banner">
                      <strong>{pricingPromo.label}</strong>
                      <span>{pricingPromo.enabled ? `${pricingPromo.freeMonths} เดือนแรกฟรีค่าบริการรายเดือน` : 'ปิดโปรโมชันฟรีชั่วคราว'}</span>
                      <small>{pricingPromo.note}</small>
                    </div>
                    <div className="pricing-summary-grid">
                      <article className="pricing-summary-card">
                        <span>Promo policy</span>
                        <strong>{pricingPromo.enabled ? `${pricingPromo.freeMonths} เดือนฟรี` : 'ปิดโปรโมชัน'}</strong>
                        <small>{pricingPromo.label}</small>
                      </article>
                      <article className="pricing-summary-card">
                        <span>Tutor promo overrides</span>
                        <strong>{pricingOverrideRows.length} workspaces</strong>
                        <small>{pricingSelectedOverrideLabel}</small>
                      </article>
                      <article className="pricing-summary-card">
                        <span>Default promo</span>
                        <strong>{pricingPromo.freeMonths} เดือน</strong>
                        <small>{pricingPromo.enabled ? 'นำไปใช้เป็นค่าเริ่มต้นของ workspace ใหม่' : 'ระบบจะไม่ใช้โปรโมชันอัตโนมัติ'}</small>
                      </article>
                    </div>
                    <div className="pricing-intro">
                      <strong>ตั้งค่าโปรโมชันหลักก่อน แล้วค่อย override ราย workspace</strong>
                      <span>ดูแล label, note และจำนวนเดือนฟรี</span>
                    </div>
                    <form className="editor-form" onSubmit={handleSavePricingConfig}>
                      <div className="pricing-promo-grid">
                        <label className="field">
                          <span>สถานะโปรโมชัน</span>
                          <select value={pricingPromo.enabled ? 'on' : 'off'} onChange={(event) => updatePricingPromoDraft('enabled', event.target.value === 'on')}>
                            <option value="on">เปิดใช้</option>
                            <option value="off">ปิดใช้</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>จำนวนเดือนฟรี</span>
                          <input type="number" min="0" step="1" value={pricingPromo.freeMonths} onChange={(event) => updatePricingPromoDraft('freeMonths', event.target.value)} />
                        </label>
                        <label className="field">
                          <span>ชื่อโปรโมชัน</span>
                          <input value={pricingPromo.label} onChange={(event) => updatePricingPromoDraft('label', event.target.value)} />
                        </label>
                        <label className="field">
                          <span>คำอธิบาย</span>
                          <input value={pricingPromo.note} onChange={(event) => updatePricingPromoDraft('note', event.target.value)} />
                        </label>
                      </div>
                      <button className="primary-button" type="submit" disabled={!session || pricingSaving}>
                        {pricingSaving ? 'กำลังบันทึก...' : 'บันทึก default promotion'}
                      </button>
                    </form>
                    <div className="pricing-override-grid">
                      <form className="content-panel embedded-panel pricing-override-form" onSubmit={handleSavePricingOverride}>
                        <div className="panel-head">
                          <div>
                            <span className="section-label">Tutor promotion override</span>
                            <h3>ปรับโปรโมชันเฉพาะราย tutor</h3>
                          </div>
                        </div>
                        <div className="pricing-inline-note">
                          เลือก tutor แล้วกำหนดเดือนฟรีของ workspace นั้น
                        </div>
                        <div className="field-grid">
                          <label className="field">
                            <span>เลือก tutor</span>
                            <select value={pricingOverrideForm.tenantSlug} onChange={(event) => {
                              const slug = event.target.value;
                              const tutorEntry = tutors?.tutors?.find((entry) => entry.tenant.slug === slug);
                              setPricingOverrideForm((current) => ({
                                ...current,
                                tenantSlug: slug,
                                tenantName: tutorEntry?.tenant.name || current.tenantName,
                              }));
                              if (slug) loadPricingOverrideFromTutor(slug);
                            }}>
                              <option value="">เลือก tutor</option>
                              {(tutors?.tutors || []).map((entry) => (
                                <option key={entry.tenant.slug} value={entry.tenant.slug}>{entry.tenant.name} ({entry.tenant.slug})</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Package</span>
                            <select value={pricingOverrideForm.packageId} onChange={(event) => {
                              const packageId = event.target.value as PricingPackage['id'];
                              const basePackage = pricingPackages.find((item) => item.id === packageId);
                              setPricingOverrideForm((current) => ({
                                ...current,
                                packageId,
                                monthlyFee: basePackage?.monthlyFee?.toString() || '',
                                revenueSharePct: basePackage?.revenueSharePct?.toString() || '',
                                videoQuotaGb: basePackage?.videoQuotaGb?.toString() || '',
                              }));
                            }}>
                              {pricingPackages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="pricing-preview-grid">
                          <article className="pricing-preview-card">
                            <span>Tutor</span>
                            <strong>{pricingSelectedOverrideLabel}</strong>
                            <small>{pricingSelectedTutorEntry?.tenant.url || 'ยังไม่มี workspace ที่เลือก'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>Promo on this tutor</span>
                            <strong>{pricingSelectedPromoMonths} เดือนฟรี</strong>
                            <small>{pricingSelectedBasePackage?.name || 'Starter'} · {pricingSelectedRevenueShare !== null ? `${pricingSelectedRevenueShare}% revenue share` : 'ใช้ตามเงื่อนไของค์กร'}</small>
                          </article>
                          <article className="pricing-preview-card">
                            <span>Default policy</span>
                            <strong>{pricingPromo.enabled ? 'Active' : 'Paused'}</strong>
                            <small>{pricingPromo.label}</small>
                          </article>
                        </div>
                        <div className="field-grid">
                          <label className="field"><span>Promo เดือนฟรี</span><input type="number" min="0" step="1" value={pricingOverrideForm.promoFreeMonths} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, promoFreeMonths: event.target.value }))} /></label>
                          <label className="field">
                            <span>หมายเหตุ override</span>
                            <textarea rows={3} value={pricingOverrideForm.note} onChange={(event) => setPricingOverrideForm((current) => ({ ...current, note: event.target.value }))} />
                          </label>
                        </div>
                        <button className="primary-button" type="submit" disabled={!session || pricingSaving || !pricingOverrideForm.tenantSlug}>
                          {pricingSaving ? 'กำลังบันทึก...' : 'บันทึก tutor promotion override'}
                        </button>
                      </form>
                      <article className="content-panel embedded-panel">
                        <div className="panel-head"><div><span className="section-label">Override list</span><h3>โปรโมชันราย tutor ที่ตั้งไว้</h3></div></div>
                        {pricingOverrideRows.length ? (
                          <div className="table-list">
                            {pricingOverrideRows.map((override) => (
                              <button key={override.tenantSlug} type="button" className="table-row selectable-row pricing-override-row" onClick={() => loadPricingOverrideFromTutor(override.tenantSlug)}>
                                <div>
                                  <strong>{override.tenantName}</strong>
                                  <p>{override.note || 'ยังไม่มีหมายเหตุ'}</p>
                                </div>
                                <div className="row-meta">
                                  <span>{override.packageId}</span>
                                  <span>{override.tenantSlug}</span>
                                </div>
                                <div className="row-meta">
                                  <span>{override.promoFreeMonths} เดือนฟรี</span>
                                  <span>{override.updatedAt ? formatDate(override.updatedAt) : '-'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <strong>ยังไม่มี tutor promo override</strong>
                            <p>เลือก tutor แล้วกำหนดโปรโมชันเฉพาะรายได้จากจุดนี้</p>
                          </div>
                        )}
                      </article>
                    </div>
                  </section>
                  ) : (
                    <section id="tutor-course-pricing-guide" className="content-panel pricing-panel">
                      <div className="panel-head">
                        <div>
                          <span className="section-label">การขาย</span>
                          <h3>ตั้งค่าการเก็บเงินกับนักเรียนของ workspace นี้</h3>
                        </div>
                        <span className="status-pill">course mode</span>
                      </div>
                      <div className="node-detail-tabs" role="tablist" aria-label="รูปแบบการขาย">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorCommerceMode === 'monthly'}
                          className={`node-tab${tutorCommerceMode === 'monthly' ? ' is-active' : ''}`}
                          onClick={() => router.push(pricePath)}
                        >
                          รายเดือน
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tutorCommerceMode === 'course'}
                          className={`node-tab${tutorCommerceMode === 'course' ? ' is-active' : ''}`}
                          onClick={() => router.push(promotionPath)}
                        >
                          รายคอร์ส
                        </button>
                      </div>
                      <div className="pricing-intro pricing-intro-strong">
                        <strong>โมเดลนี้ใช้เมื่ออยากขายทีละคอร์ส และกำหนดว่านักเรียนจะเรียนคอร์สนั้นได้นานกี่เดือน</strong>
                        <span>ราคาคอร์ส, ราคาเดิม, คูปอง, โปรโมชัน และสิทธิ์เรียน จะผูกกับแต่ละคอร์สโดยตรง</span>
                      </div>
                      <div className="pricing-summary-grid">
                        <article className="pricing-summary-card">
                          <span>ตั้งราคาที่ไหน</span>
                          <strong>หน้าแต่ละคอร์ส</strong>
                          <small>เข้า `/educator/courses/:id` เพื่อกำหนดราคาขายและสิทธิ์เรียนของคอร์สนั้น</small>
                        </article>
                        <article className="pricing-summary-card">
                          <span>สิทธิ์เรียน</span>
                          <strong>1, 3, 6, 12 เดือน หรือ ตลอดชีพ</strong>
                          <small>แต่ละคอร์สเลือกช่วงเวลาไม่เหมือนกันได้</small>
                        </article>
                        <article className="pricing-summary-card">
                          <span>คูปองและโปรโมชัน</span>
                          <strong>ผูกกับคอร์สนั้นโดยตรง</strong>
                          <small>ลดราคาเฉพาะบางคอร์สได้ โดยไม่กระทบคอร์สอื่น</small>
                        </article>
                      </div>
                      <div className="priority-grid">
                        <div className="priority-card"><strong>รายคอร์ส</strong><p>เหมาะกับคอร์สที่มีมูลค่าไม่เท่ากัน และต้องกำหนดราคาแยกตามตัวคอร์ส</p></div>
                        <div className="priority-card"><strong>ตัวอย่างการขาย</strong><p>คอร์ส A เปิด 3 เดือน, คอร์ส B เปิด 12 เดือน แล้วหมดสิทธิ์เรียนตามช่วงเวลาของคอร์สนั้น</p></div>
                        <div className="priority-card"><strong>โมเดลหลัก</strong><p>ถ้า workspace นี้ขายแบบรายเดือนเป็นหลัก ควรสื่อสารให้ชัดว่ารายคอร์สเป็นอีกตัวเลือกหนึ่ง</p></div>
                      </div>
                      <div className="action-row">
                        <button className="primary-button" type="button" onClick={() => handleDashboardNavSelect('courses')}>
                          ไปตั้งราคาคอร์ส
                        </button>
                        <button className="secondary-button" type="button" onClick={() => document.getElementById('tutor-monthly-pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                          กลับไปส่วนรายเดือน
                        </button>
                      </div>
                    </section>
                  )
                ) : null}
                <div className="growth-grid">
                      <form className="content-panel embedded-panel" onSubmit={handleCreateTutor}>
                        <div className="panel-head"><div><span className="section-label">Tutor onboarding</span><h3>เปิดบัญชี tutor ใหม่</h3></div></div>
                        <div className="field-grid">
                          <label className="field"><span>ชื่อ tutor</span><input value={tutorForm.name} onChange={(event) => setTutorForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                          <label className="field"><span>Slug</span><input value={tutorForm.slug} onChange={(event) => setTutorForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} required /></label>
                          <label className="field"><span>อีเมล</span><input type="email" value={tutorForm.email} onChange={(event) => setTutorForm((current) => ({ ...current, email: event.target.value }))} required /></label>
                          <label className="field"><span>Package</span><select value={tutorForm.packageId} onChange={(event) => setTutorForm((current) => ({ ...current, packageId: event.target.value as PricingPackage['id'] }))}>
                            {pricingPackages.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                            ))}
                          </select></label>
                          <label className="field"><span>รหัสผ่านเริ่มต้น</span><input value={tutorForm.password} onChange={(event) => setTutorForm((current) => ({ ...current, password: event.target.value }))} required /></label>
                        </div>
                        <button className="primary-button" type="submit" disabled={!session || creatingTutor}>{creatingTutor ? 'กำลังสร้างบัญชี...' : 'สร้าง tutor และ tenant'}</button>
                      </form>
                      <div className="content-panel embedded-panel">
                        <div className="panel-head"><div><span className="section-label">Latest result</span><h3>ผลการเปิดบัญชีล่าสุด</h3></div></div>
                        {tutorResult ? (
                          <div className="result-card">
                            <strong>{tutorResult.data.tenant.name}</strong><p>{tutorResult.data.tutor.email}</p>
                            <div className="identity-grid compact-grid">
                              <div><dt>Slug</dt><dd>{tutorResult.data.tenant.slug}</dd></div>
                              <div><dt>Public URL</dt><dd>{tutorResult.data.tenant.url}</dd></div>
                            </div>
                            {tutorResult.pricing ? (
                              <div className="identity-grid compact-grid">
                                <div><dt>Package</dt><dd>{tutorResult.pricing.packageId}</dd></div>
                                <div><dt>Monthly fee</dt><dd>{tutorResult.pricing.monthlyFee ?? '-'} บาท</dd></div>
                                <div><dt>Revenue share</dt><dd>{tutorResult.pricing.revenueSharePct ?? '-'}%</dd></div>
                                <div><dt>Video quota</dt><dd>{tutorResult.pricing.videoQuotaGb ?? '-'} GB</dd></div>
                                <div><dt>Promo</dt><dd>{tutorResult.pricing.promoFreeMonths} เดือน</dd></div>
                              </div>
                            ) : null}
                          </div>
                        ) : <div className="empty-state"><strong>ยังไม่มีการสร้างบัญชีในรอบนี้</strong><p>หลังสร้างสำเร็จ จะสรุป slug, email และ public URL ให้ใช้ต่อทันที</p></div>}
                      </div>
                    </div>
                    <div className="content-panel growth-directory">
                      <div className="panel-head"><div><span className="section-label">Tutor directory</span><h3>บัญชี tutor และ tenant ที่มีอยู่</h3></div></div>
                      {tutors?.tutors?.length ? (
                        <div className="table-list">
                          {tutors.tutors.map((entry) => (
                            <article key={`${entry.tenant.id}-${entry.tutor.id}`} className="table-row">
                              <div>
                                <strong>{entry.tenant.name}</strong>
                                <p>{entry.tutor.email}</p>
                              </div>
                              <div className={`badge tone-${entry.tutor.platformRole === 'ADMIN' ? 'good' : 'neutral'}`}>{entry.role}</div>
                              <div className="row-meta">
                                <span>{entry.tenant.slug}</span>
                                <span>{entry.tenant.url}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <strong>ยังไม่มีข้อมูล tutor directory</strong>
                          <p>เมื่อ owner โหลดสำเร็จ ระบบจะแสดง tenant และ tutor owner ทั้งหมดในที่เดียว</p>
                        </div>
                      )}
                    </div>
                    <div className="content-panel growth-directory">
                      <div className="panel-head"><div><span className="section-label">Tenant health</span><h3>มุมมอง owner สำหรับทุก workspace</h3></div></div>
                      {tenantRows.length ? (
                        <div className="table-list">
                          {tenantRows.map((entry) => (
                            <article key={`health-${entry.tenant.id}-${entry.tutor.id}`} className="table-row table-row-wide">
                              <div>
                                <strong>{entry.tenant.name}</strong>
                                <p>{entry.tutor.name || entry.tutor.email}</p>
                              </div>
                              <div className={`badge tone-${statusTone(entry.tenantHealth)}`}>{entry.tenantHealth}</div>
                              <div className="row-meta">
                                <span>{entry.launchStage} launch</span>
                                <span>สร้าง {formatDate(entry.tenant.createdAt)}</span>
                              </div>
                              <div className="row-meta">
                                <span>{entry.tenant.slug}</span>
                                <span>{entry.tenant.url}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <strong>ยังไม่มี tenant health board</strong>
                          <p>เมื่อมี tutor มากขึ้น ส่วนนี้จะเป็นฐานต่อยอด usage, license และ payment signals</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
          </div>
        </div>
      </section>
      ) : null}
      {isVideoManagerOpen ? (
                <div className="video-manager-backdrop" role="presentation" onClick={() => setIsVideoManagerOpen(false)}>
          <div
            className="video-manager-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-manager-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="video-manager-header">
              <div>
                <span className="section-label">จัดการวีดีโอ</span>
                <h3 id="video-manager-title">อัปโหลดและเช็กสถานะวิดีโอ</h3>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsVideoManagerOpen(false)}>
                ปิด
              </button>
            </div>
            <VideoUploadPanel
              flow={videoUploadFlow}
              selectedModule={selectedModule}
              selectedLessonTitle={selectedNode?.title || null}
              sessionReady={!!session}
              showHeader={false}
            />
          </div>
        </div>
      ) : null}
      {activeNoticeModal ? (
        <div
          className="video-manager-backdrop"
          role="presentation"
          onClick={assetUploadState?.stage === 'uploading' ? undefined : closeNoticeModal}
        >
          <div
            className="validation-modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-notice-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="video-manager-header">
              <div>
                <span className="section-label">{activeNoticeModal.label}</span>
                <h3 id="global-notice-modal-title">{activeNoticeModal.title}</h3>
              </div>
              {assetUploadState?.stage === 'uploading' ? null : (
                <button className="secondary-button" type="button" onClick={closeNoticeModal}>
                  ปิด
                </button>
              )}
            </div>
            {assetUploadState ? (
              <div className="upload-modal-meta">
                <div className="asset-meta-grid">
                  <div className="asset-meta-card">
                    <span>ไฟล์</span>
                    <strong>{assetUploadState.fileName || 'ยังไม่ระบุ'}</strong>
                    <small>ขนาด {formatBytes(assetUploadState.fileSize)}</small>
                  </div>
                  <div className="asset-meta-card">
                    <span>สถานะ</span>
                    <strong>
                      {assetUploadState.stage === 'uploading'
                        ? 'กำลังอัปโหลดไฟล์'
                        : assetUploadState.stage === 'finalizing'
                          ? 'กำลังอัปเดตข้อมูล'
                          : assetUploadState.stage === 'success'
                            ? 'อัปโหลดเสร็จแล้ว'
                            : 'เกิดข้อผิดพลาด'}
                    </strong>
                    <small>
                      {assetUploadState.stage === 'uploading'
                        ? 'หากเป็นไฟล์ใหญ่จะใช้เวลามากขึ้นตามขนาดไฟล์'
                        : assetUploadState.stage === 'finalizing'
                          ? 'กำลังรีเฟรชข้อมูลบทเรียนจาก server'
                          : assetUploadState.stage === 'success'
                            ? 'ปิดหน้าต่างนี้ได้เมื่ออ่านสถานะเสร็จ'
                            : 'ตรวจสอบข้อความผิดพลาดก่อนลองใหม่'}
                    </small>
                  </div>
                </div>
                <div className="video-progress-track" aria-hidden="true">
                  <span className="video-progress-fill" style={{ width: `${Math.max(0, Math.min(100, assetUploadState.progress))}%` }} />
                </div>
                <div className="upload-modal-progress-row">
                  <span>{Math.max(0, Math.min(100, assetUploadState.progress))}%</span>
                  <span>
                    {assetUploadState.stage === 'uploading'
                      ? 'กำลังอัปโหลด'
                      : assetUploadState.stage === 'finalizing'
                        ? 'กำลังสรุปผล'
                        : assetUploadState.stage === 'success'
                          ? 'เสร็จแล้ว'
                          : 'ไม่สำเร็จ'}
                  </span>
                </div>
              </div>
            ) : null}
            <p className="validation-modal-copy">{activeNoticeModal.message}</p>
            <div className="action-row action-row-quiet">
              {assetUploadState?.stage === 'uploading' ? (
                <button className="primary-button" type="button" disabled>
                  กำลังอัปโหลด
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={closeNoticeModal}>
                  {assetUploadState?.stage === 'success' ? 'เรียบร้อย' : 'รับทราบ'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
