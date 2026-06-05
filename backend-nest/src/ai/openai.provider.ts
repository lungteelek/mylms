import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { RetrievedChunk } from '../knowledge-base/types/knowledge-base.types';

type TutorCitation = {
  documentId: string;
  chunkId: string;
  title?: string;
  excerpt?: string;
};

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;
  private readonly responsesModel: string;
  private readonly transcriptionModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openAiApiKey');
    this.responsesModel = this.configService.get<string>('ai.openAiResponsesModel') || 'gpt-4.1-mini';
    this.transcriptionModel =
      this.configService.get<string>('ai.openAiTranscriptionModel') || 'gpt-4o-mini-transcribe';
    this.embeddingModel = this.configService.get<string>('ai.openAiEmbeddingModel') || 'text-embedding-3-small';
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isEnabled() {
    return !!this.client;
  }

  async generateTutorAnswer(question: string, chunks: RetrievedChunk[]) {
    if (!this.client) {
      return null;
    }

    const context = this.serializeChunks(chunks);
    const response = await this.client.responses.create({
      model: this.responsesModel,
      input: [
        {
          role: 'system',
          content:
            'Answer only from the supplied knowledge base context. If the context is insufficient, say so. Return JSON.',
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

    return this.safeParseJson<{ answer: string; citations: TutorCitation[] }>(response.output_text);
  }

  async generateSummary(chunks: RetrievedChunk[]) {
    if (!this.client) {
      return null;
    }

    const response = await this.client.responses.create({
      model: this.responsesModel,
      input: [
        {
          role: 'system',
          content:
            'Summarize only from the supplied knowledge base context. Return JSON with a bullet list and citations.',
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

    return this.safeParseJson<{ summary: string[]; citations: TutorCitation[] }>(response.output_text);
  }

  async generateExercises(chunks: RetrievedChunk[], difficulty: string, count: number, type: string) {
    if (!this.client) {
      return null;
    }

    const response = await this.client.responses.create({
      model: this.responsesModel,
      input: [
        {
          role: 'system',
          content:
            'Generate exercises only from the supplied knowledge base context. Return valid JSON.',
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

    return this.safeParseJson<{
      items: Array<{ question: string; choices: string[]; answer: number; explanation: string }>;
      citations: TutorCitation[];
    }>(response.output_text);
  }

  async transcribeAudioFile(audioFilePath: string, language?: string) {
    if (!this.client) {
      return null;
    }

    try {
      const transcription = await this.client.audio.transcriptions.create({
        file: createReadStream(audioFilePath),
        model: this.transcriptionModel,
        language,
        response_format: 'text',
      });

      return typeof transcription === 'string' ? transcription : null;
    } catch (error) {
      this.logger.warn(`OpenAI transcription failed for ${audioFilePath}: ${String(error)}`);
      return null;
    }
  }

  async createEmbedding(input: string) {
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

  private serializeChunks(chunks: RetrievedChunk[]) {
    return chunks
      .map(
        (chunk) =>
          `[documentId=${chunk.documentId}; chunkId=${chunk.chunkId}; title=${chunk.title}] ${chunk.content}`,
      )
      .join('\n\n');
  }

  private safeParseJson<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse OpenAI JSON response: ${String(error)}`);
      return null;
    }
  }
}
