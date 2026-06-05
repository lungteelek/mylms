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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaJobProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const media_job_runner_service_1 = require("../../media/media-job-runner.service");
const job_types_1 = require("../job.types");
let MediaJobProcessor = class MediaJobProcessor extends bullmq_1.WorkerHost {
    constructor(mediaJobRunnerService) {
        super();
        this.mediaJobRunnerService = mediaJobRunnerService;
    }
    async process(job) {
        if (job.name !== job_types_1.JOB_NAMES.TRANSCRIBE_VIDEO) {
            return;
        }
        return this.handleTranscribeVideo(job.data);
    }
    async handleTranscribeVideo(data) {
        return this.mediaJobRunnerService.runTranscriptPipeline(data);
    }
};
exports.MediaJobProcessor = MediaJobProcessor;
exports.MediaJobProcessor = MediaJobProcessor = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(job_types_1.JOB_QUEUES.MEDIA),
    __metadata("design:paramtypes", [media_job_runner_service_1.MediaJobRunnerService])
], MediaJobProcessor);
