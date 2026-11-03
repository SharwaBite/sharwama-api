import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ApiCancelOrderDocs,
  ApiCreateOrderDocs,
  ApiGetMyOrdersDocs,
  ApiGetOrderDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderAccessQueryDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

const CART_COOKIE_NAME = 'cart_token';
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,255}$/;

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiCreateOrderDocs()
  createOrder(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new BadRequestException(
        'Idempotency-Key must be 8-255 characters (letters, numbers, - _ : .)',
      );
    }

    return this.ordersService.createOrder(dto, key, {
      userId: user?.id,
      cartToken: user?.id ? undefined : this.extractCartToken(req),
    });
  }

  // Declared before ':idOrToken' so "me" is not treated as an order ID.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiGetMyOrdersDocs()
  getMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get(':idOrToken')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiGetOrderDocs()
  getOrder(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param('idOrToken', ParseUUIDPipe) idOrToken: string,
    @Query() query: OrderAccessQueryDto,
  ) {
    return this.ordersService.getOrder(idOrToken, {
      userId: user?.id,
      role: user?.role,
      token: query.token,
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiCancelOrderDocs()
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OrderAccessQueryDto,
    @Body() dto: CancelOrderDto,
  ) {
    const actor = user?.role === Role.ADMIN ? 'ADMIN' : 'CUSTOMER';
    return this.ordersService.cancelOrder(
      id,
      dto,
      actor,
      user?.id,
      query.token,
    );
  }

  /**
   * Reads the guest cart token from the X-Cart-Token header or the
   * cart_token httpOnly cookie (same sources as CartController).
   */
  private extractCartToken(req: Request): string | undefined {
    const headerVal = req.headers['x-cart-token'];
    const fromHeader = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    if (fromHeader?.trim()) {
      return fromHeader.trim();
    }

    const rawCookie = req.headers.cookie;
    if (!rawCookie) {
      return undefined;
    }

    for (const pair of rawCookie.split(';')) {
      const [rawKey, ...rawVal] = pair.split('=');
      if (rawKey?.trim() === CART_COOKIE_NAME) {
        const value = decodeURIComponent(rawVal.join('=').trim());
        return value || undefined;
      }
    }

    return undefined;
  }
}
