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
exports.KnowledgeBaseJobProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const knowledge_base_ingestion_service_1 = require("../../knowledge-base/knowledge-base-ingestion.service");
const job_types_1 = require("../job.types");
let KnowledgeBaseJobProcessor = class KnowledgeBaseJobProcessor extends bullmq_1.WorkerHost {
    constructor(knowledgeBaseIngestionService) {
        super();
        this.knowledgeBaseIngestionService = knowledgeBaseIngestionService;
    }
    async process(job) {
        if (job.name !== job_types_1.JOB_NAMES.INGEST_KB_DOCUMENT) {
            return;
        }
        return this.handleIngestDocument(job.data);
    }
    async handleIngestDocument(data) {
        return this.knowledgeBaseIngestionService.ingestDocument(data.documentId, {
            fileText: data.fileText,
            localFilePath: data.localFilePath,
        });
    }
};
exports.KnowledgeBaseJobProcessor = KnowledgeBaseJobProcessor;
exports.KnowledgeBaseJobProcessor = KnowledgeBaseJobProcessor = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(job_types_1.JOB_QUEUES.KNOWLEDGE_BASE),
    __metadata("design:paramtypes", [knowledge_base_ingestion_service_1.KnowledgeBaseIngestionService])
], KnowledgeBaseJobProcessor);
