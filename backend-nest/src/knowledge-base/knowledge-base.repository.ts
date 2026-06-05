import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../backend/generated/lms-client';
import { PrismaService } from '../prisma/prisma.service';
import { RetrievedChunk } from './types/knowledge-base.types';

type RawId = bigint | number | string;

function normalizeId(value: RawId | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'bigint' ? value.toString() : String(value);
}

@Injectable()
export class KnowledgeBaseRepository {
  private embeddingStorageModePromise: Promise<'vector' | 'jsonb' | 'missing'> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async listKnowledgeBases(tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        tenant_id: RawId;
        course_id: RawId | null;
        name: string;
        status: string;
        visibility: string;
        created_at: Date;
      }>
    >(Prisma.sql`
      SELECT id, tenant_id, course_id, name, status, visibility, created_at
      FROM knowledge_bases
      WHERE tenant_id = ${BigInt(tenantId)}
      ORDER BY created_at DESC, id DESC
    `);

    return rows.map((row) => ({
      id: normalizeId(row.id)!,
      tenantId: normalizeId(row.tenant_id)!,
      courseId: normalizeId(row.course_id),
      name: row.name,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async createKnowledgeBase(input: {
    tenantId: string;
    courseId?: string | null;
    name: string;
    visibility?: 'course_only' | 'tenant_wide';
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId; status: string; visibility: string }>>(Prisma.sql`
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
      id: normalizeId(rows[0].id)!,
      status: rows[0].status,
      visibility: rows[0].visibility,
    };
  }

  async getKnowledgeBaseScope(knowledgeBaseId: string, tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: RawId; tenant_id: RawId; course_id: RawId | null }>
    >(Prisma.sql`
      SELECT id, tenant_id, course_id
      FROM knowledge_bases
      WHERE id = ${BigInt(knowledgeBaseId)} AND tenant_id = ${BigInt(tenantId)}
      LIMIT 1
    `);

    if (!rows[0]) {
      return null;
    }

    return {
      id: normalizeId(rows[0].id)!,
      tenantId: normalizeId(rows[0].tenant_id)!,
      courseId: normalizeId(rows[0].course_id),
    };
  }

  async createDocument(knowledgeBaseId: string, body: { lessonNodeId?: string; sourceType: string; title: string; fileUrl: string }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId; status: string }>>(Prisma.sql`
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
      documentId: normalizeId(rows[0].id)!,
      status: rows[0].status,
    };
  }

  async listDocuments(tenantId: string, knowledgeBaseId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        lesson_node_id: RawId | null;
        source_type: string;
        title: string;
        file_url: string | null;
        extracted_text: string | null;
        status: string;
        created_at: Date;
      }>
    >(Prisma.sql`
      SELECT kd.id, kd.lesson_node_id, kd.source_type, kd.title, kd.file_url, kd.extracted_text, kd.status, kd.created_at
      FROM kb_documents kd
      JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
      WHERE kb.id = ${BigInt(knowledgeBaseId)} AND kb.tenant_id = ${BigInt(tenantId)}
      ORDER BY kd.created_at DESC, kd.id DESC
    `);

    return rows.map((row) => ({
      id: normalizeId(row.id)!,
      lessonNodeId: normalizeId(row.lesson_node_id),
      sourceType: row.source_type,
      title: row.title,
      fileUrl: row.file_url,
      extractedText: row.extracted_text,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async getDocumentById(documentId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: RawId;
        knowledge_base_id: RawId;
        lesson_node_id: RawId | null;
        source_type: string;
        title: string;
        extracted_text: string | null;
        tenant_id: RawId;
        course_id: RawId | null;
      }>
    >(Prisma.sql`
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
      id: normalizeId(rows[0].id)!,
      knowledgeBaseId: normalizeId(rows[0].knowledge_base_id)!,
      lessonNodeId: normalizeId(rows[0].lesson_node_id),
      sourceType: rows[0].source_type,
      title: rows[0].title,
      extractedText: rows[0].extracted_text,
      tenantId: normalizeId(rows[0].tenant_id)!,
      courseId: normalizeId(rows[0].course_id),
    };
  }

  async updateDocument(documentId: string, input: {
    lessonNodeId?: string | null;
    sourceType?: string | null;
    title?: string | null;
    fileUrl?: string | null;
    extractedText?: string | null;
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

  async updateDocumentStatus(documentId: string, status: string, extractedText: string | null) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE kb_documents
      SET status = ${status}, extracted_text = ${extractedText}, created_at = created_at
      WHERE id = ${BigInt(documentId)}
    `);
  }

  async deleteDocument(documentId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM kb_documents
      WHERE id = ${BigInt(documentId)}
    `);
  }

  async deleteChunksByDocumentId(documentId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM kb_chunks
      WHERE document_id = ${BigInt(documentId)}
    `);
  }

  async createChunks(input: {
    documentId: string;
    tenantId: string;
    courseId?: string | null;
    lessonNodeId?: string | null;
    chunks: Array<{ content: string; embedding?: number[] | null }>;
  }) {
    const embeddingStorageMode = await this.getEmbeddingStorageMode();
    for (let i = 0; i < input.chunks.length; i += 1) {
      const chunk = input.chunks[i];
      const embeddingSql = this.buildEmbeddingSql(chunk.embedding, embeddingStorageMode);

      await this.prisma.$executeRaw(Prisma.sql`
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
          ${embeddingSql},
          ${JSON.stringify({ source: 'document_ingestion' })}::jsonb,
          now()
        )
      `);
    }
  }

  async retrieveChunks(input: {
    tenantId: string;
    courseId: string;
    lessonNodeId?: string;
    query: string;
    embedding?: number[] | null;
    limit?: number;
  }): Promise<RetrievedChunk[]> {
    if (input.embedding?.length && (await this.getEmbeddingStorageMode()) === 'vector') {
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
      ? Prisma.sql`AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<
      Array<{
        chunk_id: RawId;
        document_id: RawId;
        title: string;
        content: string;
        lesson_node_id: RawId | null;
      }>
    >(Prisma.sql`
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
      chunkId: normalizeId(row.chunk_id)!,
      documentId: normalizeId(row.document_id)!,
      title: row.title,
      content: row.content,
      lessonNodeId: normalizeId(row.lesson_node_id),
    }));
  }

  private async retrieveChunksByVector(input: {
    tenantId: string;
    courseId: string;
    lessonNodeId?: string;
    embedding: number[];
    limit?: number;
  }): Promise<RetrievedChunk[]> {
    const lessonFilter = input.lessonNodeId
      ? Prisma.sql`AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
      : Prisma.sql``;
    const vectorSql = Prisma.raw(`'${`[${input.embedding.join(',')}]`}'::vector`);

    const rows = await this.prisma.$queryRaw<
      Array<{
        chunk_id: RawId;
        document_id: RawId;
        title: string;
        content: string;
        lesson_node_id: RawId | null;
      }>
    >(Prisma.sql`
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
      chunkId: normalizeId(row.chunk_id)!,
      documentId: normalizeId(row.document_id)!,
      title: row.title,
      content: row.content,
      lessonNodeId: normalizeId(row.lesson_node_id),
    }));
  }

  async retrieveSummaryChunks(input: {
    tenantId: string;
    courseId: string;
    lessonNodeId?: string;
    limit?: number;
  }): Promise<RetrievedChunk[]> {
    const lessonFilter = input.lessonNodeId
      ? Prisma.sql`AND (kc.lesson_node_id = ${BigInt(input.lessonNodeId)} OR kc.lesson_node_id IS NULL)`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<
      Array<{
        chunk_id: RawId;
        document_id: RawId;
        title: string;
        content: string;
        lesson_node_id: RawId | null;
      }>
    >(Prisma.sql`
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
      chunkId: normalizeId(row.chunk_id)!,
      documentId: normalizeId(row.document_id)!,
      title: row.title,
      content: row.content,
      lessonNodeId: normalizeId(row.lesson_node_id),
    }));
  }

  async createOrReuseSession(input: {
    userId: string;
    sessionId?: string;
    courseId: string;
    lessonNodeId?: string;
    mode: 'tutor' | 'summary' | 'exercise';
  }) {
    if (input.sessionId) {
      const rows = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
        SELECT id
        FROM ai_chat_sessions
        WHERE id = ${BigInt(input.sessionId)} AND user_id = ${BigInt(input.userId)}
        LIMIT 1
      `);

      if (rows[0]) {
        return normalizeId(rows[0].id)!;
      }
    }

    const created = await this.prisma.$queryRaw<Array<{ id: RawId }>>(Prisma.sql`
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

    return normalizeId(created[0].id)!;
  }

  async appendMessage(input: {
    sessionId: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    citations?: unknown;
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: RawId; created_at: Date }>>(Prisma.sql`
      INSERT INTO ai_chat_messages (session_id, role, content, citations_json, created_at)
      VALUES (
        ${BigInt(input.sessionId)},
        ${input.role},
        ${input.content},
        ${input.citations ? Prisma.raw(`'${JSON.stringify(input.citations)}'::jsonb`) : null},
        now()
      )
      RETURNING id, created_at
    `);

    return {
      id: normalizeId(rows[0].id)!,
      createdAt: rows[0].created_at.toISOString(),
    };
  }

  async getSessionMessages(userId: string, sessionId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        message_id: RawId;
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        citations_json: unknown;
        created_at: Date;
      }>
    >(Prisma.sql`
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
      id: normalizeId(row.message_id)!,
      role: row.role,
      content: row.content,
      citations: Array.isArray(row.citations_json) ? row.citations_json : [],
      createdAt: row.created_at.toISOString(),
    }));
  }

  private buildEmbeddingSql(embedding: number[] | null | undefined, mode: 'vector' | 'jsonb' | 'missing') {
    if (!embedding?.length || mode === 'missing') {
      return Prisma.raw('NULL');
    }

    if (mode === 'vector') {
      return Prisma.raw(`'${`[${embedding.join(',')}]`}'::vector`);
    }

    return Prisma.raw(`'${JSON.stringify(embedding)}'::jsonb`);
  }

  private async getEmbeddingStorageMode(): Promise<'vector' | 'jsonb' | 'missing'> {
    if (!this.embeddingStorageModePromise) {
      this.embeddingStorageModePromise = this.detectEmbeddingStorageMode();
    }

    return this.embeddingStorageModePromise;
  }

  private async detectEmbeddingStorageMode(): Promise<'vector' | 'jsonb' | 'missing'> {
    const rows = await this.prisma.$queryRaw<Array<{ udt_name: string | null }>>(Prisma.sql`
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kb_chunks'
        AND column_name = 'embedding'
      LIMIT 1
    `);

    const udtName = rows[0]?.udt_name;
    if (udtName === 'vector') {
      return 'vector';
    }
    if (udtName === 'jsonb') {
      return 'jsonb';
    }
    return 'missing';
  }
}
