import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LineProvider {
  private readonly logger = new Logger(LineProvider.name);
  private readonly channelAccessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.channelAccessToken = this.configService.get<string>('app.lineChannelAccessToken') || '';
  }

  isEnabled() {
    return !!this.channelAccessToken;
  }

  async sendToUser(input: { userId: string; text: string }) {
    if (!this.isEnabled()) {
      this.logger.warn('LINE Messaging API is not configured; skipping LINE delivery');
      return { delivered: false, skipped: true };
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: input.userId,
        messages: [
          {
            type: 'text',
            text: input.text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LINE push failed: ${response.status} ${text}`);
    }

    return { delivered: true, skipped: false };
  }
}
