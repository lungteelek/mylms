"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseModule = void 0;
const common_1 = require("@nestjs/common");
const ai_module_1 = require("../ai/ai.module");
const knowledge_base_controller_1 = require("./knowledge-base.controller");
const knowledge_base_ingestion_service_1 = require("./knowledge-base-ingestion.service");
const knowledge_base_repository_1 = require("./knowledge-base.repository");
const knowledge_base_service_1 = require("./knowledge-base.service");
let KnowledgeBaseModule = class KnowledgeBaseModule {
};
exports.KnowledgeBaseModule = KnowledgeBaseModule;
exports.KnowledgeBaseModule = KnowledgeBaseModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => ai_module_1.AiModule)],
        controllers: [knowledge_base_controller_1.KnowledgeBaseController],
        providers: [knowledge_base_service_1.KnowledgeBaseService, knowledge_base_repository_1.KnowledgeBaseRepository, knowledge_base_ingestion_service_1.KnowledgeBaseIngestionService],
        exports: [knowledge_base_service_1.KnowledgeBaseService, knowledge_base_repository_1.KnowledgeBaseRepository, knowledge_base_ingestion_service_1.KnowledgeBaseIngestionService],
    })
], KnowledgeBaseModule);
