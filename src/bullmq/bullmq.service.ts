import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class BullmqService {
  constructor(
    @Inject('SCHEDULER_QUEUE') private readonly schedulerQueue: Queue,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async schedulePost(postId: number, scheduleTime: Date): Promise<void> {
    const delay = scheduleTime.getTime() - Date.now();
    if (delay <= 0) {
      this.logger.warn(
        `Schedule time is in the past. Skipping job for post ID: ${postId}`,
      );
      return;
    }

    await this.schedulerQueue.add(
      'publishScheduledPost',
      { postId },
      { delay },
    );

    this.logger.warn(`Scheduled job for post ID: ${postId} in ${delay}ms`);
  }
}
