import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Notifications fetched successfully.',
  })
  @ApiResponse({ status: 400, description: 'Failed to fetch notifications.' })
  async findAll(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const notifications =
        await this.notificationsService.findAllForUser(userId);
      return successResponse(
        res,
        'Notification fetched successfully.',
        HttpStatus.OK,
        notifications,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to fetch notifications.');
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications for the user' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count fetched.',
  })
  @ApiResponse({ status: 400, description: 'Failed to fetch unread-count.' })
  async getUnreadCount(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      return successResponse(
        res,
        'Unread Notification fetched',
        HttpStatus.OK,
        unreadCount,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to fetch unread-count');
    }
  }

  @Post(':id/mark-read')
  @ApiOperation({ summary: 'Mark a specific notification as read by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 400, description: 'Failed to mark as read.' })
  async markAsRead(@Param('id') id: string, @Res() res: Response) {
    try {
      const unreadCount = await this.notificationsService.markAsRead(+id);
      return successResponse(
        res,
        'Notification marked as read',
        HttpStatus.OK,
        unreadCount,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to mark as read');
    }
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for the user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
  })
  @ApiResponse({ status: 400, description: 'Failed to mark all as read.' })
  async markAllAsRead(@Req() req, @Res() res: Response) {
    try {
      const userId = +req.user.userId;
      const markedNotifications =
        this.notificationsService.markAllAsRead(userId);
      return successResponse(
        res,
        'All Notification marked as read',
        HttpStatus.OK,
        markedNotifications,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 400, 'Failed to mark all notification as read');
    }
  }
}
