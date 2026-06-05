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
exports.KnowledgeBaseIngestionService = void 0;
const common_1 = require("@nestjs/common");
const openai_provider_1 = require("../ai/openai.provider");
const chunking_util_1 = require("./chunking.util");
const document_parser_util_1 = require("./document-parser.util");
const knowledge_base_repository_1 = require("./knowledge-base.repository");
let KnowledgeBaseIngestionService = class KnowledgeBaseIngestionService {
    constructor(knowledgeBaseRepository, openAiProvider) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.openAiProvider = openAiProvider;
    }
    async ingestDocument(documentId, input) {
        const document = await this.knowledgeBaseRepository.getDocumentById(documentId);
        if (!document) {
            throw new common_1.NotFoundException('Knowledge base document not found');
        }
        const extractedText = (0, document_parser_util_1.parseDocumentText)({
            sourceType: document.sourceType,
            fileText: input.fileText ?? document.extractedText,
            localFilePath: input.localFilePath,
        });
        if (!extractedText) {
            await this.knowledgeBaseRepository.updateDocumentStatus(documentId, 'failed', document.extractedText || null);
            return {
                documentId,
                status: 'failed',
                chunksCreated: 0,
            };
        }
        await this.knowledgeBaseRepository.updateDocumentStatus(documentId, 'processing', extractedText);
        await this.knowledgeBaseRepository.deleteChunksByDocumentId(documentId);
        const textChunks = (0, chunking_util_1.chunkText)(extractedText);
        const chunks = [];
        for (const chunk of textChunks) {
            const embedding = await this.openAiProvider.createEmbedding(chunk);
            chunks.push({
                content: chunk,
                embedding,
            });
        }
        await this.knowledgeBaseRepository.createChunks({
            documentId,
            tenantId: document.tenantId,
            courseId: document.courseId,
            lessonNodeId: document.lessonNodeId,
            chunks,
        });
        await this.knowledgeBaseRepository.updateDocumentStatus(documentId, 'ready', extractedText);
        return {
            documentId,
            status: 'ready',
            chunksCreated: chunks.length,
        };
    }
};
exports.KnowledgeBaseIngestionService = KnowledgeBaseIngestionService;
exports.KnowledgeBaseIngestionService = KnowledgeBaseIngestionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [knowledge_base_repository_1.KnowledgeBaseRepository,
        openai_provider_1.OpenAiProvider])
], KnowledgeBaseIngestionService);
