import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { KnowledgeBaseJobProcessor } from './processors/knowledge-base-job.processor';
import { MediaJobProcessor } from './processors/media-job.processor';
import { NotificationDispatchJobProcessor } from './processors/notification-dispatch-job.processor';
import { NotificationsJobProcessor } from './processors/notifications-job.processor';
import { DispatchNotificationsJob, IngestKbDocumentJob, SchedulePlanRemindersJob, TranscribeVideoJob } from './job.types';
export declare class QueueBridgeService {
    private readonly configService;
    private readonly knowledgeBaseJobProcessor;
    private readonly mediaJobProcessor;
    private readonly notificationsJobProcessor;
    private readonly notificationDispatchJobProcessor;
    private readonly knowledgeBaseQueue;
    private readonly mediaQueue;
    private readonly notificationsQueue;
    constructor(configService: ConfigService, knowledgeBaseJobProcessor: KnowledgeBaseJobProcessor, mediaJobProcessor: MediaJobProcessor, notificationsJobProcessor: NotificationsJobProcessor, notificationDispatchJobProcessor: NotificationDispatchJobProcessor, knowledgeBaseQueue: Queue, mediaQueue: Queue, notificationsQueue: Queue);
    enqueueIngestDocument(job: IngestKbDocumentJob): Promise<{
        queue: string;
        jobName: "ingest-kb-document";
    }>;
    enqueueTranscribeVideo(job: TranscribeVideoJob): Promise<{
        queue: string;
        jobName: "transcribe-video";
    }>;
    enqueueSchedulePlanReminders(job: SchedulePlanRemindersJob): Promise<{
        queue: string;
        jobName: "schedule-plan-reminders";
    }>;
    enqueueDispatchNotifications(job?: DispatchNotificationsJob): Promise<{
        queue: string;
        jobName: "dispatch-notifications";
    }>;
    private isInline;
}
