import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/prisma/prisma.service';
import { Logger } from 'winston';
import { PostEnum } from '../enum/post-status.enum';

@Processor('scheduler-queue')
export class SchedulerProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { postId } = job.data;

    try {
      // this.logger.info(`Starting to process scheduled post ID ${postId}`);

      const scheduledPost = await this.prisma.scheduledPost.findUnique({
        where: { id: postId },
      });

      if (!scheduledPost) {
        // this.logger.warn(`Scheduled post ID ${postId} not found`);
        return;
      }

      // this.logger.info(
      //   `Found scheduled post: ${JSON.stringify(scheduledPost)}`,
      // );

      // Create the post
      const newPost = await this.prisma.posts.create({
        data: {
          title: scheduledPost.title,
          content: scheduledPost.content,
          media_url: scheduledPost.media_url,
          userId: scheduledPost.userId,
          status: 'PUBLISHED',
        },
      });

      // this.logger.info(`Created new post with ID: ${newPost.id}`);

      // Delete the scheduled post after successful publishing
      await this.prisma.scheduledPost.delete({
        where: { id: postId },
      });

      // this.logger.info(`Successfully published scheduled post ID ${postId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled post ID ${postId}: ${error.message}`,
        {
          stack: error.stack,
          postId,
        },
      );

      // Re-throw the error to let BullMQ handle retries based on configuration
      throw error;
    }
  }
}
