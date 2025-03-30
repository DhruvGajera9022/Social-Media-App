import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from './guard/roles.guard';
// changes
@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesGuard],
  exports: [RolesGuard],
})
export class RolesModule {}
