import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter;
  private readonly fromAddress: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('app.smtpHost');
    const port = this.configService.get<number>('app.smtpPort');
    const secure = this.configService.get<boolean>('app.smtpSecure');
    const user = this.configService.get<string>('app.smtpUser');
    const pass = this.configService.get<string>('app.smtpPass');
    this.fromAddress = this.configService.get<string>('app.smtpFrom') || '';

    this.enabled = !!host && !!port && !!this.fromAddress;
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
        })
      : null;
  }

  isEnabled() {
    return this.enabled && !!this.transporter;
  }

  async send(input: { to: string; subject: string; text: string }) {
    if (!this.isEnabled()) {
      this.logger.warn('SMTP is not configured; skipping email delivery');
      return { delivered: false, skipped: true };
    }

    await this.transporter!.sendMail({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return { delivered: true, skipped: false };
  }
}
