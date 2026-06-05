import { Controller, Delete, Get, Param, Post, Query, UseGuards, Body } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationDevicePlatform, RegisterNotificationDeviceDto } from './dto/register-notification-device.dto';
import { NotificationsService } from './notifications.service';
import { QueueBridgeService } from '../jobs/queue-bridge.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly queueBridgeService: QueueBridgeService,
  ) {}

  @Get('inbox')
  @Roles('owner', 'admin', 'tutor', 'student')
  getInbox(@CurrentUser() user: RequestContext, @Query() query: ListNotificationsDto) {
    return this.notificationsService.getInbox(user.userId, query.limit);
  }

  @Post('devices')
  @Roles('owner', 'admin', 'tutor', 'student')
  registerDevice(@CurrentUser() user: RequestContext, @Body() body: RegisterNotificationDeviceDto) {
    return this.notificationsService.registerDevice(user.userId, body);
  }

  @Delete('devices/:platform/:pushToken')
  @Roles('owner', 'admin', 'tutor', 'student')
  unregisterDevice(
    @CurrentUser() user: RequestContext,
    @Param('platform') platform: NotificationDevicePlatform,
    @Param('pushToken') pushToken: string,
  ) {
    return this.notificationsService.unregisterDevice(user.userId, platform, pushToken);
  }

  @Post(':notificationId/read')
  @Roles('owner', 'admin', 'tutor', 'student')
  markAsRead(@CurrentUser() user: RequestContext, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }

  @Post('dispatch')
  @Roles('owner', 'admin')
  dispatchNow() {
    return this.queueBridgeService.enqueueDispatchNotifications();
  }
}
