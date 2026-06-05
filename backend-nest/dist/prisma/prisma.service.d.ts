import 'dotenv/config';
import { INestApplication, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../backend/generated/lms-client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    private static pool;
    constructor();
    onModuleInit(): Promise<void>;
    enableShutdownHooks(app: INestApplication): Promise<void>;
}
