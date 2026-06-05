import { RetrievedChunk } from '../knowledge-base/types/knowledge-base.types';
export declare function buildTutorAnswer(question: string, chunks: RetrievedChunk[]): {
    answer: string;
    citations: {
        documentId: string;
        chunkId: string;
        title: string;
        excerpt: string;
    }[];
};
export declare function buildSummary(chunks: RetrievedChunk[]): {
    summary: string[];
    citations: {
        documentId: string;
        chunkId: string;
        title: string;
        excerpt: string;
    }[];
};
export declare function buildExercises(chunks: RetrievedChunk[], difficulty: string, count: number): {
    question: string;
    choices: string[];
    answer: number;
    explanation: string;
}[];
