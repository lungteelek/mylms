import { Injectable } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { QueueBridgeService } from '../jobs/queue-bridge.service';
import { KnowledgeBaseIngestionService } from './knowledge-base-ingestion.service';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { BulkCreateKnowledgeBaseDocumentsDto } from './dto/bulk-create-knowledge-base-documents.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { UpdateKnowledgeBaseDocumentDto } from './dto/update-knowledge-base-document.dto';
import { UploadKnowledgeBaseDocumentDto } from './dto/upload-knowledge-base-document.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly queueBridgeService: QueueBridgeService,
    private readonly knowledgeBaseIngestionService: KnowledgeBaseIngestionService,
  ) {}

  async listKnowledgeBases(user: RequestContext) {
    const items = await this.knowledgeBaseRepository.listKnowledgeBases(user.tenantId);
    return {
      data: {
        items,
      },
    };
  }

  async listDocuments(user: RequestContext, knowledgeBaseId: string) {
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

  async createKnowledgeBase(user: RequestContext, body: CreateKnowledgeBaseDto) {
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

  async createDocument(_user: RequestContext, knowledgeBaseId: string, body: UploadKnowledgeBaseDocumentDto) {
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

  async bulkCreateDocuments(user: RequestContext, knowledgeBaseId: string, body: BulkCreateKnowledgeBaseDocumentsDto) {
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

  async ingestDocument(_user: RequestContext, documentId: string, body: IngestDocumentDto) {
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

  async deleteDocument(user: RequestContext, documentId: string) {
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

  async updateDocument(user: RequestContext, documentId: string, body: UpdateKnowledgeBaseDocumentDto) {
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
}
