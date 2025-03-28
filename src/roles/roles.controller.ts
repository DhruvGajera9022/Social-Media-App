import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Response } from 'src/utils/response.util';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { RolesGuard } from './guard/roles.guard';
import { Roles } from './decorator/roles.decorator';
import { UpdateRoleDTO } from './dto/update-role.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesEnum } from './enum/roles.enum';

@ApiTags('Roles') // Tag for api documentation
@ApiBearerAuth() // Adds Bearer token authentication in Swagger
@Controller('roles')
@UseGuards(RolesGuard)
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Create Role
  @Post()
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Create a new role (Admin only)' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      const createRole = await this.rolesService.createRole(createRoleDto);
      return Response(true, 'Role created successfully.', createRole);
    } catch (error) {
      return Response(false, 'Fail to create role.', error);
    }
  }

  // Get All Roles
  @Get()
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Retrieve all roles (Admin only)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll() {
    try {
      const roles = await this.rolesService.findAll();
      return Response(true, 'Role retrieved successfully.', roles);
    } catch (error) {
      return Response(false, 'Fail to retrieve roles.', error);
    }
  }

  // Get Role By Id
  @Get(':id')
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Get a role by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role found successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    try {
      const role = await this.rolesService.findOne(+id);
      return Response(true, 'Role found successfully.', role);
    } catch (error) {
      return Response(false, 'Fail to find role.', error);
    }
  }

  // Update Role
  @Patch(':id')
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Update a role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDTO,
  ) {
    try {
      const updateRole = await this.rolesService.updateRole(+id, updateRoleDto);
      return Response(true, 'Role updated successfully.', updateRole);
    } catch (error) {
      return Response(false, 'Fail to update role.', error);
    }
  }

  // Delete Role
  @Delete(':id')
  @Roles(RolesEnum.ADMIN)
  @ApiOperation({ summary: 'Delete a role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(@Param('id') id: string) {
    try {
      const deleteRole = await this.rolesService.deleteRole(+id);
      return Response(true, 'Role deleted successfully.', deleteRole);
    } catch (error) {
      return Response(false, 'Fail to delete role.', error);
    }
  }
}
