"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const knowledge_base_module_1 = require("../knowledge-base/knowledge-base.module");
const ai_tutor_controller_1 = require("./ai-tutor.controller");
const ai_service_1 = require("./ai.service");
const openai_provider_1 = require("./openai.provider");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => knowledge_base_module_1.KnowledgeBaseModule)],
        controllers: [ai_tutor_controller_1.AiTutorController],
        providers: [ai_service_1.AiService, openai_provider_1.OpenAiProvider],
        exports: [openai_provider_1.OpenAiProvider],
    })
], AiModule);
