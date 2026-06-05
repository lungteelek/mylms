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
exports.KnowledgeBaseRepository = void 0;
const common_1 = require("@nestjs/common");
const lms_client_1 = require("../../../backend/generated/lms-client");
const prisma_service_1 = require("../prisma/prisma.service");
function normalizeId(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return typeof value === 'bigint' ? value.toString() : String(value);
}
let KnowledgeBaseRepository = class KnowledgeBaseRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listKnowledgeBases(tenantId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, tenant_id, course_id, name, status, visibility, created_at
      FROM knowledge_bases
      WHERE tenant_id = ${BigInt(tenantId)}
      ORDER BY created_at DESC, id DESC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            tenantId: normalizeId(row.tenant_id),
            courseId: normalizeId(row.course_id),
            name: row.name,
            status: row.status,
            visibility: row.visibility,
            createdAt: row.created_at.toISOString(),
        }));
    }
    async createKnowledgeBase(input) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO knowledge_bases (tenant_id, course_id, name, status, visibility, created_at)
      VALUES (
        ${BigInt(input.tenantId)},
        ${input.courseId ? BigInt(input.courseId) : null},
        ${input.name},
        'processing',
        ${input.visibility || 'course_only'},
        now()
      )
      RETURNING id, status, visibility
    `);
        return {
            id: normalizeId(rows[0].id),
            status: rows[0].status,
            visibility: rows[0].visibility,
        };
    }
    async getKnowledgeBaseScope(knowledgeBaseId, tenantId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, tenant_id, course_id
      FROM knowledge_bases
      WHERE id = ${BigInt(knowledgeBaseId)} AND tenant_id = ${BigInt(tenantId)}
      LIMIT 1
    `);
        if (!rows[0]) {
            return null;
        }
        return {
            id: normalizeId(rows[0].id),
            tenantId: normalizeId(rows[0].tenant_id),
            courseId: normalizeId(rows[0].course_id),
        };
    }
    async createDocument(knowledgeBaseId, body) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO kb_documents (knowledge_base_id, lesson_node_id, source_type, title, file_url, status, created_at)
      VALUES (
        ${BigInt(knowledgeBaseId)},
        ${body.lessonNodeId ? BigInt(body.lessonNodeId) : null},
        ${body.sourceType},
        ${body.title},
        ${body.fileUrl},
        'processing',
        now()
      )
      RETURNING id, status
    `);
        return {
            documentId: normalizeId(rows[0].id),
            status: rows[0].status,
        };
    }
    async listDocuments(tenantId, knowledgeBaseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT kd.id, kd.lesson_node_id, kd.source_type, kd.title, kd.file_url, kd.extracted_text, kd.status, kd.created_at
      FROM kb_documents kd
      JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
      WHERE kb.id = ${BigInt(knowledgeBaseId)} AND kb.tenant_id = ${BigInt(tenantId)}
      ORDER BY kd.created_at DESC, kd.id DESC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            lessonNodeId: normalizeId(row.lesson_node_id),
            sourceType: row.source_type,
            title: row.title,
            fileUrl: row.file_url,
            extractedText: row.extracted_text,
            status: row.status,
            createdAt: row.created_at.toISOString(),
        }));
    }
    async getDocumentById(documentId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        kd.id,
        kd.knowledge_base_id,
        kd.lesson_node_id,
        kd.source_type,
        kd.title,
        kd.extracted_text,
        kb.tenant_id,
        kb.course_id
      FROM kb_documents kd
      JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
      WHERE kd.id = ${BigInt(documentId)}
      LIMIT 1
    `);
        if (!rows[0]) {
            return null;
        }
        return {
            id: normalizeId(rows[0].id),
            knowledgeBaseId: normalizeId(rows[0].knowledge_base_id),
            lessonNodeId: normalizeId(rows[0].lesson_node_id),
            sourceType: rows[0].source_type,
            title: rows[0].title,
            extractedText: rows[0].extracted_text,
            tenantId: normalizeId(rows[0].tenant_id),
            courseId: normalizeId(rows[0].course_id),
        };
    }
    async updateDocument(documentId, input) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      UPDATE kb_documents
      SET
        lesson_node_id = COALESCE(${input.lessonNodeId ? BigInt(input.lessonNodeId) : null}, lesson_node_id),
        source_type = COALESCE(${input.sourceType}, source_type),
        title = COALESCE(${input.title}, title),
        file_url = COALESCE(${input.fileUrl}, file_url),
        extracted_text = COALESCE(${input.extractedText}, extracted_text),
        status = CASE
          WHEN ${input.extractedText !== undefined && input.extractedText !== null} THEN 'processing'
          ELSE status
        END
      WHERE id = ${BigInt(documentId)}
      RETURNING id
    `);
        return Boolean(rows[0]);
    }
    async updateDocumentStatus(documentId, status, extractedText) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE kb_documents
      SET status = ${status}, extracted_text = ${extractedText}, created_at = created_at
      WHERE id = ${BigInt(documentId)}
    `);
    }
    async deleteDocument(documentId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      DELETE FROM kb_documents
      WHERE id = ${BigInt(documentId)}
    `);
    }
    async deleteChunksByDocumentId(documentId) {
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      DELETE FROM kb_chunks
      WHERE document_id = ${BigInt(documentId)}
    `);
    }
    async createChunks(input) {
        for (let i = 0; i < input.chunks.length; i += 1) {
            const chunk = input.chunks[i];
            const vectorSql = chunk.embedding ? lms_client_1.Prisma.raw(`'${`[${chunk.embedding.join(',')}]`}'::vector`) : lms_client_1.Prisma.raw('NULL');
            await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
        INSERT INTO kb_chunks (
          document_id, tenant_id, course_id, lesson_node_id, chunk_index, content, token_count, embedding, metadata_json, created_at
        )
        VALUES (
          ${BigInt(input.documentId)},
          ${BigInt(input.tenantId)},
          ${input.courseId ? BigInt(input.courseId) : null},
          ${input.lessonNodeId ? BigInt(input.lessonNodeId) : null},
          ${i + 1},
          ${chunk.content},
          ${Math.ceil(chunk.content.length / 4)},
          ${vectorSql},
          ${JSON.stringify({ source: 'document_ingestion' })}::jsonb,
          now()
        )
      `);
        }
    }
    async retrieveChunks(input) {
        if (input.embedding?.length) {
            return this.retrieveChunksByVector({
                tenantId: input.tenantId,
                courseId: input.courseId,
                lessonNodeId: input.lessonNodeId,
                embedding: input.embedding,
                limit: input.limit,
            });
        }
        const likeQuery = `%${input.query}%`;
        const lessonFilter = input.lessonNodeId
            ? lms_client_1.Prisma.sql `AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
            : lms_client_1.Prisma.sql ``;
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        kc.id AS chunk_id,
        kc.document_id,
        kd.title,
        kc.content,
        kc.lesson_node_id
      FROM kb_chunks kc
      JOIN kb_documents kd ON kd.id = kc.document_id
      WHERE kc.tenant_id = ${BigInt(input.tenantId)}
        AND (kc.course_id = ${BigInt(input.courseId)} OR kc.course_id IS NULL)
        ${lessonFilter}
        AND kc.content ILIKE ${likeQuery}
      ORDER BY
        CASE WHEN kc.lesson_node_id IS NOT NULL THEN 0 ELSE 1 END,
        kc.chunk_index ASC
      LIMIT ${input.limit ?? 5}
    `);
        return rows.map((row) => ({
            chunkId: normalizeId(row.chunk_id),
            documentId: normalizeId(row.document_id),
            title: row.title,
            content: row.content,
            lessonNodeId: normalizeId(row.lesson_node_id),
        }));
    }
    async retrieveChunksByVector(input) {
        const lessonFilter = input.lessonNodeId
            ? lms_client_1.Prisma.sql `AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
            : lms_client_1.Prisma.sql ``;
        const vectorSql = lms_client_1.Prisma.raw(`'${`[${input.embedding.join(',')}]`}'::vector`);
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        kc.id AS chunk_id,
        kc.document_id,
        kd.title,
        kc.content,
        kc.lesson_node_id
      FROM kb_chunks kc
      JOIN kb_documents kd ON kd.id = kc.document_id
      WHERE kc.tenant_id = ${BigInt(input.tenantId)}
        AND (kc.course_id = ${BigInt(input.courseId)} OR kc.course_id IS NULL)
        ${lessonFilter}
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> ${vectorSql}
      LIMIT ${input.limit ?? 5}
    `);
        return rows.map((row) => ({
            chunkId: normalizeId(row.chunk_id),
            documentId: normalizeId(row.document_id),
            title: row.title,
            content: row.content,
            lessonNodeId: normalizeId(row.lesson_node_id),
        }));
    }
    async retrieveSummaryChunks(input) {
        const lessonFilter = input.lessonNodeId
            ? lms_client_1.Prisma.sql `AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
            : lms_client_1.Prisma.sql ``;
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        kc.id AS chunk_id,
        kc.document_id,
        kd.title,
        kc.content,
        kc.lesson_node_id
      FROM kb_chunks kc
      JOIN kb_documents kd ON kd.id = kc.document_id
      WHERE kc.tenant_id = ${BigInt(input.tenantId)}
        AND (kc.course_id = ${BigInt(input.courseId)} OR kc.course_id IS NULL)
        ${lessonFilter}
      ORDER BY
        CASE WHEN kc.lesson_node_id IS NOT NULL THEN 0 ELSE 1 END,
        kc.chunk_index ASC
      LIMIT ${input.limit ?? 6}
    `);
        return rows.map((row) => ({
            chunkId: normalizeId(row.chunk_id),
            documentId: normalizeId(row.document_id),
            title: row.title,
            content: row.content,
            lessonNodeId: normalizeId(row.lesson_node_id),
        }));
    }
    async createOrReuseSession(input) {
        if (input.sessionId) {
            const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
        SELECT id
        FROM ai_chat_sessions
        WHERE id = ${BigInt(input.sessionId)} AND user_id = ${BigInt(input.userId)}
        LIMIT 1
      `);
            if (rows[0]) {
                return normalizeId(rows[0].id);
            }
        }
        const created = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO ai_chat_sessions (user_id, course_id, lesson_node_id, mode, created_at)
      VALUES (
        ${BigInt(input.userId)},
        ${BigInt(input.courseId)},
        ${input.lessonNodeId ? BigInt(input.lessonNodeId) : null},
        ${input.mode},
        now()
      )
      RETURNING id
    `);
        return normalizeId(created[0].id);
    }
    async appendMessage(input) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      INSERT INTO ai_chat_messages (session_id, role, content, citations_json, created_at)
      VALUES (
        ${BigInt(input.sessionId)},
        ${input.role},
        ${input.content},
        ${input.citations ? lms_client_1.Prisma.raw(`'${JSON.stringify(input.citations)}'::jsonb`) : null},
        now()
      )
      RETURNING id, created_at
    `);
        return {
            id: normalizeId(rows[0].id),
            createdAt: rows[0].created_at.toISOString(),
        };
    }
    async getSessionMessages(userId, sessionId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        m.id AS message_id,
        m.role,
        m.content,
        m.citations_json,
        m.created_at
      FROM ai_chat_messages m
      JOIN ai_chat_sessions s ON s.id = m.session_id
      WHERE s.user_id = ${BigInt(userId)} AND s.id = ${BigInt(sessionId)}
      ORDER BY m.created_at ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.message_id),
            role: row.role,
            content: row.content,
            citations: Array.isArray(row.citations_json) ? row.citations_json : [],
            createdAt: row.created_at.toISOString(),
        }));
    }
};
exports.KnowledgeBaseRepository = KnowledgeBaseRepository;
exports.KnowledgeBaseRepository = KnowledgeBaseRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KnowledgeBaseRepository);
