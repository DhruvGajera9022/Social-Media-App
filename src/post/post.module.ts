import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisOptions } from 'src/config/redis.config';

@Module({
  imports: [CacheModule.registerAsync(RedisOptions)],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
