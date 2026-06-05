import { ConfigService } from '@nestjs/config';
export declare class EmailProvider {
    private readonly configService;
    private readonly logger;
    private readonly transporter;
    private readonly fromAddress;
    private readonly enabled;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    send(input: {
        to: string;
        subject: string;
        text: string;
    }): Promise<{
        delivered: boolean;
        skipped: boolean;
    }>;
}
