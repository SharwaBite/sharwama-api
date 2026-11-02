import { Module } from '@nestjs/common';
import { AdminStoreSettingsController } from './admin.store-settings.controller';
import { AdminStoreSettingsService } from './admin.store-settings.service';
import { StoreSettingsController } from './store-settings.controller';
import { StoreSettingsService } from './store-settings.service';

@Module({
  controllers: [StoreSettingsController, AdminStoreSettingsController],
  providers: [StoreSettingsService, AdminStoreSettingsService],
  exports: [StoreSettingsService, AdminStoreSettingsService],
})
export class StoreSettingsModule {}
