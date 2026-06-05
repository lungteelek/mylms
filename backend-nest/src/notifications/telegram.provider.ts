import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);
  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('app.telegramBotToken') || '';
  }

  isEnabled() {
    return !!this.botToken;
  }

  async sendMessage(input: { chatId: string; text: string }) {
    if (!this.isEnabled()) {
      this.logger.warn('Telegram Bot API is not configured; skipping Telegram delivery');
      return { delivered: false, skipped: true };
    }

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram send failed: ${response.status} ${text}`);
    }

    return { delivered: true, skipped: false };
  }
}
