import { Module } from '@nestjs/common';
import { AdminZonesController } from './admin.zones.controller';
import { AdminZonesService } from './admin.zones.service';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';

@Module({
  controllers: [ZonesController, AdminZonesController],
  providers: [ZonesService, AdminZonesService],
  exports: [ZonesService, AdminZonesService],
})
export class ZonesModule {}
