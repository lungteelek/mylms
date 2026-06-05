import { ConfigService } from '@nestjs/config';
export declare class LineProvider {
    private readonly configService;
    private readonly logger;
    private readonly channelAccessToken;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    sendToUser(input: {
        userId: string;
        text: string;
    }): Promise<{
        delivered: boolean;
        skipped: boolean;
    }>;
}
