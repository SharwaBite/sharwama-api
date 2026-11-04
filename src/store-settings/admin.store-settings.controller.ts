import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common';
import { ApiUpdateStoreSettingsDocs } from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { AdminStoreSettingsService } from './admin.store-settings.service';
import { UpdateStoreSettingsDto } from './dto/store-settings.dto';

@Controller('admin/store-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminStoreSettingsController {
  constructor(
    private readonly adminStoreSettingsService: AdminStoreSettingsService,
  ) {}

  @Patch()
  @ApiUpdateStoreSettingsDocs()
  updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.adminStoreSettingsService.updateStoreSettings(dto);
  }
}

