import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { DispatchNotificationsJob } from '../job.types';
export declare class NotificationDispatchJobProcessor extends WorkerHost {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    process(job: Job<DispatchNotificationsJob>): Promise<{
        data: {
            scanned: number;
            delivered: number;
            pushed: number;
            lined: number;
            telegrammed: number;
            emailed: number;
            failed: number;
        };
    } | undefined>;
    handleDispatch(data: DispatchNotificationsJob): Promise<{
        data: {
            scanned: number;
            delivered: number;
            pushed: number;
            lined: number;
            telegrammed: number;
            emailed: number;
            failed: number;
        };
    }>;
}
