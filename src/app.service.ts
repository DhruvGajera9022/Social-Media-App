import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class AppService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async calcWith() {
    const cacheKey = 'CALC:1';

    // Try to get data from cache
    const cacheData = await this.cacheManager.get(cacheKey);

    if (cacheData) {
      this.logger.info(`Cache hit for key: ${cacheKey}`);
      return cacheData;
    }

    this.logger.info(`Cache miss for key: ${cacheKey}, calculating...`);

    // Perform expensive calculation
    let count = 0;
    for (let i = 0; i < 1000000000; i++) {
      count++;
    }

    // Store result in cache
    await this.cacheManager.set(cacheKey, count);
    this.logger.info(`Stored result in cache with key: ${cacheKey}`);

    return count;
  }
}
