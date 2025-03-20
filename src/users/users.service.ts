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

  // delete user
  async delete(id: number) {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
