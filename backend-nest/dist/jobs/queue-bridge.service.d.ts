import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { KnowledgeBaseIngestionService } from '../knowledge-base/knowledge-base-ingestion.service';
import { MediaJobRunnerService } from '../media/media-job-runner.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchNotificationsJob, IngestKbDocumentJob, SchedulePlanRemindersJob, TranscribeVideoJob } from './job.types';
export declare class QueueBridgeService {
    private readonly configService;
    private readonly knowledgeBaseIngestionService;
    private readonly mediaJobRunnerService;
    private readonly notificationsService;
    private readonly knowledgeBaseQueue;
    private readonly mediaQueue;
    private readonly notificationsQueue;
    constructor(configService: ConfigService, knowledgeBaseIngestionService: KnowledgeBaseIngestionService, mediaJobRunnerService: MediaJobRunnerService, notificationsService: NotificationsService, knowledgeBaseQueue: Queue, mediaQueue: Queue, notificationsQueue: Queue);
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
