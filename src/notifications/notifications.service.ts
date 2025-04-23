import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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
}
