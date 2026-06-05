import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { SchedulePlanRemindersJob } from '../job.types';
export declare class NotificationsJobProcessor extends WorkerHost {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    process(job: Job<SchedulePlanRemindersJob>): Promise<{
        studyPlanId: string;
        created: number;
    } | undefined>;
    handleSchedulePlanReminders(data: SchedulePlanRemindersJob): Promise<{
        studyPlanId: string;
        created: number;
    }>;
}
