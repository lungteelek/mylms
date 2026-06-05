import { INestApplication, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../backend/generated/lms-client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    onModuleInit(): Promise<void>;
    enableShutdownHooks(app: INestApplication): Promise<void>;
}
