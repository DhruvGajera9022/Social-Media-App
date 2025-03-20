import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Makes the module as globally scoped
@Global()
@Module({
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
