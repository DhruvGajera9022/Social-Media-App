import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/authentication/decorator/roles.decorator';
import { Role } from 'src/authentication/enum/role.enum';
import { UpdateUserDTO } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { RoleGuard } from 'src/authentication/guard/role.guard';
import { SearchUserDTO } from './dto/search-user.dto';

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
  @Roles(Role.Admin) // Restricts access to Admins only
  @Get()
  async users() {
    return this.usersService.users();
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

    return this.usersService.searchUser(firstName, +page, +limit);
  }

  // Get user by id
  @Get(':id')
  async userById(@Param('id') id: string) {
    return this.usersService.userById(+id);
  }

  // Update user by id
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDTO,
  ) {
    return this.usersService.updateUser(+id, updateUserDto);
  }

  // Delete user by id
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(+id);
  }
}
