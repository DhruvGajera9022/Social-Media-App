import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDTO } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @Get()
  async users() {
    return this.usersService.users();
  }

  // Search user
  @Get('search')
  async searchUser(
    @Query('firstName') firstName: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!firstName) {
      return {
        message: 'Please provide a first name to search.',
      };
    }

    const pageNumber = +page || 1;
    const pageSize = +limit || 10;

    return this.usersService.searchUser(firstName, pageNumber, pageSize);
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
