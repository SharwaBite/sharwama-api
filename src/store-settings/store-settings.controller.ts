import { Controller, Get } from '@nestjs/common';
import { ApiGetStoreSettingsDocs } from '../common/swagger/api-docs';
import { StoreSettingsService } from './store-settings.service';

@Controller('store-settings')
export class StoreSettingsController {
  constructor(
    private readonly storeSettingsService: StoreSettingsService,
  ) {}

  @Get()
  @ApiGetStoreSettingsDocs()
  getStoreStatus() {
    return this.storeSettingsService.getStoreStatus();
  }
}
