import { Module } from '@nestjs/common';
import { AdminPromosController } from './admin.promos.controller';
import { AdminPromosService } from './admin.promos.service';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';

@Module({
  controllers: [PromosController, AdminPromosController],
  providers: [PromosService, AdminPromosService],
  exports: [PromosService],
})
export class PromosModule {}
