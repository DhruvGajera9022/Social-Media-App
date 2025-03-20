import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all users
  async users() {
    return this.prisma.users.findMany();
  }

  // Get user by id
  async userById(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Search user
  async searchUser(firstName: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const users = await this.prisma.users.findMany({
      where: {
        firstName: {
          contains: firstName,
          mode: 'insensitive',
        },
      },
      skip,
      take: limit,
    });

    const totalUsers = await this.prisma.users.count({
      where: {
        firstName: {
          contains: firstName,
          mode: 'insensitive',
        },
      },
    });

    return {
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    };
  }

  // delete user
  async delete(id: number) {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
