import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
// changes
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
