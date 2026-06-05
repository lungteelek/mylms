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
exports.LessonNodesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const lesson_nodes_service_1 = require("./lesson-nodes.service");
const create_lesson_node_dto_1 = require("./dto/create-lesson-node.dto");
const create_lesson_asset_dto_1 = require("./dto/create-lesson-asset.dto");
const create_video_upload_url_dto_1 = require("./dto/create-video-upload-url.dto");
const update_lesson_node_dto_1 = require("./dto/update-lesson-node.dto");
const upsert_lesson_content_dto_1 = require("./dto/upsert-lesson-content.dto");
const upsert_lesson_transcript_dto_1 = require("./dto/upsert-lesson-transcript.dto");
let LessonNodesController = class LessonNodesController {
    constructor(lessonNodesService) {
        this.lessonNodesService = lessonNodesService;
    }
    createNode(user, courseId, body) {
        return this.lessonNodesService.createNode(user, courseId, body);
    }
    updateNode(user, lessonNodeId, body) {
        return this.lessonNodesService.updateNode(user, lessonNodeId, body);
    }
    upsertContent(user, lessonNodeId, body) {
        return this.lessonNodesService.upsertContent(user, lessonNodeId, body);
    }
    upsertTranscript(user, lessonNodeId, body) {
        return this.lessonNodesService.upsertTranscript(user, lessonNodeId, body);
    }
    createAsset(user, lessonNodeId, body) {
        return this.lessonNodesService.createAsset(user, lessonNodeId, body);
    }
    createUploadUrl(user, lessonNodeId, body) {
        return this.lessonNodesService.createUploadUrl(user, lessonNodeId, body);
    }
    deleteNode(user, lessonNodeId) {
        return this.lessonNodesService.deleteNode(user, lessonNodeId);
    }
};
exports.LessonNodesController = LessonNodesController;
__decorate([
    (0, common_1.Post)('courses/:courseId/nodes'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_lesson_node_dto_1.CreateLessonNodeDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "createNode", null);
__decorate([
    (0, common_1.Patch)('lesson-nodes/:lessonNodeId'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_lesson_node_dto_1.UpdateLessonNodeDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "updateNode", null);
__decorate([
    (0, common_1.Put)('lesson-nodes/:lessonNodeId/content'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_lesson_content_dto_1.UpsertLessonContentDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "upsertContent", null);
__decorate([
    (0, common_1.Put)('lesson-nodes/:lessonNodeId/transcript'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_lesson_transcript_dto_1.UpsertLessonTranscriptDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "upsertTranscript", null);
__decorate([
    (0, common_1.Post)('lesson-nodes/:lessonNodeId/assets'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_lesson_asset_dto_1.CreateLessonAssetDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "createAsset", null);
__decorate([
    (0, common_1.Post)('lesson-nodes/:lessonNodeId/videos/upload-url'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_video_upload_url_dto_1.CreateVideoUploadUrlDto]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "createUploadUrl", null);
__decorate([
    (0, common_1.Delete)('lesson-nodes/:lessonNodeId'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonNodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LessonNodesController.prototype, "deleteNode", null);
exports.LessonNodesController = LessonNodesController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [lesson_nodes_service_1.LessonNodesService])
], LessonNodesController);
