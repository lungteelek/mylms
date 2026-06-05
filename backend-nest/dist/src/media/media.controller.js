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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const media_service_1 = require("./media.service");
const playback_heartbeat_dto_1 = require("./dto/playback-heartbeat.dto");
const transcribe_video_dto_1 = require("./dto/transcribe-video.dto");
let MediaController = class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    transcribe(user, videoAssetId, body) {
        return this.mediaService.transcribeVideo(user, videoAssetId, body);
    }
    getTranscript(user, videoAssetId) {
        return this.mediaService.getTranscript(user, videoAssetId);
    }
    heartbeat(user, body) {
        return this.mediaService.recordHeartbeat(user, body);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('videos/:videoAssetId/transcribe'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('videoAssetId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, transcribe_video_dto_1.TranscribeVideoDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "transcribe", null);
__decorate([
    (0, common_1.Get)('videos/:videoAssetId/transcript'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('videoAssetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getTranscript", null);
__decorate([
    (0, common_1.Post)('progress/heartbeat'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, playback_heartbeat_dto_1.PlaybackHeartbeatDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "heartbeat", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
