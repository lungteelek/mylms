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
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const knowledge_base_repository_1 = require("../knowledge-base/knowledge-base.repository");
const ai_response_util_1 = require("./ai-response.util");
const openai_provider_1 = require("./openai.provider");
let AiService = class AiService {
    constructor(knowledgeBaseRepository, openAiProvider) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.openAiProvider = openAiProvider;
    }
    async askTutor(user, body) {
        const sessionId = await this.knowledgeBaseRepository.createOrReuseSession({
            userId: user.userId,
            sessionId: body.sessionId,
            courseId: body.courseId,
            lessonNodeId: body.lessonNodeId,
            mode: 'tutor',
        });
        await this.knowledgeBaseRepository.appendMessage({
            sessionId,
            role: 'user',
            content: body.question,
        });
        const queryEmbedding = await this.openAiProvider.createEmbedding(body.question);
        const chunks = await this.knowledgeBaseRepository.retrieveChunks({
            tenantId: user.tenantId,
            courseId: body.courseId,
            lessonNodeId: body.lessonNodeId,
            query: body.question,
            embedding: queryEmbedding,
            limit: 5,
        });
        const response = (await this.openAiProvider.generateTutorAnswer(body.question, chunks)) || (0, ai_response_util_1.buildTutorAnswer)(body.question, chunks);
        const assistantMessage = await this.knowledgeBaseRepository.appendMessage({
            sessionId,
            role: 'assistant',
            content: response.answer,
            citations: response.citations,
        });
        return {
            data: {
                sessionId,
                messageId: assistantMessage.id,
                answer: response.answer,
                citations: response.citations,
                usage: {
                    promptTokens: body.question.length,
                    completionTokens: response.answer.length,
                },
            },
        };
    }
    async summarize(user, body) {
        const chunks = await this.knowledgeBaseRepository.retrieveSummaryChunks({
            tenantId: user.tenantId,
            courseId: body.courseId,
            lessonNodeId: body.lessonNodeId,
            limit: 6,
        });
        const response = (await this.openAiProvider.generateSummary(chunks)) || (0, ai_response_util_1.buildSummary)(chunks);
        return {
            data: {
                summary: response.summary,
                citations: response.citations,
            },
        };
    }
    async generateExercises(user, body) {
        const chunks = await this.knowledgeBaseRepository.retrieveSummaryChunks({
            tenantId: user.tenantId,
            courseId: body.courseId,
            lessonNodeId: body.lessonNodeId,
            limit: 4,
        });
        const generated = (await this.openAiProvider.generateExercises(chunks, body.difficulty, body.count, body.type)) || null;
        const items = generated?.items || (0, ai_response_util_1.buildExercises)(chunks, body.difficulty, body.count);
        const citations = generated?.citations ||
            chunks.map((chunk) => ({
                documentId: chunk.documentId,
                chunkId: chunk.chunkId,
                title: chunk.title,
                excerpt: chunk.content.slice(0, 120),
            }));
        return {
            data: {
                items,
                citations,
            },
        };
    }
    async getSession(user, sessionId) {
        const messages = await this.knowledgeBaseRepository.getSessionMessages(user.userId, sessionId);
        return {
            data: {
                id: sessionId,
                mode: 'tutor',
                messages,
            },
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [knowledge_base_repository_1.KnowledgeBaseRepository,
        openai_provider_1.OpenAiProvider])
], AiService);
