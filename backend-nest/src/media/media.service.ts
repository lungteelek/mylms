import { Injectable } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { QueueBridgeService } from '../jobs/queue-bridge.service';
import { MediaRepository } from './media.repository';
import { PlaybackHeartbeatDto } from './dto/playback-heartbeat.dto';
import { TranscribeVideoDto } from './dto/transcribe-video.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly queueBridgeService: QueueBridgeService,
  ) {}

  async transcribeVideo(user: RequestContext, videoAssetId: string, body: TranscribeVideoDto) {
    const enqueued = await this.queueBridgeService.enqueueTranscribeVideo({
      tenantId: user.tenantId,
      videoAssetId,
      language: body.language,
      sourceText: body.sourceText,
      audioFilePath: body.audioFilePath,
    });

    return {
      data: {
        videoAssetId,
        language: body.language || 'th',
        status: 'queued',
        ...enqueued,
      },
    };
  }

  async getTranscript(user: RequestContext, videoAssetId: string) {
    const transcript = await this.mediaRepository.getTranscript(user.tenantId, videoAssetId);
    return {
      data: transcript,
    };
  }

  async recordHeartbeat(user: RequestContext, body: PlaybackHeartbeatDto) {
    await this.mediaRepository.recordPlaybackHeartbeat({
      userId: user.userId,
      tenantId: user.tenantId,
      courseId: body.courseId,
      lessonNodeId: body.lessonNodeId,
      videoAssetId: body.videoAssetId,
      positionSeconds: body.positionSeconds,
      speed: body.speed ?? 1,
      deviceType: body.deviceType,
    });

    return {
      data: {
        ok: true,
        videoAssetId: body.videoAssetId,
        positionSeconds: body.positionSeconds,
      },
    };
  }
}
