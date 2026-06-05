import { ConfigService } from '@nestjs/config';
export declare class PushProvider {
    private readonly configService;
    private readonly logger;
    private readonly projectId;
    private readonly serviceAccountJson;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    sendToDevice(input: {
        token: string;
        title: string;
        body: string;
        data?: Record<string, string>;
    }): Promise<{
        delivered: boolean;
        skipped: boolean;
    }>;
}
