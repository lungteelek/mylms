import { OpenAiProvider } from '../ai/openai.provider';
import { MediaRepository } from './media.repository';
export declare class MediaJobRunnerService {
    private readonly mediaRepository;
    private readonly openAiProvider;
    constructor(mediaRepository: MediaRepository, openAiProvider: OpenAiProvider);
    runTranscriptPipeline(input: {
        tenantId: string;
        videoAssetId: string;
        language?: string;
        sourceText?: string;
        audioFilePath?: string;
    }): Promise<{
        transcriptId: string;
        videoAssetId: string;
        language: string;
        segmentsCount: number;
        status: string;
    }>;
}
