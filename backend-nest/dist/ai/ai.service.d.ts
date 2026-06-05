import { RequestContext } from '../common/types/request-context.type';
import { KnowledgeBaseRepository } from '../knowledge-base/knowledge-base.repository';
import { AskTutorDto } from './dto/ask-tutor.dto';
import { GenerateExercisesDto } from './dto/generate-exercises.dto';
import { SummaryDto } from './dto/summary.dto';
import { OpenAiProvider } from './openai.provider';
export declare class AiService {
    private readonly knowledgeBaseRepository;
    private readonly openAiProvider;
    constructor(knowledgeBaseRepository: KnowledgeBaseRepository, openAiProvider: OpenAiProvider);
    askTutor(user: RequestContext, body: AskTutorDto): Promise<{
        data: {
            sessionId: string;
            messageId: string;
            answer: string;
            citations: {
                documentId: string;
                chunkId: string;
                title?: string;
                excerpt?: string;
            }[];
            usage: {
                promptTokens: number;
                completionTokens: number;
            };
        };
    }>;
    summarize(user: RequestContext, body: SummaryDto): Promise<{
        data: {
            summary: string[];
            citations: {
                documentId: string;
                chunkId: string;
                title?: string;
                excerpt?: string;
            }[];
        };
    }>;
    generateExercises(user: RequestContext, body: GenerateExercisesDto): Promise<{
        data: {
            items: {
                question: string;
                choices: string[];
                answer: number;
                explanation: string;
            }[];
            citations: {
                documentId: string;
                chunkId: string;
                title?: string;
                excerpt?: string;
            }[];
        };
    }>;
    getSession(user: RequestContext, sessionId: string): Promise<{
        data: {
            id: string;
            mode: string;
            messages: {
                id: string;
                role: "user" | "system" | "assistant" | "tool";
                content: string;
                citations: any[];
                createdAt: string;
            }[];
        };
    }>;
}
