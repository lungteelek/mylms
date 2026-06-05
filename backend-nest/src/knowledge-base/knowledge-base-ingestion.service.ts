import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAiProvider } from '../ai/openai.provider';
import { chunkText } from './chunking.util';
import { parseDocumentText } from './document-parser.util';
import { KnowledgeBaseRepository } from './knowledge-base.repository';

@Injectable()
export class KnowledgeBaseIngestionService {
  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  async ingestDocument(documentId: string, input: { fileText?: string; localFilePath?: string }) {
    const document = await this.knowledgeBaseRepository.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException('Knowledge base document not found');
    }

    const extractedText = parseDocumentText({
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

    const textChunks = chunkText(extractedText);
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
}
