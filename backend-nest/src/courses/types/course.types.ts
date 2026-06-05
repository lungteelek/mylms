export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
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
  type: 'pdf' | 'url' | 'none';
  fileName: string;
  url: string;
  fileUrl?: string;
  externalUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type LessonNodeTree = LessonNodeRow & {
  children: LessonNodeTree[];
  asset?: LessonNodeAsset;
  transcriptSegments?: LessonTranscriptSegment[];
  transcriptLanguage?: string;
  transcriptStatus?: LessonTranscriptRow['status'];
  transcriptFullText?: string | null;
};
