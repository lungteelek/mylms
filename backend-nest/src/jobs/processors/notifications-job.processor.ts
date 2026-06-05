import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { JOB_NAMES, JOB_QUEUES, SchedulePlanRemindersJob } from '../job.types';

@Injectable()
@Processor(JOB_QUEUES.NOTIFICATIONS)
export class NotificationsJobProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<SchedulePlanRemindersJob>) {
    if (job.name !== JOB_NAMES.SCHEDULE_PLAN_REMINDERS) {
      return;
    }

    return this.handleSchedulePlanReminders(job.data);
  }

  async handleSchedulePlanReminders(data: SchedulePlanRemindersJob) {
    return this.notificationsService.scheduleStudyPlanReminders(data.userId, data.studyPlanId);
  }
}
