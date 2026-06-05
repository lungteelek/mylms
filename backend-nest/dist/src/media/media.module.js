"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaModule = void 0;
const common_1 = require("@nestjs/common");
const ai_module_1 = require("../ai/ai.module");
const media_controller_1 = require("./media.controller");
const media_job_runner_service_1 = require("./media-job-runner.service");
const media_repository_1 = require("./media.repository");
const media_service_1 = require("./media.service");
let MediaModule = class MediaModule {
};
exports.MediaModule = MediaModule;
exports.MediaModule = MediaModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule],
        controllers: [media_controller_1.MediaController],
        providers: [media_service_1.MediaService, media_repository_1.MediaRepository, media_job_runner_service_1.MediaJobRunnerService],
        exports: [media_service_1.MediaService, media_repository_1.MediaRepository, media_job_runner_service_1.MediaJobRunnerService],
    })
], MediaModule);
