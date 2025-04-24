import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisOptions } from 'src/config/redis.config';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [CacheModule.registerAsync(RedisOptions), NotificationsModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
