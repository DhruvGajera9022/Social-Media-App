import { Test, TestingModule } from '@nestjs/testing';
import { BullmqService } from './bullmq.service';

describe('BullmqService', () => {
  let service: BullmqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BullmqService],
    }).compile();

    service = module.get<BullmqService>(BullmqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
