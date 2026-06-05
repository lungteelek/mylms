import { PrismaService } from '../prisma/prisma.service';
import { RetrievedChunk } from './types/knowledge-base.types';
export declare class KnowledgeBaseRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listKnowledgeBases(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        courseId: string | null;
        name: string;
        status: string;
        visibility: string;
        createdAt: string;
    }[]>;
    createKnowledgeBase(input: {
        tenantId: string;
        courseId?: string | null;
        name: string;
        visibility?: 'course_only' | 'tenant_wide';
    }): Promise<{
        id: string;
        status: string;
        visibility: string;
    }>;
    getKnowledgeBaseScope(knowledgeBaseId: string, tenantId: string): Promise<{
        id: string;
        tenantId: string;
        courseId: string | null;
    } | null>;
    createDocument(knowledgeBaseId: string, body: {
        lessonNodeId?: string;
        sourceType: string;
        title: string;
        fileUrl: string;
    }): Promise<{
        documentId: string;
        status: string;
    }>;
    listDocuments(tenantId: string, knowledgeBaseId: string): Promise<{
        id: string;
        lessonNodeId: string | null;
        sourceType: string;
        title: string;
        fileUrl: string | null;
        extractedText: string | null;
        status: string;
        createdAt: string;
    }[]>;
    getDocumentById(documentId: string): Promise<{
        id: string;
        knowledgeBaseId: string;
        lessonNodeId: string | null;
        sourceType: string;
        title: string;
        extractedText: string | null;
        tenantId: string;
        courseId: string | null;
    } | null>;
    updateDocument(documentId: string, input: {
        lessonNodeId?: string | null;
        sourceType?: string | null;
        title?: string | null;
        fileUrl?: string | null;
        extractedText?: string | null;
    }): Promise<boolean>;
    updateDocumentStatus(documentId: string, status: string, extractedText: string | null): Promise<void>;
    deleteDocument(documentId: string): Promise<void>;
    deleteChunksByDocumentId(documentId: string): Promise<void>;
    createChunks(input: {
        documentId: string;
        tenantId: string;
        courseId?: string | null;
        lessonNodeId?: string | null;
        chunks: Array<{
            content: string;
            embedding?: number[] | null;
        }>;
    }): Promise<void>;
    retrieveChunks(input: {
        tenantId: string;
        courseId: string;
        lessonNodeId?: string;
        query: string;
        embedding?: number[] | null;
        limit?: number;
    }): Promise<RetrievedChunk[]>;
    private retrieveChunksByVector;
    retrieveSummaryChunks(input: {
        tenantId: string;
        courseId: string;
        lessonNodeId?: string;
        limit?: number;
    }): Promise<RetrievedChunk[]>;
    createOrReuseSession(input: {
        userId: string;
        sessionId?: string;
        courseId: string;
        lessonNodeId?: string;
        mode: 'tutor' | 'summary' | 'exercise';
    }): Promise<string>;
    appendMessage(input: {
        sessionId: string;
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        citations?: unknown;
    }): Promise<{
        id: string;
        createdAt: string;
    }>;
    getSessionMessages(userId: string, sessionId: string): Promise<{
        id: string;
        role: "user" | "system" | "assistant" | "tool";
        content: string;
        citations: any[];
        createdAt: string;
    }[]>;
}
