import { PrismaService } from '../prisma/prisma.service';
export declare class MediaRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getVideoAsset(tenantId: string, videoAssetId: string): Promise<{
        id: string;
        lessonNodeId: string;
        status: string;
        playbackId: string | null;
        title: string;
        plainText: string | null;
        htmlContent: string | null;
    }>;
    replaceTranscript(videoAssetId: string, language: string, fullText: string, segments: Array<{
        startMs: number;
        endMs: number;
        text: string;
        segmentIndex: number;
    }>): Promise<string>;
    getTranscript(tenantId: string, videoAssetId: string): Promise<{
        transcriptId: string;
        language: string;
        fullText: string | null;
        segments: {
            id: string;
            startMs: number;
            endMs: number;
            text: string;
            segmentIndex: number;
        }[];
    }>;
    recordPlaybackHeartbeat(input: {
        userId: string;
        tenantId: string;
        courseId: string;
        lessonNodeId: string;
        videoAssetId: string;
        positionSeconds: number;
        speed: number;
        deviceType?: string;
    }): Promise<void>;
}
