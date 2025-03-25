import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDTO } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // Create Role
  async createRole(createRoleDto: CreateRoleDto) {
    return this.prisma.roles.create({ data: createRoleDto });
  }

  // Get Roles
  async findAll() {
    return this.prisma.roles.findMany();
  }

  // Get Role By Id
  async findOne(id: number) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // Edit Role
  async updateRole(id: number, updateRoleDto: UpdateRoleDTO) {
    return this.prisma.roles
      .update({
        where: { id },
        data: updateRoleDto,
      })
      .catch(() => {
        throw new NotFoundException('Role not found');
      });
  }

  // Delete Role
  async deleteRole(id: number) {
    return this.prisma.roles.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Role not found');
    });
  }
}
