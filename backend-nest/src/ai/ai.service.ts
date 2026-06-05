import { Injectable } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { KnowledgeBaseRepository } from '../knowledge-base/knowledge-base.repository';
import { buildExercises, buildSummary, buildTutorAnswer } from './ai-response.util';
import { AskTutorDto } from './dto/ask-tutor.dto';
import { GenerateExercisesDto } from './dto/generate-exercises.dto';
import { SummaryDto } from './dto/summary.dto';
import { OpenAiProvider } from './openai.provider';

@Injectable()
export class AiService {
  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  async askTutor(user: RequestContext, body: AskTutorDto) {
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
    const response =
      (await this.openAiProvider.generateTutorAnswer(body.question, chunks)) || buildTutorAnswer(body.question, chunks);
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

  async summarize(user: RequestContext, body: SummaryDto) {
    const chunks = await this.knowledgeBaseRepository.retrieveSummaryChunks({
      tenantId: user.tenantId,
      courseId: body.courseId,
      lessonNodeId: body.lessonNodeId,
      limit: 6,
    });
    const response = (await this.openAiProvider.generateSummary(chunks)) || buildSummary(chunks);

    return {
      data: {
        summary: response.summary,
        citations: response.citations,
      },
    };
  }

  async generateExercises(user: RequestContext, body: GenerateExercisesDto) {
    const chunks = await this.knowledgeBaseRepository.retrieveSummaryChunks({
      tenantId: user.tenantId,
      courseId: body.courseId,
      lessonNodeId: body.lessonNodeId,
      limit: 4,
    });
    const generated =
      (await this.openAiProvider.generateExercises(chunks, body.difficulty, body.count, body.type)) || null;
    const items = generated?.items || buildExercises(chunks, body.difficulty, body.count);
    const citations =
      generated?.citations ||
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

  async getSession(user: RequestContext, sessionId: string) {
    const messages = await this.knowledgeBaseRepository.getSessionMessages(user.userId, sessionId);

    return {
      data: {
        id: sessionId,
        mode: 'tutor',
        messages,
      },
    };
  }
}
