import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDTO } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all users
  async users() {
    try {
      return this.prisma.users.findMany({ omit: { password: true } });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Get user by id
  async userById(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        omit: { password: true },
        include: { posts: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Search user
  async searchUser(username: string, page: number, limit: number) {
    try {
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
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Update user
  async updateUser(userId: number, updateUserDto: UpdateUserDTO) {
    try {
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
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Delete user
  async delete(id: number) {
    try {
      return this.prisma.users.delete({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
