import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqService } from './bullmq.service';
import { Queue, Worker } from 'bullmq';
import { SchedulerProcessor } from 'src/post/processor/scheduler.processor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    BullmqService,
    SchedulerProcessor,
    {
      provide: 'SCHEDULER_QUEUE',
      useFactory: (configService: ConfigService) => {
        return new Queue('scheduler-queue', {
          connection: {
            host: configService.get('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'SCHEDULER_WORKER',
      useFactory: (
        configService: ConfigService,
        processor: SchedulerProcessor,
      ) => {
        const worker = new Worker(
          'scheduler-queue',
          async (job) => {
            return processor.process(job);
          },
          {
            connection: {
              host: configService.get('REDIS_HOST'),
              port: configService.get<number>('REDIS_PORT'),
            },
            // Add some worker options for reliability
            autorun: true,
            concurrency: 5,
          },
        );

        // Add error handling to the worker
        worker.on('error', (err) => {
          console.error('Worker error:', err);
        });

        return worker;
      },
      inject: [ConfigService, SchedulerProcessor],
    },
  ],
  exports: ['SCHEDULER_QUEUE', BullmqService],
})
export class BullmqModule {}
