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
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @Get()
  @Roles(Role.Admin)
  users() {
    return this.usersService.users();
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(+id);
  }
}
