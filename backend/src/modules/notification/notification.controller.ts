import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { limitPipe, pagePipe } from '../../common/pipes/bounded-int.pipe';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(
    @CurrentUser() user: RequestUser,
    @Query('page', pagePipe()) page: number = 1,
    @Query('limit', limitPipe(20)) limit: number = 20,
  ) {
    return this.notificationService.findByUser(user.id, page, limit);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Post(':id/read')
  markAsRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
