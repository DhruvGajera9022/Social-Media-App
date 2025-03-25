import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDTO } from './dto/update-user.dto';

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

  // Update user
  async updateUser(userId: number, updateUserDto: UpdateUserDTO) {
    const { firstName, lastName, email, roleId } = updateUserDto;

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
        firstName,
        lastName,
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
