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

  async schedulePost(
    postId: number,
    scheduleTime: string | Date,
  ): Promise<void> {
    const scheduleDate = new Date(scheduleTime);
    const now = new Date();

    // this.logger.info(`Current time (local): ${now.toLocaleString()}`);
    // this.logger.info(`Current time (UTC): ${now.toISOString()}`);
    // this.logger.info(`Schedule time (local): ${scheduleDate.toLocaleString()}`);
    // this.logger.info(`Schedule time (UTC): ${scheduleDate.toISOString()}`);

    // Calculate delay in milliseconds
    const delay = scheduleDate.getTime() - now.getTime();

    // this.logger.info(
    //   `Calculated delay: ${delay}ms (${Math.round(delay / 1000 / 60)} minutes)`,
    // );

    if (delay <= 0) {
      // this.logger.warn(
      //   `Schedule time is in the past. Publishing immediately for post ID: ${postId}`,
      // );
      await this.schedulerQueue.add(
        'publishScheduledPost',
        { postId },
        { delay: 1000 },
      );
      return;
    }

    const scheduledLocalTime = new Date(now.getTime() + delay);
    // this.logger.info(
    //   `The post will be published locally at: ${scheduledLocalTime.toLocaleString()}`,
    // );

    const job = await this.schedulerQueue.add(
      'publishScheduledPost',
      { postId },
      { delay },
    );

    // this.logger.info(`Scheduled job ${job.id} for post ID: ${postId}`);
  }
}
