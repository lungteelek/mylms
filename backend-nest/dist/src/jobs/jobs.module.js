"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const queue_bridge_service_1 = require("./queue-bridge.service");
const notification_scheduler_service_1 = require("./notification-scheduler.service");
const knowledge_base_job_processor_1 = require("./processors/knowledge-base-job.processor");
const media_job_processor_1 = require("./processors/media-job.processor");
const notification_dispatch_job_processor_1 = require("./processors/notification-dispatch-job.processor");
const notifications_job_processor_1 = require("./processors/notifications-job.processor");
const job_types_1 = require("./job.types");
const notifications_module_1 = require("../notifications/notifications.module");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            notifications_module_1.NotificationsModule,
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: () => ({
                    connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: job_types_1.JOB_QUEUES.KNOWLEDGE_BASE }, { name: job_types_1.JOB_QUEUES.MEDIA }, { name: job_types_1.JOB_QUEUES.NOTIFICATIONS }),
        ],
        providers: [
            queue_bridge_service_1.QueueBridgeService,
            notification_scheduler_service_1.NotificationSchedulerService,
            knowledge_base_job_processor_1.KnowledgeBaseJobProcessor,
            media_job_processor_1.MediaJobProcessor,
            notifications_job_processor_1.NotificationsJobProcessor,
            notification_dispatch_job_processor_1.NotificationDispatchJobProcessor,
        ],
        exports: [queue_bridge_service_1.QueueBridgeService],
    })
], JobsModule);
