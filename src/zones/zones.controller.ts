import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common';
import {
  ApiCreateZoneDocs,
  ApiDeleteZoneDocs,
  ApiGetActiveZonesDocs,
  ApiGetAllZonesAdminDocs,
  ApiUpdateZoneDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from './dto/delivery-zone.dto';
import { ZonesService } from './zones.service';

@Controller()
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get('delivery-zones')
  @ApiGetActiveZonesDocs()
  findAllActive() {
    return this.zonesService.findAllActive();
  }

  @Get('admin/delivery-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiGetAllZonesAdminDocs()
  findAllAdmin() {
    return this.zonesService.findAllAdmin();
  }

  @Post('admin/delivery-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateZoneDocs()
  create(@Body() dto: CreateDeliveryZoneDto) {
    return this.zonesService.create(dto);
  }

  @Patch('admin/delivery-zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateZoneDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
  ) {
    return this.zonesService.update(id, dto);
  }

  @Delete('admin/delivery-zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteZoneDocs()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.remove(id);
  }
}
