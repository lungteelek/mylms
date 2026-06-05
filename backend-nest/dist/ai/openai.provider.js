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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenAiProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const fs_1 = require("fs");
let OpenAiProvider = OpenAiProvider_1 = class OpenAiProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OpenAiProvider_1.name);
        const apiKey = this.configService.get('ai.openAiApiKey');
        this.responsesModel = this.configService.get('ai.openAiResponsesModel') || 'gpt-4.1-mini';
        this.transcriptionModel =
            this.configService.get('ai.openAiTranscriptionModel') || 'gpt-4o-mini-transcribe';
        this.embeddingModel = this.configService.get('ai.openAiEmbeddingModel') || 'text-embedding-3-small';
        this.client = apiKey ? new openai_1.default({ apiKey }) : null;
    }
    isEnabled() {
        return !!this.client;
    }
    async generateTutorAnswer(question, chunks) {
        if (!this.client) {
            return null;
        }
        const context = this.serializeChunks(chunks);
        const response = await this.client.responses.create({
            model: this.responsesModel,
            input: [
                {
                    role: 'system',
                    content: 'Answer only from the supplied knowledge base context. If the context is insufficient, say so. Return JSON.',
                },
                {
                    role: 'user',
                    content: `QUESTION:\n${question}\n\nCONTEXT:\n${context}`,
                },
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: 'tutor_answer',
                    strict: true,
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            answer: { type: 'string' },
                            citations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        documentId: { type: 'string' },
                                        chunkId: { type: 'string' },
                                        title: { type: 'string' },
                                        excerpt: { type: 'string' },
                                    },
                                    required: ['documentId', 'chunkId', 'title', 'excerpt'],
                                },
                            },
                        },
                        required: ['answer', 'citations'],
                    },
                },
            },
        });
        return this.safeParseJson(response.output_text);
    }
    async generateSummary(chunks) {
        if (!this.client) {
            return null;
        }
        const response = await this.client.responses.create({
            model: this.responsesModel,
            input: [
                {
                    role: 'system',
                    content: 'Summarize only from the supplied knowledge base context. Return JSON with a bullet list and citations.',
                },
                {
                    role: 'user',
                    content: `CONTEXT:\n${this.serializeChunks(chunks)}`,
                },
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: 'lesson_summary',
                    strict: true,
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            summary: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                            citations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        documentId: { type: 'string' },
                                        chunkId: { type: 'string' },
                                        title: { type: 'string' },
                                        excerpt: { type: 'string' },
                                    },
                                    required: ['documentId', 'chunkId', 'title', 'excerpt'],
                                },
                            },
                        },
                        required: ['summary', 'citations'],
                    },
                },
            },
        });
        return this.safeParseJson(response.output_text);
    }
    async generateExercises(chunks, difficulty, count, type) {
        if (!this.client) {
            return null;
        }
        const response = await this.client.responses.create({
            model: this.responsesModel,
            input: [
                {
                    role: 'system',
                    content: 'Generate exercises only from the supplied knowledge base context. Return valid JSON.',
                },
                {
                    role: 'user',
                    content: `DIFFICULTY: ${difficulty}\nTYPE: ${type}\nCOUNT: ${count}\n\nCONTEXT:\n${this.serializeChunks(chunks)}`,
                },
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: 'generated_exercises',
                    strict: true,
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        question: { type: 'string' },
                                        choices: {
                                            type: 'array',
                                            items: { type: 'string' },
                                        },
                                        answer: { type: 'integer' },
                                        explanation: { type: 'string' },
                                    },
                                    required: ['question', 'choices', 'answer', 'explanation'],
                                },
                            },
                            citations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        documentId: { type: 'string' },
                                        chunkId: { type: 'string' },
                                        title: { type: 'string' },
                                        excerpt: { type: 'string' },
                                    },
                                    required: ['documentId', 'chunkId', 'title', 'excerpt'],
                                },
                            },
                        },
                        required: ['items', 'citations'],
                    },
                },
            },
        });
        return this.safeParseJson(response.output_text);
    }
    async transcribeAudioFile(audioFilePath, language) {
        if (!this.client) {
            return null;
        }
        try {
            const transcription = await this.client.audio.transcriptions.create({
                file: (0, fs_1.createReadStream)(audioFilePath),
                model: this.transcriptionModel,
                language,
                response_format: 'text',
            });
            return typeof transcription === 'string' ? transcription : null;
        }
        catch (error) {
            this.logger.warn(`OpenAI transcription failed for ${audioFilePath}: ${String(error)}`);
            return null;
        }
    }
    async createEmbedding(input) {
        if (!this.client) {
            return null;
        }
        const response = await this.client.embeddings.create({
            model: this.embeddingModel,
            input,
            encoding_format: 'float',
        });
        return response.data[0]?.embedding || null;
    }
    serializeChunks(chunks) {
        return chunks
            .map((chunk) => `[documentId=${chunk.documentId}; chunkId=${chunk.chunkId}; title=${chunk.title}] ${chunk.content}`)
            .join('\n\n');
    }
    safeParseJson(value) {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            this.logger.warn(`Failed to parse OpenAI JSON response: ${String(error)}`);
            return null;
        }
    }
};
exports.OpenAiProvider = OpenAiProvider;
exports.OpenAiProvider = OpenAiProvider = OpenAiProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAiProvider);
