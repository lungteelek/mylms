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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const queue_bridge_service_1 = require("../jobs/queue-bridge.service");
const media_repository_1 = require("./media.repository");
let MediaService = class MediaService {
    constructor(mediaRepository, queueBridgeService) {
        this.mediaRepository = mediaRepository;
        this.queueBridgeService = queueBridgeService;
    }
    async transcribeVideo(user, videoAssetId, body) {
        const enqueued = await this.queueBridgeService.enqueueTranscribeVideo({
            tenantId: user.tenantId,
            videoAssetId,
            language: body.language,
            sourceText: body.sourceText,
            audioFilePath: body.audioFilePath,
        });
        return {
            data: {
                videoAssetId,
                language: body.language || 'th',
                status: 'queued',
                ...enqueued,
            },
        };
    }
    async getTranscript(user, videoAssetId) {
        const transcript = await this.mediaRepository.getTranscript(user.tenantId, videoAssetId);
        return {
            data: transcript,
        };
    }
    async recordHeartbeat(user, body) {
        await this.mediaRepository.recordPlaybackHeartbeat({
            userId: user.userId,
            tenantId: user.tenantId,
            courseId: body.courseId,
            lessonNodeId: body.lessonNodeId,
            videoAssetId: body.videoAssetId,
            positionSeconds: body.positionSeconds,
            speed: body.speed ?? 1,
            deviceType: body.deviceType,
        });
        return {
            data: {
                ok: true,
                videoAssetId: body.videoAssetId,
                positionSeconds: body.positionSeconds,
            },
        };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository,
        queue_bridge_service_1.QueueBridgeService])
], MediaService);
