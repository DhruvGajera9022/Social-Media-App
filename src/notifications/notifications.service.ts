import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './gateway/notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    userId: number,
    actorId: number,
    type: NotificationType,
    entityId: number,
  ) {
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
      if (actorId === postUserId) return;

      return this.createNotification(
        postUserId,
        actorId,
        NotificationType.LIKE,
        postId,
      );
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

      return this.createNotification(
        postUserId,
        actorId,
        NotificationType.COMMENT,
        postId,
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createFollowNotification(followerId: number, followingId: number) {
    try {
      return this.createNotification(
        followingId,
        followerId,
        NotificationType.FOLLOW,
        followingId,
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async createFollowRequestNotification(requesterId: number, targetId: number) {
    try {
      return this.createNotification(
        targetId,
        requesterId,
        NotificationType.FOLLOW_REQUEST,
        targetId,
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
