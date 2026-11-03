import { Module } from '@nestjs/common';
import { BachsClient } from './bachs.client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, BachsClient],
  exports: [PaymentsService, BachsClient],
})
export class PaymentsModule {}
