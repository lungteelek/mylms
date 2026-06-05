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
var NotificationSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSchedulerService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_2 = require("bullmq");
const job_types_1 = require("./job.types");
let NotificationSchedulerService = NotificationSchedulerService_1 = class NotificationSchedulerService {
    constructor(configService, notificationsQueue) {
        this.configService = configService;
        this.notificationsQueue = notificationsQueue;
        this.logger = new common_1.Logger(NotificationSchedulerService_1.name);
    }
    async onModuleInit() {
        if (this.configService.get('queue.driver') !== 'bullmq') {
            this.logger.log('QUEUE_DRIVER is not bullmq, skipping recurring notification dispatch registration');
            return;
        }
        await this.notificationsQueue.upsertJobScheduler(job_types_1.JOB_NAMES.DISPATCH_NOTIFICATIONS, {
            every: 60_000,
        }, {
            name: job_types_1.JOB_NAMES.DISPATCH_NOTIFICATIONS,
            data: {
                limit: 100,
            },
        });
        this.logger.log('Registered recurring notification dispatch job every 60 seconds');
    }
};
exports.NotificationSchedulerService = NotificationSchedulerService;
exports.NotificationSchedulerService = NotificationSchedulerService = NotificationSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)(job_types_1.JOB_QUEUES.NOTIFICATIONS)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        bullmq_2.Queue])
], NotificationSchedulerService);
