import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisOptions } from 'src/config/redis.config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.registerAsync(RedisOptions)],
  controllers: [ProfileController],
  providers: [ProfileService, PrismaService],
  exports: [ProfileService],
})
export class ProfileModule {}
