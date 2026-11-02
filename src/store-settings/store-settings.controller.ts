import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common';
import {
  ApiGetStoreSettingsDocs,
  ApiUpdateStoreSettingsDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { UpdateStoreSettingsDto } from './dto/store-settings.dto';
import { StoreSettingsService } from './store-settings.service';

@Controller()
export class StoreSettingsController {
  constructor(
    private readonly storeSettingsService: StoreSettingsService,
  ) {}

  @Get('store-settings')
  @ApiGetStoreSettingsDocs()
  getStoreStatus() {
    return this.storeSettingsService.getStoreStatus();
  }

  @Patch('admin/store-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateStoreSettingsDocs()
  updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateStoreSettings(dto);
  }
}
