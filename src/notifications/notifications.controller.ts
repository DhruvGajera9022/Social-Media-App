import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Response } from 'express';
import { errorResponse, successResponse } from 'src/utils/response.util';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
      return errorResponse(res, 400, 'Failed to fetch notifications.');
    }
  }
}
