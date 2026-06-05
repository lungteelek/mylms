import { RequestContext } from '../common/types/request-context.type';
import { MediaService } from './media.service';
import { PlaybackHeartbeatDto } from './dto/playback-heartbeat.dto';
import { TranscribeVideoDto } from './dto/transcribe-video.dto';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    transcribe(user: RequestContext, videoAssetId: string, body: TranscribeVideoDto): Promise<{
        data: {
            queue: string;
            jobName: "transcribe-video";
            videoAssetId: string;
            language: string;
            status: string;
        };
    }>;
    getTranscript(user: RequestContext, videoAssetId: string): Promise<{
        data: {
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
        };
    }>;
    heartbeat(user: RequestContext, body: PlaybackHeartbeatDto): Promise<{
        data: {
            ok: boolean;
            videoAssetId: string;
            positionSeconds: number;
        };
    }>;
}
