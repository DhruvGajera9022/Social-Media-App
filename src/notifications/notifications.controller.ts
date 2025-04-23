import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Response } from 'express';
import { errorResponse, successResponse } from 'src/utils/response.util';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  async findAll(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const notifications =
        await this.notificationsService.findAllForUser(userId);
      return successResponse(
        res,
        'Notification fetched successfully.',
        notifications,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to fetch notifications.');
    }
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      return successResponse(res, 'Unread Notification fetched', unreadCount);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to fetch unread-count');
    }
  }
}
