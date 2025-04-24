import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '@prisma/client';
import * as webpush from 'web-push';
import { PushSubscriptionDTO } from './dto/push-subscription.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private vapidDetails = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  };
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (
      !this.vapidDetails.publicKey ||
      !this.vapidDetails.privateKey ||
      !this.vapidDetails.subject
    ) {
      console.warn('VAPID keys not set. Push notifications will not work.');
      return;
    }
    webpush.setVapidDetails(
      this.vapidDetails.subject,
      this.vapidDetails.publicKey,
      this.vapidDetails.privateKey,
    );
  }

  async saveSubscription(userId: number, subscription: PushSubscriptionDTO) {
    return this.prisma.pushSubscription.upsert({
      where: { userId },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async sendPushNotification(
    userId: number,
    payload: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    try {
      const subscription = await this.prisma.pushSubscription.findUnique({
        where: { userId },
      });

      if (!subscription) return;

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notifications.create({
      data: createNotificationDto,
    });

    // Get the notification message
    const message = await this.getNotificationMessage(notification);

    // Send push notification
    await this.sendPushNotification(createNotificationDto.userId, {
      title: 'New Notification',
      body: message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        entityId: notification.entityId,
        actorId: notification.actorId,
      },
    });

    return notification;
  }

  private async getNotificationMessage(notification: any) {
    const actor = await this.prisma.users.findUnique({
      where: { id: notification.actorId },
      select: { username: true },
    });

    const actorName = actor?.username || 'Someone';

    switch (notification.type) {
      case NotificationType.LIKE: {
        const post = await this.prisma.posts.findUnique({
          where: { id: notification.entityId },
          select: { title: true },
        });
        return `${actorName} liked your post: ${post?.title || 'Untitled'}`;
      }
      case NotificationType.COMMENT: {
        const post = await this.prisma.posts.findUnique({
          where: { id: notification.entityId },
          select: { title: true },
        });
        return `${actorName} commented on your post: ${post?.title || 'Untitled'}`;
      }
      case NotificationType.FOLLOW:
        return `${actorName} started following you`;
      case NotificationType.FOLLOW_REQUEST:
        return `${actorName} wants to follow you`;
      default:
        return 'You have a new notification';
    }
  }

  async createNotification(createNotificationDto: CreateNotificationDto) {
    const { userId, actorId, type, entityId } = createNotificationDto;
    try {
      const newNotification = await this.prisma.notifications.create({
        data: {
          userId,
          actorId,
          type: NotificationType.LIKE,
          entityId,
        },
      });

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
