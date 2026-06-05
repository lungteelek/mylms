import { ConfigService } from '@nestjs/config';
export declare class TelegramProvider {
    private readonly configService;
    private readonly logger;
    private readonly botToken;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    sendMessage(input: {
        chatId: string;
        text: string;
    }): Promise<{
        delivered: boolean;
        skipped: boolean;
    }>;
}
