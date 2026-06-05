"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueBridgeService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_2 = require("bullmq");
const knowledge_base_ingestion_service_1 = require("../knowledge-base/knowledge-base-ingestion.service");
const media_job_runner_service_1 = require("../media/media-job-runner.service");
const notifications_service_1 = require("../notifications/notifications.service");
const job_types_1 = require("./job.types");
let QueueBridgeService = class QueueBridgeService {
    constructor(configService, knowledgeBaseIngestionService, mediaJobRunnerService, notificationsService, knowledgeBaseQueue, mediaQueue, notificationsQueue) {
        this.configService = configService;
        this.knowledgeBaseIngestionService = knowledgeBaseIngestionService;
        this.mediaJobRunnerService = mediaJobRunnerService;
        this.notificationsService = notificationsService;
        this.knowledgeBaseQueue = knowledgeBaseQueue;
        this.mediaQueue = mediaQueue;
        this.notificationsQueue = notificationsQueue;
    }
    async enqueueIngestDocument(job) {
        if (this.isInline()) {
            await this.knowledgeBaseIngestionService.ingestDocument(job.documentId, {
                fileText: job.fileText,
                localFilePath: job.localFilePath,
            });
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT };
        }
        await this.knowledgeBaseQueue.add(job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT, job);
        return { queue: job_types_1.JOB_QUEUES.KNOWLEDGE_BASE, jobName: job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT };
    }
    async enqueueTranscribeVideo(job) {
        if (this.isInline()) {
            await this.mediaJobRunnerService.runTranscriptPipeline(job);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO };
        }
        await this.mediaQueue.add(job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO, job);
        return { queue: job_types_1.JOB_QUEUES.MEDIA, jobName: job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO };
    }
    async enqueueSchedulePlanReminders(job) {
        if (this.isInline()) {
            await this.notificationsService.scheduleStudyPlanReminders(job.userId, job.studyPlanId);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
        }
        await this.notificationsQueue.add(job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS, job);
        return { queue: job_types_1.JOB_QUEUES.NOTIFICATIONS, jobName: job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
    }
    async enqueueDispatchNotifications(job = {}) {
        if (this.isInline()) {
            await this.notificationsService.dispatchDueNotifications(job.limit ?? 100);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.DISPATCH_NOTIFICATIONS };
        }
        await this.notificationsQueue.add(job_types_1.JOB_NAMES.DISPATCH_NOTIFICATIONS, job);
        return { queue: job_types_1.JOB_QUEUES.NOTIFICATIONS, jobName: job_types_1.JOB_NAMES.DISPATCH_NOTIFICATIONS };
    }
    isInline() {
        return this.configService.get('queue.driver') !== 'bullmq';
    }
};
exports.QueueBridgeService = QueueBridgeService;
exports.QueueBridgeService = QueueBridgeService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.KNOWLEDGE_BASE)),
    __param(5, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.MEDIA)),
    __param(6, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.NOTIFICATIONS)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        knowledge_base_ingestion_service_1.KnowledgeBaseIngestionService,
        media_job_runner_service_1.MediaJobRunnerService,
        notifications_service_1.NotificationsService,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], QueueBridgeService);
