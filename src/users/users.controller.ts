import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/authentication/decorator/roles.decorator';
import { Role } from 'src/authentication/enum/role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @Get()
  @Roles(Role.Admin)
  users() {
    return this.usersService.users();
  }

  // Search user
  @Get('search')
  searchUser(
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
  userById(@Param('id') id: string) {
    return this.usersService.userById(+id);
  }

  // Delete user by id
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(+id);
  }
}
