import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MediaController } from './media.controller';
import { MediaJobRunnerService } from './media-job-runner.service';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';

@Module({
  imports: [AiModule],
  controllers: [MediaController],
  providers: [MediaService, MediaRepository, MediaJobRunnerService],
  exports: [MediaService, MediaRepository, MediaJobRunnerService],
})
export class MediaModule {}
