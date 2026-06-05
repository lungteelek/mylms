import { ConfigService } from '@nestjs/config';
import { RetrievedChunk } from '../knowledge-base/types/knowledge-base.types';
type TutorCitation = {
    documentId: string;
    chunkId: string;
    title?: string;
    excerpt?: string;
};
export declare class OpenAiProvider {
    private readonly configService;
    private readonly logger;
    private readonly client;
    private readonly responsesModel;
    private readonly transcriptionModel;
    private readonly embeddingModel;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    generateTutorAnswer(question: string, chunks: RetrievedChunk[]): Promise<{
        answer: string;
        citations: TutorCitation[];
    } | null>;
    generateSummary(chunks: RetrievedChunk[]): Promise<{
        summary: string[];
        citations: TutorCitation[];
    } | null>;
    generateExercises(chunks: RetrievedChunk[], difficulty: string, count: number, type: string): Promise<{
        items: Array<{
            question: string;
            choices: string[];
            answer: number;
            explanation: string;
        }>;
        citations: TutorCitation[];
    } | null>;
    transcribeAudioFile(audioFilePath: string, language?: string): Promise<string | null>;
    createEmbedding(input: string): Promise<number[] | null>;
    private serializeChunks;
    private safeParseJson;
}
export {};
