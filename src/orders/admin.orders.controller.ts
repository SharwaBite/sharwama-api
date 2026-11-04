import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ApiAdminCancelOrderDocs,
  ApiAssignOrderRiderDocs,
  ApiGetAdminOrderDetailDocs,
  ApiGetAdminOrdersDocs,
  ApiUpdateAdminOrderStatusDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { AdminOrdersService } from './admin.orders.service';
import {
  AdminCancelOrderDto,
  AdminOrdersQueryDto,
  AssignRiderDto,
  UpdateOrderStatusDto,
} from './dto/admin-order.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiGetAdminOrdersDocs()
  findAll(@Query() query: AdminOrdersQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiGetAdminOrderDetailDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiUpdateAdminOrderStatusDocs()
  updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminOrdersService.updateStatus(id, dto, admin.id);
  }

  @Patch(':id/rider')
  @ApiAssignOrderRiderDocs()
  assignRider(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRiderDto,
  ) {
    return this.adminOrdersService.assignRider(id, dto, admin.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiAdminCancelOrderDocs()
  cancelOrder(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCancelOrderDto,
  ) {
    return this.adminOrdersService.cancelOrder(id, dto, admin.id);
  }
}

