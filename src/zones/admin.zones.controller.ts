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
  ApiGetAllZonesAdminDocs,
  ApiUpdateZoneDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { AdminZonesService } from './admin.zones.service';
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from './dto/delivery-zone.dto';

@Controller('admin/delivery-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminZonesController {
  constructor(private readonly adminZonesService: AdminZonesService) {}

  @Get()
  @ApiGetAllZonesAdminDocs()
  findAll() {
    return this.adminZonesService.findAll();
  }

  @Post()
  @ApiCreateZoneDocs()
  create(@Body() dto: CreateDeliveryZoneDto) {
    return this.adminZonesService.create(dto);
  }

  @Patch(':id')
  @ApiUpdateZoneDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
  ) {
    return this.adminZonesService.update(id, dto);
  }

  @Delete(':id')
  @ApiDeleteZoneDocs()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminZonesService.remove(id);
  }
}

