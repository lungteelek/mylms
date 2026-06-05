import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { JOB_NAMES, JOB_QUEUES } from './job.types';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(JOB_QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('queue.driver') !== 'bullmq') {
      this.logger.log('QUEUE_DRIVER is not bullmq, skipping recurring notification dispatch registration');
      return;
    }

    await this.notificationsQueue.upsertJobScheduler(
      JOB_NAMES.DISPATCH_NOTIFICATIONS,
      {
        every: 60_000,
      },
      {
        name: JOB_NAMES.DISPATCH_NOTIFICATIONS,
        data: {
          limit: 100,
        },
      },
    );

    this.logger.log('Registered recurring notification dispatch job every 60 seconds');
  }
}
