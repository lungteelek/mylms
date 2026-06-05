import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { KnowledgeBaseIngestionService } from '../knowledge-base/knowledge-base-ingestion.service';
import { MediaJobRunnerService } from '../media/media-job-runner.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DispatchNotificationsJob,
  IngestKbDocumentJob,
  SchedulePlanRemindersJob,
  TranscribeVideoJob,
  JOB_NAMES,
  JOB_QUEUES,
} from './job.types';

@Injectable()
export class QueueBridgeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly knowledgeBaseIngestionService: KnowledgeBaseIngestionService,
    private readonly mediaJobRunnerService: MediaJobRunnerService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(JOB_QUEUES.KNOWLEDGE_BASE) private readonly knowledgeBaseQueue: Queue,
    @InjectQueue(JOB_QUEUES.MEDIA) private readonly mediaQueue: Queue,
    @InjectQueue(JOB_QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  async enqueueIngestDocument(job: IngestKbDocumentJob) {
    if (this.isInline()) {
      await this.knowledgeBaseIngestionService.ingestDocument(job.documentId, {
        fileText: job.fileText,
        localFilePath: job.localFilePath,
      });
      return { queue: 'inline', jobName: JOB_NAMES.INGEST_KB_DOCUMENT };
    }

    await this.knowledgeBaseQueue.add(JOB_NAMES.INGEST_KB_DOCUMENT, job);
    return { queue: JOB_QUEUES.KNOWLEDGE_BASE, jobName: JOB_NAMES.INGEST_KB_DOCUMENT };
  }

  async enqueueTranscribeVideo(job: TranscribeVideoJob) {
    if (this.isInline()) {
      await this.mediaJobRunnerService.runTranscriptPipeline(job);
      return { queue: 'inline', jobName: JOB_NAMES.TRANSCRIBE_VIDEO };
    }

    await this.mediaQueue.add(JOB_NAMES.TRANSCRIBE_VIDEO, job);
    return { queue: JOB_QUEUES.MEDIA, jobName: JOB_NAMES.TRANSCRIBE_VIDEO };
  }

  async enqueueSchedulePlanReminders(job: SchedulePlanRemindersJob) {
    if (this.isInline()) {
      await this.notificationsService.scheduleStudyPlanReminders(job.userId, job.studyPlanId);
      return { queue: 'inline', jobName: JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
    }

    await this.notificationsQueue.add(JOB_NAMES.SCHEDULE_PLAN_REMINDERS, job);
    return { queue: JOB_QUEUES.NOTIFICATIONS, jobName: JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
  }

  async enqueueDispatchNotifications(job: DispatchNotificationsJob = {}) {
    if (this.isInline()) {
      await this.notificationsService.dispatchDueNotifications(job.limit ?? 100);
      return { queue: 'inline', jobName: JOB_NAMES.DISPATCH_NOTIFICATIONS };
    }

    await this.notificationsQueue.add(JOB_NAMES.DISPATCH_NOTIFICATIONS, job);
    return { queue: JOB_QUEUES.NOTIFICATIONS, jobName: JOB_NAMES.DISPATCH_NOTIFICATIONS };
  }

  private isInline() {
    return this.configService.get<string>('queue.driver') !== 'bullmq';
  }
}
