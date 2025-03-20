import {
  Controller,
  Delete,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/authentication/decorator/roles.decorator';
import { Role } from 'src/authentication/enum/role.enum';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @Get()
  @Roles(Role.Admin)
  users() {
    return this.usersService.users();
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
