import { OpenAiProvider } from '../ai/openai.provider';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
export declare class KnowledgeBaseIngestionService {
    private readonly knowledgeBaseRepository;
    private readonly openAiProvider;
    constructor(knowledgeBaseRepository: KnowledgeBaseRepository, openAiProvider: OpenAiProvider);
    ingestDocument(documentId: string, input: {
        fileText?: string;
        localFilePath?: string;
    }): Promise<{
        documentId: string;
        status: string;
        chunksCreated: number;
    }>;
}
