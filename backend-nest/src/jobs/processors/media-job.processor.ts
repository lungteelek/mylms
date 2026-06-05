import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { MediaJobRunnerService } from '../../media/media-job-runner.service';
import { JOB_NAMES, JOB_QUEUES, TranscribeVideoJob } from '../job.types';

@Injectable()
@Processor(JOB_QUEUES.MEDIA)
export class MediaJobProcessor extends WorkerHost {
  constructor(private readonly mediaJobRunnerService: MediaJobRunnerService) {
    super();
  }

  async process(job: Job<TranscribeVideoJob>) {
    if (job.name !== JOB_NAMES.TRANSCRIBE_VIDEO) {
      return;
    }
    return this.handleTranscribeVideo(job.data);
  }

  async handleTranscribeVideo(data: TranscribeVideoJob) {
    return this.mediaJobRunnerService.runTranscriptPipeline(data);
  }
}
