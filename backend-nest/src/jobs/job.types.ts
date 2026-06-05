export const JOB_QUEUES = {
  KNOWLEDGE_BASE: 'knowledge-base',
  MEDIA: 'media',
  NOTIFICATIONS: 'notifications',
} as const;

export const JOB_NAMES = {
  INGEST_KB_DOCUMENT: 'ingest-kb-document',
  TRANSCRIBE_VIDEO: 'transcribe-video',
  SCHEDULE_PLAN_REMINDERS: 'schedule-plan-reminders',
  DISPATCH_NOTIFICATIONS: 'dispatch-notifications',
} as const;

export type IngestKbDocumentJob = {
  documentId: string;
  fileText?: string;
  localFilePath?: string;
};

export type TranscribeVideoJob = {
  tenantId: string;
  videoAssetId: string;
  language?: string;
  sourceText?: string;
  audioFilePath?: string;
};

export type SchedulePlanRemindersJob = {
  userId: string;
  studyPlanId: string;
};

export type DispatchNotificationsJob = {
  limit?: number;
};
