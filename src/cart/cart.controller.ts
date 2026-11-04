import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ApiAddCartItemDocs,
  ApiApplyCartPromoDocs,
  ApiClearCartDocs,
  ApiGetCartDocs,
  ApiMergeCartDocs,
  ApiRemoveCartItemDocs,
  ApiRemoveCartPromoDocs,
  ApiSetCartDeliveryDocs,
  ApiUpdateCartItemDocs,
} from '../common/swagger/api-docs';
import { CartActor, CartService } from './cart.service';
import {
  AddCartItemDto,
  ApplyCartPromoDto,
  MergeCartDto,
  SetCartDeliveryDto,
  UpdateCartItemDto,
} from './dto/cart.dto';

const CART_COOKIE_NAME = 'cart_token';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiGetCartDocs()
  async getCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.getCart(actor);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiAddCartItemDocs()
  async addItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddCartItemDto,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.addItem(actor, dto);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Patch('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiUpdateCartItemDocs()
  async updateItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.updateItem(actor, itemId, dto);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Delete('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiRemoveCartItemDocs()
  async removeItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.removeItem(actor, itemId);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Delete()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiClearCartDocs()
  async clearCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.clearCart(actor);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Put('delivery')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiSetCartDeliveryDocs()
  async setDelivery(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SetCartDeliveryDto,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.setDelivery(actor, dto);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Post('promo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiApplyCartPromoDocs()
  async applyPromo(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ApplyCartPromoDto,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.applyPromo(actor, dto);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Delete('promo')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiRemoveCartPromoDocs()
  async removePromo(
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actor = this.resolveActor(user, req);
    const result = await this.cartService.removePromo(actor);
    this.attachGuestTokenIfPresent(res, result.cartToken, result.userId);
    return result;
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiMergeCartDocs()
  async mergeCart(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: MergeCartDto,
  ) {
    const guestCartToken =
      dto?.guestCartToken?.trim() || this.extractCartToken(req);

    const result = await this.cartService.mergeGuestCart(
      user.id,
      guestCartToken,
    );

    res.clearCookie(CART_COOKIE_NAME, { path: '/' });
    return result;
  }

  private resolveActor(
    user: AuthenticatedUser | null | undefined,
    req: Request,
  ): CartActor {
    if (user?.id) {
      return { userId: user.id };
    }

    return {
      cartToken: this.extractCartToken(req),
    };
  }

  private extractCartToken(req: Request): string | undefined {
    const headerVal = req.headers['x-cart-token'];
    if (typeof headerVal === 'string' && headerVal.trim().length > 0) {
      return headerVal.trim();
    }
    if (Array.isArray(headerVal) && headerVal[0]?.trim()) {
      return headerVal[0].trim();
    }

    const rawCookieHeader = req.headers.cookie;
    if (!rawCookieHeader) {
      return undefined;
    }

    const cookies = rawCookieHeader.split(';');
    for (const pair of cookies) {
      const [rawKey, ...rawValParts] = pair.split('=');
      if (rawKey?.trim() === CART_COOKIE_NAME) {
        const value = decodeURIComponent(rawValParts.join('=').trim());
        return value.length > 0 ? value : undefined;
      }
    }

    return undefined;
  }

  private attachGuestTokenIfPresent(
    res: Response,
    cartToken: string | null,
    userId: string | null,
  ) {
    if (!cartToken || userId) {
      return;
    }

    res.setHeader('X-Cart-Token', cartToken);
    res.cookie(CART_COOKIE_NAME, cartToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: THIRTY_DAYS_MS,
      path: '/',
    });
  }
}

