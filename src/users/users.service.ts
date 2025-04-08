import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDTO } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all users
  async users() {
    return this.prisma.users.findMany({ omit: { password: true } });
  }

  // Get user by id
  async userById(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      omit: { password: true },
      include: { posts: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Search user
  async searchUser(username: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const users = await this.prisma.users.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive',
        },
      },
      skip,
      take: limit,
      omit: { password: true },
    });

    const totalUsers = await this.prisma.users.count({
      where: {
        username: {
          contains: username,
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

  // Update user
  async updateUser(userId: number, updateUserDto: UpdateUserDTO) {
    const { username, email, roleId } = updateUserDto;

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        username,
        email,
        roleId,
      },
    });
  }

  // Delete user
  async delete(id: number) {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
