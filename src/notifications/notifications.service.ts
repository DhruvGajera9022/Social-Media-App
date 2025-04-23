import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
}
