import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './gateway/notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notifications.create({
      data: createNotificationDto,
    });
    return notification;
  }

  async createNotification(createNotificationDto: CreateNotificationDto) {
    const { userId, actorId, type, entityId } = createNotificationDto;
    try {
      const newNotification = await this.prisma.notifications.create({
        data: {
          userId,
          actorId,
          type,
          entityId,
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profile_picture: true,
            },
          },
        },
      });

      this.notificationsGateway.sendNotificationToUser(userId, newNotification);

      return newNotification;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findAllForUser(userId: number) {
    try {
      const notifications = await this.prisma.notifications.findMany({
        where: { userId },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profile_picture: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return notifications;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async getUnreadCount(userId: number) {
    try {
      const unreadCount = await this.prisma.notifications.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return unreadCount;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async markAsRead(notificationId: number) {
    try {
      const notification = await this.prisma.notifications.findUnique({
        where: { id: notificationId },
      });
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return this.prisma.notifications.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notifications.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async createLikeNotification(
    postId: number,
    actorId: number,
    postUserId: number,
  ) {
    try {
      if (actorId === postUserId) return; // Don't notify users about their own actions

      return this.create({
        userId: postUserId,
        actorId,
        type: NotificationType.LIKE,
        entityId: postId,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createCommentNotification(
    postId: number,
    actorId: number,
    postUserId: number,
  ) {
    try {
      if (actorId === postUserId) return;

      return this.create({
        userId: postUserId,
        actorId,
        type: NotificationType.COMMENT,
        entityId: postId,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createFollowNotification(followerId: number, followingId: number) {
    try {
      return this.create({
        userId: followingId,
        actorId: followerId,
        type: NotificationType.FOLLOW,
        entityId: followingId,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createFollowRequestNotification(requesterId: number, targetId: number) {
    try {
      return this.create({
        userId: targetId,
        actorId: requesterId,
        type: NotificationType.FOLLOW_REQUEST,
        entityId: targetId,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
