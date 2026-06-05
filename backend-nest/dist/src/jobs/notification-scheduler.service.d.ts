import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class NotificationSchedulerService implements OnModuleInit {
    private readonly configService;
    private readonly notificationsQueue;
    private readonly logger;
    constructor(configService: ConfigService, notificationsQueue: Queue);
    onModuleInit(): Promise<void>;
}
