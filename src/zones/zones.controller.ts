import { Controller, Get } from '@nestjs/common';
import { ApiGetActiveZonesDocs } from '../common/swagger/api-docs';
import { ZonesService } from './zones.service';

@Controller('delivery-zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @ApiGetActiveZonesDocs()
  findAllActive() {
    return this.zonesService.findAllActive();
  }
}
