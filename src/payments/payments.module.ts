import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin.payments.controller';
import { AdminPaymentsService } from './admin.payments.service';
import { BachsClient } from './bachs.client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, AdminPaymentsService, BachsClient],
  exports: [PaymentsService, AdminPaymentsService, BachsClient],
})
export class PaymentsModule {}
