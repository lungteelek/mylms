import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MediaJobRunnerService } from '../../media/media-job-runner.service';
import { TranscribeVideoJob } from '../job.types';
export declare class MediaJobProcessor extends WorkerHost {
    private readonly mediaJobRunnerService;
    constructor(mediaJobRunnerService: MediaJobRunnerService);
    process(job: Job<TranscribeVideoJob>): Promise<{
        transcriptId: string;
        videoAssetId: string;
        language: string;
        segmentsCount: number;
        status: string;
    } | undefined>;
    handleTranscribeVideo(data: TranscribeVideoJob): Promise<{
        transcriptId: string;
        videoAssetId: string;
        language: string;
        segmentsCount: number;
        status: string;
    }>;
}
