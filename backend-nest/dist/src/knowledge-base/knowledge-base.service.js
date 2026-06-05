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
exports.KnowledgeBaseService = void 0;
const common_1 = require("@nestjs/common");
const queue_bridge_service_1 = require("../jobs/queue-bridge.service");
const knowledge_base_ingestion_service_1 = require("./knowledge-base-ingestion.service");
const knowledge_base_repository_1 = require("./knowledge-base.repository");
let KnowledgeBaseService = class KnowledgeBaseService {
    constructor(knowledgeBaseRepository, queueBridgeService, knowledgeBaseIngestionService) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.queueBridgeService = queueBridgeService;
        this.knowledgeBaseIngestionService = knowledgeBaseIngestionService;
    }
    async listKnowledgeBases(user) {
        const items = await this.knowledgeBaseRepository.listKnowledgeBases(user.tenantId);
        return {
            data: {
                items,
            },
        };
    }
    async listDocuments(user, knowledgeBaseId) {
        const scope = await this.knowledgeBaseRepository.getKnowledgeBaseScope(knowledgeBaseId, user.tenantId);
        if (!scope) {
            return {
                data: {
                    items: [],
                },
            };
        }
        const items = await this.knowledgeBaseRepository.listDocuments(user.tenantId, knowledgeBaseId);
        return {
            data: {
                items,
            },
        };
    }
    async createKnowledgeBase(user, body) {
        const courseId = body.courseId?.trim() ? body.courseId.trim() : null;
        const result = await this.knowledgeBaseRepository.createKnowledgeBase({
            tenantId: user.tenantId,
            courseId,
            name: body.name,
            visibility: body.visibility,
        });
        return {
            data: {
                id: result.id,
                status: result.status,
                visibility: result.visibility,
            },
        };
    }
    async createDocument(_user, knowledgeBaseId, body) {
        const scope = await this.knowledgeBaseRepository.getKnowledgeBaseScope(knowledgeBaseId, _user.tenantId);
        if (!scope) {
            return {
                data: {
                    knowledgeBaseId,
                    documentId: null,
                    status: 'not_found',
                },
            };
        }
        const result = await this.knowledgeBaseRepository.createDocument(knowledgeBaseId, body);
        if (body.extractedText?.trim()) {
            await this.queueBridgeService.enqueueIngestDocument({
                documentId: result.documentId,
                fileText: body.extractedText,
            });
        }
        return {
            data: {
                knowledgeBaseId,
                documentId: result.documentId,
                status: result.status,
                ...body,
            },
        };
    }
    async bulkCreateDocuments(user, knowledgeBaseId, body) {
        const scope = await this.knowledgeBaseRepository.getKnowledgeBaseScope(knowledgeBaseId, user.tenantId);
        if (!scope) {
            return {
                data: {
                    knowledgeBaseId,
                    items: [],
                },
            };
        }
        const items = [];
        for (const document of body.documents || []) {
            const result = await this.knowledgeBaseRepository.createDocument(knowledgeBaseId, document);
            if (document.extractedText?.trim()) {
                await this.queueBridgeService.enqueueIngestDocument({
                    documentId: result.documentId,
                    fileText: document.extractedText,
                });
            }
            items.push({
                documentId: result.documentId,
                status: result.status,
                ...document,
            });
        }
        return {
            data: {
                knowledgeBaseId,
                items,
            },
        };
    }
    async ingestDocument(_user, documentId, body) {
        const scope = await this.knowledgeBaseRepository.getDocumentById(documentId);
        if (!scope || scope.tenantId !== _user.tenantId) {
            return {
                data: {
                    documentId,
                    status: 'not_found',
                },
            };
        }
        const result = await this.queueBridgeService.enqueueIngestDocument({
            documentId,
            fileText: body.fileText,
            localFilePath: body.localFilePath,
        });
        return {
            data: {
                documentId,
                status: 'queued',
                ...result,
            },
        };
    }
    async deleteDocument(user, documentId) {
        const scope = await this.knowledgeBaseRepository.getDocumentById(documentId);
        if (!scope || scope.tenantId !== user.tenantId) {
            return {
                data: {
                    documentId,
                    deleted: false,
                },
            };
        }
        await this.knowledgeBaseRepository.deleteDocument(documentId);
        return {
            data: {
                documentId,
                deleted: true,
            },
        };
    }
    async updateDocument(user, documentId, body) {
        const scope = await this.knowledgeBaseRepository.getDocumentById(documentId);
        if (!scope || scope.tenantId !== user.tenantId) {
            return {
                data: {
                    documentId,
                    updated: false,
                },
            };
        }
        await this.knowledgeBaseRepository.updateDocument(documentId, {
            lessonNodeId: body.lessonNodeId?.trim() || null,
            sourceType: body.sourceType ?? null,
            title: body.title?.trim() || null,
            fileUrl: body.fileUrl?.trim() || null,
            extractedText: body.extractedText ?? null,
        });
        return {
            data: {
                documentId,
                updated: true,
            },
        };
    }
};
exports.KnowledgeBaseService = KnowledgeBaseService;
exports.KnowledgeBaseService = KnowledgeBaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [knowledge_base_repository_1.KnowledgeBaseRepository,
        queue_bridge_service_1.QueueBridgeService,
        knowledge_base_ingestion_service_1.KnowledgeBaseIngestionService])
], KnowledgeBaseService);
