import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqService } from './bullmq.service';
import { Queue } from 'bullmq';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    BullmqService,
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
  ],
  exports: ['SCHEDULER_QUEUE', BullmqService],
})
export class BullmqModule {}
