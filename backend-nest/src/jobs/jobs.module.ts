import { forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueBridgeService } from './queue-bridge.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { JOB_QUEUES } from './job.types';
import { NotificationsModule } from '../notifications/notifications.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { MediaModule } from '../media/media.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    forwardRef(() => KnowledgeBaseModule),
    forwardRef(() => MediaModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
      }),
    }),
    BullModule.registerQueue(
      { name: JOB_QUEUES.KNOWLEDGE_BASE },
      { name: JOB_QUEUES.MEDIA },
      { name: JOB_QUEUES.NOTIFICATIONS },
    ),
  ],
  providers: [
    QueueBridgeService,
    NotificationSchedulerService,
  ],
  exports: [QueueBridgeService],
})
export class JobsModule {}
