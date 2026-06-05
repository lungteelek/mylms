export declare class UpsertLessonTranscriptDto {
    language?: string;
    status?: 'ready' | 'processing' | 'failed' | 'uploading';
    fullText?: string;
    segments: Array<{
        seek: string;
        progress: number;
        text: string;
    }>;
}
