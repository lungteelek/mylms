export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string | null;
  subject?: string | null;
  level?: string | null;
  enrollmentCount?: number;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

export type LessonNodeRow = {
  id: string;
  parentId: string | null;
  nodeType: 'section' | 'lesson' | 'quiz' | 'assignment';
  title: string;
  path: string;
  depth: number;
  sortOrder: number;
  estimatedMinutes: number;
  isPublished: boolean;
  videoUrl?: string | null;
  videoStatus?: 'uploading' | 'processing' | 'ready' | 'failed' | null;
  videoAssetId?: string | null;
  videoMediaId?: string | null;
  videoHlsUrl?: string | null;
  videoPosterUrl?: string | null;
};

export type LessonAssetRow = {
  id: string;
  lessonNodeId: string;
  assetType: 'pdf' | 'link' | 'image' | 'attachment';
  title: string;
  fileUrl: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type LessonTranscriptSegment = {
  seek: string;
  progress: number;
  text: string;
};

export type LessonTranscriptRow = {
  lessonNodeId: string;
  language: string;
  status: 'ready' | 'processing' | 'failed' | 'uploading';
  fullText: string | null;
  segments: LessonTranscriptSegment[];
};

export type LessonNodeAsset = {
  id?: string;
  type: 'pdf' | 'url' | 'image' | 'attachment' | 'none';
  fileName: string;
  url: string;
  fileUrl?: string;
  externalUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type LessonNodeAssetItem = LessonNodeAsset & {
  id: string;
  title: string;
  assetType: LessonAssetRow['assetType'];
};

export type LessonNodeTree = LessonNodeRow & {
  children: LessonNodeTree[];
  asset?: LessonNodeAsset;
  assets?: LessonNodeAssetItem[];
  transcriptSegments?: LessonTranscriptSegment[];
  transcriptLanguage?: string;
  transcriptStatus?: LessonTranscriptRow['status'];
  transcriptFullText?: string | null;
};
