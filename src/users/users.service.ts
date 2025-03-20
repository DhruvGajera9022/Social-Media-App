import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all users
  async users() {
    return this.prisma.users.findMany();
  }

  async delete(id: number) {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
