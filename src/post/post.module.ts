import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisOptions } from 'src/config/redis.config';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { BullmqModule } from 'src/bullmq/bullmq.module';
import { SchedulerProcessor } from './processor/scheduler.processor';

@Module({
  imports: [
    CacheModule.registerAsync(RedisOptions),
    NotificationsModule,
    BullmqModule,
  ],
  controllers: [PostController],
  providers: [PostService, SchedulerProcessor],
})
export class PostModule {}
