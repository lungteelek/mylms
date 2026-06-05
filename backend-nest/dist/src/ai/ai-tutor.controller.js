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
exports.AiTutorController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const ai_service_1 = require("./ai.service");
const ask_tutor_dto_1 = require("./dto/ask-tutor.dto");
const generate_exercises_dto_1 = require("./dto/generate-exercises.dto");
const summary_dto_1 = require("./dto/summary.dto");
let AiTutorController = class AiTutorController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    askTutor(user, body) {
        return this.aiService.askTutor(user, body);
    }
    summarize(user, body) {
        return this.aiService.summarize(user, body);
    }
    generateExercises(user, body) {
        return this.aiService.generateExercises(user, body);
    }
    getSession(user, sessionId) {
        return this.aiService.getSession(user, sessionId);
    }
};
exports.AiTutorController = AiTutorController;
__decorate([
    (0, common_1.Post)('tutor/query'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ask_tutor_dto_1.AskTutorDto]),
    __metadata("design:returntype", void 0)
], AiTutorController.prototype, "askTutor", null);
__decorate([
    (0, common_1.Post)('tutor/summary'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, summary_dto_1.SummaryDto]),
    __metadata("design:returntype", void 0)
], AiTutorController.prototype, "summarize", null);
__decorate([
    (0, common_1.Post)('tutor/exercises'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_exercises_dto_1.GenerateExercisesDto]),
    __metadata("design:returntype", void 0)
], AiTutorController.prototype, "generateExercises", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AiTutorController.prototype, "getSession", null);
exports.AiTutorController = AiTutorController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiTutorController);
