import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDTO } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { RoleGuard } from 'src/authentication/guard/role.guard';
import { SearchUserDTO } from './dto/search-user.dto';
import { Response } from 'src/utils/response.util';

@ApiTags('Users') // Groups this under "Users" in Swagger
@ApiBearerAuth() // Enables Bearer token authentication in Swagger
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Get()
  async users() {
    try {
      const users = await this.usersService.users();
      return Response(true, 'Users data retrieved.', users);
    } catch (error) {
      return Response(false, 'Failed to retrieve users data.', error.message);
    }
  }

  // Search user
  @ApiOperation({ summary: 'Search users by first name with pagination' })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing firstName' })
  @Get('search')
  async searchUser(@Query() query: SearchUserDTO) {
    const { firstName, page = 1, limit = 10 } = query;

    if (!firstName) {
      throw new BadRequestException('Please provide a first name to search.');
    }

    try {
      const user = await this.usersService.searchUser(firstName, +page, +limit);
      return Response(true, 'User data found.', user);
    } catch (error) {
      return Response(false, 'Failed to find user data.', error.message);
    }
  }

  // Get user by id
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  async userById(@Param('id', ParseIntPipe) id: number) {
    try {
      const user = await this.usersService.userById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      return Response(true, 'User found successfully.', user);
    } catch (error) {
      return Response(false, 'Failed to find user.', error.message);
    }
  }

  // Update user by id
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid ID or input' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Patch(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number, // Ensures ID is a number
    @Body() updateUserDto: UpdateUserDTO,
  ) {
    try {
      const updatedUser = await this.usersService.updateUser(id, updateUserDto);

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      return Response(
        true,
        'User data has been successfully updated.',
        updatedUser,
      );
    } catch (error) {
      return Response(
        false,
        'Error updating user data. Please try again.',
        error.message,
      );
    }
  }

  // Delete user by id
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    try {
      const deletedUser = await this.usersService.delete(id);

      if (!deletedUser) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      return Response(true, 'User deleted successfully.', deletedUser);
    } catch (error) {
      return Response(false, 'Failed to delete user.', error.message);
    }
  }
}
