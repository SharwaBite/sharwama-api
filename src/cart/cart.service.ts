import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromosService } from '../promos/promos.service';
import { StoreSettingsService } from '../store-settings/store-settings.service';
import {
  AddCartItemDto,
  ApplyCartPromoDto,
  SetCartDeliveryDto,
  UpdateCartItemDto,
} from './dto/cart.dto';

export interface CartActor {
  userId?: string;
  cartToken?: string;
}

const CART_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      menuItem: {
        include: {
          category: true,
          optionGroups: {
            orderBy: { sortOrder: 'asc' as const },
            include: {
              options: {
                orderBy: { sortOrder: 'asc' as const },
              },
            },
          },
        },
      },
    },
  },
  zone: true,
  promo: true,
};

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promosService: PromosService,
    private readonly storeSettingsService: StoreSettingsService,
  ) {}

  /**
   * GET /api/v1/cart
   * Returns the current cart re-priced and re-validated.
   * If no cart exists yet for the guest/user, returns an empty priced cart structure.
   */
  async getCart(actor: CartActor) {
    const cart = await this.findExistingCart(actor);
    if (!cart) {
      return this.buildEmptyCartResponse(actor);
    }

    return this.formatAndPriceCart(cart.id);
  }

  /**
   * POST /api/v1/cart/items
   * Adds an item line (or increments quantity if an identical line already exists).
   * Issues a new cart (with an unguessable token) if none exists yet.
   */
  async addItem(actor: CartActor, dto: AddCartItemDto) {
    const uniqueOptionIds = this.normalizeOptionIds(dto.optionIds);
    await this.validateMenuItemAndOptions(dto.menuItemId, uniqueOptionIds);

    const cart = await this.findOrCreateCart(actor);
    const normalizedNotes = this.normalizeNotes(dto.notes);

    const existingItems = await this.prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        menuItemId: dto.menuItemId,
      },
    });

    const matchingItem = existingItems.find(
      (item) =>
        this.areOptionArraysEqual(item.selectedOptionIds, uniqueOptionIds) &&
        (item.notes ?? null) === normalizedNotes,
    );

    if (matchingItem) {
      const newQuantity = Math.min(50, matchingItem.quantity + dto.quantity);
      await this.prisma.cartItem.update({
        where: { id: matchingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: dto.menuItemId,
          quantity: dto.quantity,
          notes: normalizedNotes,
          selectedOptionIds: uniqueOptionIds,
        },
      });
    }

    await this.touchCart(cart.id);
    return this.formatAndPriceCart(cart.id);
  }

  /**
   * PATCH /api/v1/cart/items/:itemId
   * Updates quantity, selected options, or notes on a cart line.
   */
  async updateItem(
    actor: CartActor,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.requireCart(actor);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!existingItem) {
      throw new NotFoundException(`Cart item "${itemId}" not found in cart`);
    }

    const updatedOptionIds =
      dto.optionIds !== undefined
        ? this.normalizeOptionIds(dto.optionIds)
        : existingItem.selectedOptionIds;

    await this.validateMenuItemAndOptions(
      existingItem.menuItemId,
      updatedOptionIds,
    );

    const updatedNotes =
      dto.notes !== undefined
        ? this.normalizeNotes(dto.notes)
        : existingItem.notes;

    const updatedQuantity = dto.quantity ?? existingItem.quantity;

    await this.prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: updatedQuantity,
        selectedOptionIds: updatedOptionIds,
        notes: updatedNotes,
      },
    });

    await this.touchCart(cart.id);
    return this.formatAndPriceCart(cart.id);
  }

  /**
   * DELETE /api/v1/cart/items/:itemId
   * Removes a single line item from the cart.
   */
  async removeItem(actor: CartActor, itemId: string) {
    const cart = await this.requireCart(actor);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!existingItem) {
      throw new NotFoundException(`Cart item "${itemId}" not found in cart`);
    }

    await this.prisma.cartItem.delete({
      where: { id: existingItem.id },
    });

    await this.touchCart(cart.id);
    return this.formatAndPriceCart(cart.id);
  }

  /**
   * DELETE /api/v1/cart
   * Clears all items and removes any applied promo code from the cart.
   */
  async clearCart(actor: CartActor) {
    const cart = await this.findExistingCart(actor);
    if (!cart) {
      return this.buildEmptyCartResponse(actor);
    }

    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      this.prisma.cart.update({
        where: { id: cart.id },
        data: { promoCodeId: null },
      }),
    ]);

    return this.formatAndPriceCart(cart.id);
  }

  /**
   * PUT /api/v1/cart/delivery
   * Sets orderType (DELIVERY or PICKUP) and optional zoneId so delivery fee is calculated.
   */
  async setDelivery(actor: CartActor, dto: SetCartDeliveryDto) {
    const cart = await this.findOrCreateCart(actor);

    let zoneId: string | null = null;

    if (dto.type === OrderType.DELIVERY) {
      if (dto.zoneId) {
        const zone = await this.prisma.deliveryZone.findUnique({
          where: { id: dto.zoneId },
        });

        if (!zone) {
          throw new NotFoundException(
            `Delivery zone "${dto.zoneId}" not found`,
          );
        }

        if (!zone.isActive) {
          throw new BadRequestException(
            `Delivery zone "${zone.name}" is currently unavailable`,
          );
        }

        zoneId = zone.id;
      }
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        orderType: dto.type,
        zoneId,
      },
    });

    return this.formatAndPriceCart(cart.id);
  }

  /**
   * POST /api/v1/cart/promo
   * Validates and attaches a promo code to the current cart.
   */
  async applyPromo(actor: CartActor, dto: ApplyCartPromoDto) {
    const cart = await this.findOrCreateCart(actor);
    const currentSnapshot = await this.formatAndPriceCart(cart.id);

    const promo = await this.promosService.findAndValidateByCode(
      dto.code,
      currentSnapshot.subtotal > 0 ? currentSnapshot.subtotal : undefined,
    );

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: promo.id },
    });

    return this.formatAndPriceCart(cart.id);
  }

  /**
   * DELETE /api/v1/cart/promo
   * Removes the promo code from the cart.
   */
  async removePromo(actor: CartActor) {
    const cart = await this.findExistingCart(actor);
    if (!cart) {
      return this.buildEmptyCartResponse(actor);
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    });

    return this.formatAndPriceCart(cart.id);
  }

  /**
   * POST /api/v1/cart/merge
   * After login, merges the guest cart (by token) into the authenticated user's cart.
   */
  async mergeGuestCart(userId: string, guestCartToken?: string) {
    if (!guestCartToken) {
      return this.getCart({ userId });
    }

    const guestCart = await this.prisma.cart.findUnique({
      where: { token: guestCartToken },
      include: { items: true },
    });

    if (!guestCart || guestCart.userId === userId) {
      return this.getCart({ userId });
    }

    // Only merge unclaimed guest carts
    if (guestCart.userId !== null) {
      return this.getCart({ userId });
    }

    const userCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    // If user doesn't have a cart yet, assign the guest cart directly to the user
    if (!userCart) {
      await this.prisma.cart.update({
        where: { id: guestCart.id },
        data: { userId },
      });
      return this.formatAndPriceCart(guestCart.id);
    }

    // Merge guest cart items and preferences into existing user cart
    await this.prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        const sortedGuestOptions = this.normalizeOptionIds(
          guestItem.selectedOptionIds,
        );

        const matchingUserItem = userCart.items.find(
          (uItem) =>
            uItem.menuItemId === guestItem.menuItemId &&
            this.areOptionArraysEqual(
              uItem.selectedOptionIds,
              sortedGuestOptions,
            ) &&
            (uItem.notes ?? null) === (guestItem.notes ?? null),
        );

        if (matchingUserItem) {
          const combinedQty = Math.min(
            50,
            matchingUserItem.quantity + guestItem.quantity,
          );
          await tx.cartItem.update({
            where: { id: matchingUserItem.id },
            data: { quantity: combinedQty },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              menuItemId: guestItem.menuItemId,
              quantity: guestItem.quantity,
              notes: guestItem.notes,
              selectedOptionIds: sortedGuestOptions,
            },
          });
        }
      }

      await tx.cart.update({
        where: { id: userCart.id },
        data: {
          zoneId: userCart.zoneId ?? guestCart.zoneId,
          promoCodeId: userCart.promoCodeId ?? guestCart.promoCodeId,
          orderType:
            userCart.items.length === 0
              ? guestCart.orderType
              : userCart.orderType,
        },
      });

      await tx.cart.delete({
        where: { id: guestCart.id },
      });
    });

    return this.formatAndPriceCart(userCart.id);
  }

  /**
   * Scheduled cleanup job: deletes carts untouched for 30 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupStaleCarts() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.cart.deleteMany({
      where: {
        updatedAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Deleted ${result.count} stale cart(s) untouched for 30+ days`,
      );
    }

    return result;
  }

  /**
   * Re-prices and re-validates every item, option, delivery zone, promo code,
   * and store status for a given cart ID.
   */
  async formatAndPriceCart(cartId: string) {
    const [cart, storeStatus] = await Promise.all([
      this.prisma.cart.findUnique({
        where: { id: cartId },
        include: CART_INCLUDE,
      }),
      this.storeSettingsService.getStoreStatus(),
    ]);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const warnings: string[] = [];
    let hasUnavailableItems = false;
    let subtotal = 0;

    const pricedItems = cart.items.map((cartItem) => {
      const { menuItem } = cartItem;
      const itemReasons: string[] = [];

      const isMenuItemAvailable =
        menuItem.isAvailable && menuItem.category.isActive;
      if (!isMenuItemAvailable) {
        itemReasons.push(`"${menuItem.name}" is currently sold out`);
      }

      // Build lookup map of all options belonging to this menuItem
      const optionMap = new Map<
        string,
        {
          id: string;
          name: string;
          priceDelta: number;
          isAvailable: boolean;
          groupId: string;
          groupName: string;
        }
      >();

      for (const group of menuItem.optionGroups) {
        for (const opt of group.options) {
          optionMap.set(opt.id, {
            id: opt.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            isAvailable: opt.isAvailable,
            groupId: group.id,
            groupName: group.name,
          });
        }
      }

      const selectedOptions: Array<{
        id: string;
        name: string;
        groupId: string;
        groupName: string;
        priceDelta: number;
        isAvailable: boolean;
      }> = [];
      const unavailableOptions: string[] = [];
      const countByGroup = new Map<string, number>();

      for (const optionId of cartItem.selectedOptionIds) {
        const opt = optionMap.get(optionId);
        if (!opt) {
          unavailableOptions.push(optionId);
          itemReasons.push(
            `An option selected for "${menuItem.name}" is no longer available`,
          );
          continue;
        }

        selectedOptions.push(opt);
        countByGroup.set(opt.groupId, (countByGroup.get(opt.groupId) ?? 0) + 1);

        if (!opt.isAvailable) {
          unavailableOptions.push(opt.name);
          itemReasons.push(
            `Option "${opt.name}" for "${menuItem.name}" is currently sold out`,
          );
        }
      }

      // Check option group min/max/required constraints
      for (const group of menuItem.optionGroups) {
        const count = countByGroup.get(group.id) ?? 0;
        const effectiveMin = group.isRequired
          ? Math.max(1, group.minSelect)
          : group.minSelect;

        if (count < effectiveMin) {
          itemReasons.push(
            `"${menuItem.name}" requires at least ${effectiveMin} selection(s) in "${group.name}"`,
          );
        }
        if (group.maxSelect > 0 && count > group.maxSelect) {
          itemReasons.push(
            `"${menuItem.name}" allows at most ${group.maxSelect} selection(s) in "${group.name}"`,
          );
        }
      }

      const optionsDelta = selectedOptions.reduce(
        (sum, opt) => sum + opt.priceDelta,
        0,
      );
      const unitPrice = menuItem.basePrice + optionsDelta;
      const isLineAvailable = itemReasons.length === 0;
      const lineTotal = isLineAvailable ? unitPrice * cartItem.quantity : 0;

      if (!isLineAvailable) {
        hasUnavailableItems = true;
        warnings.push(...itemReasons);
      } else {
        subtotal += lineTotal;
      }

      return {
        id: cartItem.id,
        menuItemId: menuItem.id,
        name: menuItem.name,
        imageUrl: menuItem.imageUrl,
        cutoutUrl: menuItem.cutoutUrl,
        basePrice: menuItem.basePrice,
        optionsPrice: optionsDelta,
        unitPrice,
        quantity: cartItem.quantity,
        lineTotal,
        notes: cartItem.notes,
        selectedOptionIds: cartItem.selectedOptionIds,
        selectedOptions,
        isAvailable: isLineAvailable,
        unavailableOptions,
        issues: itemReasons,
      };
    });

    // Evaluate delivery zone & fee
    let deliveryFee = 0;
    let deliveryZone: {
      id: string;
      name: string;
      fee: number;
      isActive: boolean;
    } | null = null;

    if (cart.orderType === OrderType.DELIVERY && cart.zone) {
      deliveryZone = {
        id: cart.zone.id,
        name: cart.zone.name,
        fee: cart.zone.fee,
        isActive: cart.zone.isActive,
      };
      if (cart.zone.isActive) {
        deliveryFee = cart.zone.fee;
      } else {
        warnings.push(
          `Delivery zone "${cart.zone.name}" is currently unavailable`,
        );
      }
    }

    // Evaluate promo code & discount
    let discount = 0;
    let promoDetails: {
      id: string;
      code: string;
      type: string;
      value: number;
      minOrder: number;
      discount: number;
      valid: boolean;
      reason?: string;
    } | null = null;

    if (cart.promo) {
      const evaluation = this.promosService.evaluatePromo(cart.promo, subtotal);
      discount = evaluation.discount;
      promoDetails = {
        id: cart.promo.id,
        code: cart.promo.code,
        type: cart.promo.type,
        value: cart.promo.value,
        minOrder: cart.promo.minOrder,
        discount,
        valid: evaluation.valid,
        ...(evaluation.reason ? { reason: evaluation.reason } : {}),
      };

      if (!evaluation.valid && evaluation.reason && pricedItems.length > 0) {
        warnings.push(evaluation.reason);
      }
    }

    const total = Math.max(0, subtotal - discount) + deliveryFee;

    const meetsMinOrder = subtotal >= storeStatus.minOrderAmount;
    if (pricedItems.length > 0 && !meetsMinOrder) {
      const minNaira = (storeStatus.minOrderAmount / 100).toLocaleString(
        'en-NG',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      );
      warnings.push(`Minimum order subtotal is ₦${minNaira}`);
    }

    if (!storeStatus.isOpen && storeStatus.closedMessage) {
      warnings.push(storeStatus.closedMessage);
    }

    const hasValidDeliverySetup =
      cart.orderType === OrderType.PICKUP ||
      Boolean(cart.zone && cart.zone.isActive);

    const canCheckout =
      pricedItems.length > 0 &&
      !hasUnavailableItems &&
      storeStatus.isOpen &&
      meetsMinOrder &&
      hasValidDeliverySetup;

    return {
      id: cart.id,
      cartToken: cart.token,
      userId: cart.userId,
      orderType: cart.orderType,
      zoneId: cart.zoneId,
      deliveryZone,
      promo: promoDetails,
      items: pricedItems,
      itemCount: pricedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      deliveryFee,
      discount,
      total,
      isStoreOpen: storeStatus.isOpen,
      minOrderAmount: storeStatus.minOrderAmount,
      meetsMinOrder,
      hasUnavailableItems,
      canCheckout,
      warnings,
      updatedAt: cart.updatedAt,
    };
  }

  private async findExistingCart(actor: CartActor) {
    if (actor.userId) {
      return this.prisma.cart.findUnique({
        where: { userId: actor.userId },
      });
    }

    if (actor.cartToken) {
      return this.prisma.cart.findFirst({
        where: {
          token: actor.cartToken,
          userId: null,
        },
      });
    }

    return null;
  }

  private async findOrCreateCart(actor: CartActor) {
    const existing = await this.findExistingCart(actor);
    if (existing) {
      return existing;
    }

    if (actor.userId) {
      return this.prisma.cart.create({
        data: {
          userId: actor.userId,
        },
      });
    }

    return this.prisma.cart.create({
      data: {},
    });
  }

  private async requireCart(actor: CartActor) {
    const cart = await this.findExistingCart(actor);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  private async touchCart(cartId: string) {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  }

  private async validateMenuItemAndOptions(
    menuItemId: string,
    optionIds: string[],
  ) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        optionGroups: {
          include: { options: true },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item "${menuItemId}" not found`);
    }

    if (!menuItem.isAvailable || !menuItem.category.isActive) {
      throw new BadRequestException(
        `Menu item "${menuItem.name}" is currently sold out`,
      );
    }

    const optionLookup = new Map<
      string,
      { id: string; name: string; isAvailable: boolean; groupId: string }
    >();

    for (const group of menuItem.optionGroups) {
      for (const opt of group.options) {
        optionLookup.set(opt.id, {
          id: opt.id,
          name: opt.name,
          isAvailable: opt.isAvailable,
          groupId: group.id,
        });
      }
    }

    const groupCounts = new Map<string, number>();

    for (const optionId of optionIds) {
      const opt = optionLookup.get(optionId);
      if (!opt) {
        throw new BadRequestException(
          `Option "${optionId}" does not belong to menu item "${menuItem.name}"`,
        );
      }

      if (!opt.isAvailable) {
        throw new BadRequestException(
          `Option "${opt.name}" is currently sold out`,
        );
      }

      groupCounts.set(opt.groupId, (groupCounts.get(opt.groupId) ?? 0) + 1);
    }

    for (const group of menuItem.optionGroups) {
      const selectedCount = groupCounts.get(group.id) ?? 0;
      const effectiveMin = group.isRequired
        ? Math.max(1, group.minSelect)
        : group.minSelect;

      if (selectedCount < effectiveMin) {
        throw new BadRequestException(
          `Option group "${group.name}" requires at least ${effectiveMin} selection(s)`,
        );
      }

      if (group.maxSelect > 0 && selectedCount > group.maxSelect) {
        throw new BadRequestException(
          `Option group "${group.name}" allows at most ${group.maxSelect} selection(s)`,
        );
      }
    }
  }

  private async buildEmptyCartResponse(actor: CartActor) {
    const storeStatus = await this.storeSettingsService.getStoreStatus();
    const warnings: string[] = [];

    if (!storeStatus.isOpen && storeStatus.closedMessage) {
      warnings.push(storeStatus.closedMessage);
    }

    return {
      id: null,
      cartToken: null,
      userId: actor.userId ?? null,
      orderType: OrderType.DELIVERY,
      zoneId: null,
      deliveryZone: null,
      promo: null,
      items: [],
      itemCount: 0,
      subtotal: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      isStoreOpen: storeStatus.isOpen,
      minOrderAmount: storeStatus.minOrderAmount,
      meetsMinOrder: storeStatus.minOrderAmount === 0,
      hasUnavailableItems: false,
      canCheckout: false,
      warnings,
      updatedAt: null,
    };
  }

  private normalizeOptionIds(optionIds?: string[]): string[] {
    if (!optionIds || optionIds.length === 0) {
      return [];
    }
    return Array.from(new Set(optionIds)).sort();
  }

  private normalizeNotes(notes?: string | null): string | null {
    if (!notes) {
      return null;
    }
    const trimmed = notes.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private areOptionArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
}

