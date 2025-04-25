import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Res,
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
import { SearchUserDTO } from './dto/search-user.dto';
import { successResponse, errorResponse } from 'src/utils/response.util';
import { RolesGuard } from 'src/roles/guard/roles.guard';
import { Roles } from 'src/roles/decorator/roles.decorator';
import { RolesEnum } from 'src/roles/enum/roles.enum';
import { Response } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@ApiTags('Users') // Groups this under "Users" in Swagger
@ApiBearerAuth() // Enables Bearer token authentication in Swagger
@UseGuards(RolesGuard)
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // Get all users
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @Roles(RolesEnum.ADMIN)
  @Get()
  async users(@Res() res: Response) {
    try {
      const users = await this.usersService.users();
      return successResponse(
        res,
        'Users data retrieved.',
        HttpStatus.OK,
        users,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }

  // Search user
  @ApiOperation({ summary: 'Search users by first name with pagination' })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing firstName' })
  @Roles(RolesEnum.ADMIN, RolesEnum.USER)
  @Get('search')
  async searchUser(@Query() query: SearchUserDTO, @Res() res: Response) {
    const { firstName, page = 1, limit = 10 } = query;

    if (!firstName) {
      throw new BadRequestException('Please provide a first name to search.');
    }

    try {
      const user = await this.usersService.searchUser(firstName, +page, +limit);
      return successResponse(res, 'User data found.', HttpStatus.OK, user);
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }

  // Get user by id
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles(RolesEnum.ADMIN, RolesEnum.USER)
  @Get(':id')
  async userById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const user = await this.usersService.userById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      return successResponse(
        res,
        'User found successfully.',
        HttpStatus.OK,
        user,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
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
  @Roles(RolesEnum.ADMIN)
  @Patch(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number, // Ensures ID is a number
    @Body() updateUserDto: UpdateUserDTO,
    @Res() res: Response,
  ) {
    try {
      const updatedUser = await this.usersService.updateUser(id, updateUserDto);

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      return successResponse(
        res,
        'User data has been successfully updated.',
        HttpStatus.OK,
        updatedUser,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }

  // Delete user by id
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles(RolesEnum.ADMIN)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const deletedUser = await this.usersService.delete(id);

      if (!deletedUser) {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      return successResponse(
        res,
        'User deleted successfully.',
        HttpStatus.OK,
        deletedUser,
      );
    } catch (error) {
      this.logger.error(error.message);
      return errorResponse(res, 401, error.message);
    }
  }
}
