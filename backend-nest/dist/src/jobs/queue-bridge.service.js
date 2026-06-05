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
const knowledge_base_job_processor_1 = require("./processors/knowledge-base-job.processor");
const media_job_processor_1 = require("./processors/media-job.processor");
const notification_dispatch_job_processor_1 = require("./processors/notification-dispatch-job.processor");
const notifications_job_processor_1 = require("./processors/notifications-job.processor");
const job_types_1 = require("./job.types");
let QueueBridgeService = class QueueBridgeService {
    constructor(configService, knowledgeBaseJobProcessor, mediaJobProcessor, notificationsJobProcessor, notificationDispatchJobProcessor, knowledgeBaseQueue, mediaQueue, notificationsQueue) {
        this.configService = configService;
        this.knowledgeBaseJobProcessor = knowledgeBaseJobProcessor;
        this.mediaJobProcessor = mediaJobProcessor;
        this.notificationsJobProcessor = notificationsJobProcessor;
        this.notificationDispatchJobProcessor = notificationDispatchJobProcessor;
        this.knowledgeBaseQueue = knowledgeBaseQueue;
        this.mediaQueue = mediaQueue;
        this.notificationsQueue = notificationsQueue;
    }
    async enqueueIngestDocument(job) {
        if (this.isInline()) {
            await this.knowledgeBaseJobProcessor.handleIngestDocument(job);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT };
        }
        await this.knowledgeBaseQueue.add(job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT, job);
        return { queue: job_types_1.JOB_QUEUES.KNOWLEDGE_BASE, jobName: job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT };
    }
    async enqueueTranscribeVideo(job) {
        if (this.isInline()) {
            await this.mediaJobProcessor.handleTranscribeVideo(job);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO };
        }
        await this.mediaQueue.add(job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO, job);
        return { queue: job_types_1.JOB_QUEUES.MEDIA, jobName: job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO };
    }
    async enqueueSchedulePlanReminders(job) {
        if (this.isInline()) {
            await this.notificationsJobProcessor.handleSchedulePlanReminders(job);
            return { queue: 'inline', jobName: job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
        }
        await this.notificationsQueue.add(job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS, job);
        return { queue: job_types_1.JOB_QUEUES.NOTIFICATIONS, jobName: job_types_1.JOB_NAMES.SCHEDULE_PLAN_REMINDERS };
    }
    async enqueueDispatchNotifications(job = {}) {
        if (this.isInline()) {
            await this.notificationDispatchJobProcessor.handleDispatch(job);
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
    __param(5, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.KNOWLEDGE_BASE)),
    __param(6, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.MEDIA)),
    __param(7, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.NOTIFICATIONS)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        knowledge_base_job_processor_1.KnowledgeBaseJobProcessor,
        media_job_processor_1.MediaJobProcessor,
        notifications_job_processor_1.NotificationsJobProcessor,
        notification_dispatch_job_processor_1.NotificationDispatchJobProcessor,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], QueueBridgeService);
