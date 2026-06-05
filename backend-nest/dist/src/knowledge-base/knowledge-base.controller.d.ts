import { RequestContext } from '../common/types/request-context.type';
import { BulkCreateKnowledgeBaseDocumentsDto } from './dto/bulk-create-knowledge-base-documents.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDocumentDto } from './dto/update-knowledge-base-document.dto';
import { UploadKnowledgeBaseDocumentDto } from './dto/upload-knowledge-base-document.dto';
export declare class KnowledgeBaseController {
    private readonly knowledgeBaseService;
    constructor(knowledgeBaseService: KnowledgeBaseService);
    listKnowledgeBases(user: RequestContext): Promise<{
        data: {
            items: {
                id: string;
                tenantId: string;
                courseId: string | null;
                name: string;
                status: string;
                visibility: string;
                createdAt: string;
            }[];
        };
    }>;
    createKnowledgeBase(user: RequestContext, body: CreateKnowledgeBaseDto): Promise<{
        data: {
            id: string;
            status: string;
            visibility: string;
        };
    }>;
    createDocument(user: RequestContext, knowledgeBaseId: string, body: UploadKnowledgeBaseDocumentDto): Promise<{
        data: {
            knowledgeBaseId: string;
            documentId: null;
            status: string;
        };
    } | {
        data: {
            lessonNodeId?: string;
            sourceType: "pdf" | "docx" | "slide" | "transcript" | "note" | "html";
            title: string;
            fileUrl: string;
            extractedText?: string;
            knowledgeBaseId: string;
            documentId: string;
            status: string;
        };
    }>;
    bulkCreateDocuments(user: RequestContext, knowledgeBaseId: string, body: BulkCreateKnowledgeBaseDocumentsDto): Promise<{
        data: {
            knowledgeBaseId: string;
            items: {
                lessonNodeId?: string;
                sourceType: "pdf" | "docx" | "slide" | "transcript" | "note" | "html";
                title: string;
                fileUrl: string;
                extractedText?: string;
                documentId: string;
                status: string;
            }[];
        };
    }>;
    ingestDocument(user: RequestContext, documentId: string, body: IngestDocumentDto): Promise<{
        data: {
            documentId: string;
            status: string;
        };
    } | {
        data: {
            queue: string;
            jobName: "ingest-kb-document";
            documentId: string;
            status: string;
        };
    }>;
    listDocuments(user: RequestContext, knowledgeBaseId: string): Promise<{
        data: {
            items: {
                id: string;
                lessonNodeId: string | null;
                sourceType: string;
                title: string;
                fileUrl: string | null;
                extractedText: string | null;
                status: string;
                createdAt: string;
            }[];
        };
    }>;
    deleteDocument(user: RequestContext, documentId: string): Promise<{
        data: {
            documentId: string;
            deleted: boolean;
        };
    }>;
    updateDocument(user: RequestContext, documentId: string, body: UpdateKnowledgeBaseDocumentDto): Promise<{
        data: {
            documentId: string;
            updated: boolean;
        };
    }>;
}
