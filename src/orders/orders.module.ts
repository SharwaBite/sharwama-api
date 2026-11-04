import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminOrdersController } from './admin.orders.controller';
import { AdminOrdersService } from './admin.orders.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CartModule, PaymentsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService],
  exports: [OrdersService, AdminOrdersService],
})
export class OrdersModule {}
