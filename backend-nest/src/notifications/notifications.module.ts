import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { EmailProvider } from './email.provider';
import { LineProvider } from './line.provider';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { PushProvider } from './push.provider';
import { TelegramProvider } from './telegram.provider';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    EmailProvider,
    PushProvider,
    LineProvider,
    TelegramProvider,
  ],
  exports: [
    NotificationsRepository,
    NotificationsService,
    EmailProvider,
    PushProvider,
    LineProvider,
    TelegramProvider,
  ],
})
export class NotificationsModule {}
