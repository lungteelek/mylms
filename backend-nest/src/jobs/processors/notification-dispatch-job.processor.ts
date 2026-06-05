import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { DispatchNotificationsJob, JOB_NAMES, JOB_QUEUES } from '../job.types';

@Injectable()
@Processor(JOB_QUEUES.NOTIFICATIONS)
export class NotificationDispatchJobProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<DispatchNotificationsJob>) {
    if (job.name !== JOB_NAMES.DISPATCH_NOTIFICATIONS) {
      return;
    }

    return this.handleDispatch(job.data);
  }

  async handleDispatch(data: DispatchNotificationsJob) {
    return this.notificationsService.dispatchDueNotifications(data.limit ?? 100);
  }
}
