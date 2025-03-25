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

@ApiTags('Roles')
@ApiBearerAuth() // Adds Bearer token authentication in Swagger
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Create Role
  @Post()
  @ApiOperation({ summary: 'Create a new role' })
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
  @ApiOperation({ summary: 'Retrieve all roles' })
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
  @ApiOperation({ summary: 'Get a role by ID' })
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
  @ApiOperation({ summary: 'Update a role' })
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
  @ApiOperation({ summary: 'Delete a role' })
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
