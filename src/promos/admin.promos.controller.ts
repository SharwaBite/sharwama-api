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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiCreatePromoDocs,
  ApiDeletePromoDocs,
  ApiGetAdminPromosDocs,
  ApiUpdatePromoDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { AdminPromosService } from './admin.promos.service';
import { CreatePromoDto, UpdatePromoDto } from './dto/promo.dto';

@Controller('admin/promos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPromosController {
  constructor(private readonly adminPromosService: AdminPromosService) {}

  @Get()
  @ApiGetAdminPromosDocs()
  findAll() {
    return this.adminPromosService.findAll();
  }

  @Post()
  @ApiCreatePromoDocs()
  create(@Body() dto: CreatePromoDto) {
    return this.adminPromosService.create(dto);
  }

  @Patch(':id')
  @ApiUpdatePromoDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.adminPromosService.update(id, dto);
  }

  @Delete(':id')
  @ApiDeletePromoDocs()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminPromosService.remove(id);
  }
}

