export declare const JOB_QUEUES: {
    readonly KNOWLEDGE_BASE: "knowledge-base";
    readonly MEDIA: "media";
    readonly NOTIFICATIONS: "notifications";
};
export declare const JOB_NAMES: {
    readonly INGEST_KB_DOCUMENT: "ingest-kb-document";
    readonly TRANSCRIBE_VIDEO: "transcribe-video";
    readonly SCHEDULE_PLAN_REMINDERS: "schedule-plan-reminders";
    readonly DISPATCH_NOTIFICATIONS: "dispatch-notifications";
};
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
