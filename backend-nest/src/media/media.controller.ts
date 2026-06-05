import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { MediaService } from './media.service';
import { PlaybackHeartbeatDto } from './dto/playback-heartbeat.dto';
import { TranscribeVideoDto } from './dto/transcribe-video.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('videos/:videoAssetId/transcribe')
  @Roles('owner', 'admin', 'tutor')
  transcribe(
    @CurrentUser() user: RequestContext,
    @Param('videoAssetId') videoAssetId: string,
    @Body() body: TranscribeVideoDto,
  ) {
    return this.mediaService.transcribeVideo(user, videoAssetId, body);
  }

  @Get('videos/:videoAssetId/transcript')
  @Roles('owner', 'admin', 'tutor', 'student')
  getTranscript(@CurrentUser() user: RequestContext, @Param('videoAssetId') videoAssetId: string) {
    return this.mediaService.getTranscript(user, videoAssetId);
  }

  @Post('progress/heartbeat')
  @Roles('owner', 'admin', 'tutor', 'student')
  heartbeat(@CurrentUser() user: RequestContext, @Body() body: PlaybackHeartbeatDto) {
    return this.mediaService.recordHeartbeat(user, body);
  }
}
