import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ApiGetFlaggedPaymentsDocs,
  ApiResolveFlaggedPaymentDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import {
  AdminPaymentsService,
  ResolveFlaggedPaymentDto,
} from './admin.payments.service';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get('flagged')
  @ApiGetFlaggedPaymentsDocs()
  findFlaggedPayments() {
    return this.adminPaymentsService.findFlaggedPayments();
  }

  @Patch(':id/resolve')
  @ApiResolveFlaggedPaymentDocs()
  resolveFlaggedPayment(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveFlaggedPaymentDto,
  ) {
    return this.adminPaymentsService.resolveFlaggedPayment(id, dto, admin.id);
  }
}

