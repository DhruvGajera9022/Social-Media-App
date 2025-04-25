import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/prisma/prisma.service';
import { Logger } from 'winston';

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

    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: postId },
    });
    if (!scheduledPost) {
      this.logger.warn(`Scheduled post ID ${postId} not found`);
      return;
    }

    await this.prisma.posts.create({
      data: {
        title: scheduledPost.title,
        content: scheduledPost.content,
        media_url: scheduledPost.media_url,
        userId: scheduledPost.userId,
        status: 'PUBLISHED',
      },
    });

    await this.prisma.scheduledPost.delete({
      where: { id: postId },
    });

    this.logger.warn(`Published scheduled post ID ${postId}`);
  }
}
