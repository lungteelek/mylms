export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  lessonNodeId: string | null;
};

export type ChatMessageRow = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  citations: Array<{
    documentId: string;
    chunkId: string;
    title?: string;
    excerpt?: string;
  }>;
  createdAt: string;
};
