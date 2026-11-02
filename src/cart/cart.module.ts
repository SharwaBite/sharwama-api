import { Module } from '@nestjs/common';
import { PromosModule } from '../promos/promos.module';
import { StoreSettingsModule } from '../store-settings/store-settings.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PromosModule, StoreSettingsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

