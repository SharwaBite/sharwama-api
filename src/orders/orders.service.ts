import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CartService } from '../cart/cart.service';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto, CreateOrderDto } from './dto/order.dto';
import { assertTransition, OrderActor } from './order-status';

const ORDER_INCLUDE = {
  items: true,
  payments: {
    orderBy: { createdAt: 'desc' as const },
  },
  history: {
    orderBy: { createdAt: 'desc' as const },
  },
  zone: true,
  promo: true,
};

const ORDER_LIFETIME_MS = 30 * 60 * 1000;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export interface OrderRequester {
  userId?: string;
  cartToken?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * POST /api/v1/orders
   * Snapshots a server-validated cart into an order, empties the cart,
   * creates the Bachs payment session, and returns the order and checkout URL.
   *
   * Retrying with the same Idempotency-Key returns the same order. If the
   * first attempt created the order but failed to start the payment, the
   * retry tries the Bachs session again (Bachs dedupes on checkout-${orderId}).
   */
  async createOrder(
    dto: CreateOrderDto,
    idempotencyKey: string,
    requester: OrderRequester,
  ) {
    // 1. Idempotent replay
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: ORDER_INCLUDE,
    });
    if (existing) {
      return this.replayOrder(existing, requester);
    }

    // 2. Cheap ownership check before doing any pricing work
    await this.assertCartOwnership(dto.cartId, requester);

    // 3. Re-price and re-validate the cart on the server
    const cart = await this.cartService.formatAndPriceCart(dto.cartId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    if (!cart.canCheckout) {
      const issues =
        cart.warnings.length > 0
          ? cart.warnings.join('; ')
          : 'Cart is not ready for checkout';
      throw new BadRequestException(`Cannot place order: ${issues}`);
    }

    if (cart.orderType === OrderType.DELIVERY && !dto.address?.street?.trim()) {
      throw new BadRequestException(
        'Delivery street address is required for delivery orders',
      );
    }

    const isDelivery = cart.orderType === OrderType.DELIVERY;
    const expiresAt = new Date(Date.now() + ORDER_LIFETIME_MS);

    // 4. Snapshot the cart into an order and empty the cart atomically
    let order: OrderWithRelations;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            idempotencyKey,
            userId: requester.userId ?? cart.userId ?? null,
            type: cart.orderType,
            status: OrderStatus.PENDING_PAYMENT,

            customerName: dto.customer.name,
            customerPhone: dto.customer.phone,
            customerEmail: dto.customer.email ?? null,
            notes: dto.notes?.trim() || null,

            subtotal: cart.subtotal,
            deliveryFee: cart.deliveryFee,
            discount: cart.discount,
            total: cart.total,

            zoneId: isDelivery ? cart.zoneId : null,
            deliveryZoneName: isDelivery
              ? (cart.deliveryZone?.name ?? null)
              : null,
            deliveryStreet: isDelivery
              ? (dto.address?.street?.trim() ?? null)
              : null,
            deliveryLandmark: isDelivery
              ? dto.address?.landmark?.trim() || null
              : null,

            promoCodeId: cart.promo?.valid ? cart.promo.id : null,
            promoCode: cart.promo?.valid ? cart.promo.code : null,

            expiresAt,

            items: {
              create: cart.items.map((item) => ({
                menuItemId: item.menuItemId,
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                lineTotal: item.lineTotal,
                selectedOptions:
                  item.selectedOptions as unknown as Prisma.InputJsonValue,
                notes: item.notes,
              })),
            },

            history: {
              create: {
                toStatus: OrderStatus.PENDING_PAYMENT,
                source: 'customer',
                changedById: requester.userId ?? null,
                note: 'Order placed by customer',
              },
            },
          },
          include: ORDER_INCLUDE,
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { promoCodeId: null },
        });

        return createdOrder;
      });
    } catch (error) {
      // Two identical requests raced past the replay check: the unique
      // idempotencyKey rejected the second insert, so replay the winner.
      if (this.isUniqueViolation(error)) {
        const winner = await this.prisma.order.findUnique({
          where: { idempotencyKey },
          include: ORDER_INCLUDE,
        });
        if (winner) {
          return this.replayOrder(winner, requester);
        }
      }
      throw error;
    }

    // 5. Start the Bachs payment session
    const payment = await this.ensurePaymentSession(order);

    return {
      order,
      payment,
      idempotentReplay: false,
    };
  }

  /**
   * GET /api/v1/orders/:idOrToken
   * Look up an order by ID or public tracking token.
   */
  async getOrder(
    idOrToken: string,
    access?: { userId?: string; role?: string; token?: string },
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: idOrToken }, { publicToken: idOrToken }],
      },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order "${idOrToken}" not found`);
    }

    const canView =
      access?.role === 'ADMIN' ||
      idOrToken === order.publicToken ||
      (access?.token !== undefined && access.token === order.publicToken) ||
      (access?.userId !== undefined && order.userId === access.userId);

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return order;
  }

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancel an order (customers only before PREPARING; staff any time before delivery).
   */
  async cancelOrder(
    id: string,
    dto: CancelOrderDto,
    actor: OrderActor,
    actorUserId?: string,
    guestToken?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    if (actor === 'CUSTOMER') {
      const isOwnerUser = Boolean(actorUserId) && order.userId === actorUserId;
      const isOwnerGuest =
        Boolean(guestToken) && order.publicToken === guestToken;

      if (!isOwnerUser && !isOwnerGuest) {
        throw new ForbiddenException(
          'You do not have permission to cancel this order',
        );
      }
    }

    assertTransition(order.status, OrderStatus.CANCELLED, actor, {
      type: order.type,
      hasRider: Boolean(order.riderName && order.riderPhone),
      isPaid: order.payments.some((p) => p.status === PaymentStatus.SUCCEEDED),
    });

    const note =
      dto.reason?.trim() ||
      (actor === 'ADMIN' ? 'Cancelled by staff' : 'Cancelled by customer');

    return this.prisma.$transaction(async (tx) => {
      // Conditional update: only cancel if nobody else (webhook, expiry job,
      // staff) changed the status since we read it.
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: OrderStatus.CANCELLED },
      });

      if (count === 0) {
        throw new ConflictException(
          'Order status changed while cancelling. Refresh and try again.',
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          source: actor === 'ADMIN' ? 'admin' : 'customer',
          changedById: actorUserId ?? null,
          note,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  /**
   * GET /api/v1/orders/me
   * Order history for the logged-in customer.
   */
  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { placedAt: 'desc' },
    });
  }

  /**
   * Scheduled job: expires orders still unpaid 30 minutes after placement.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnpaidOrders() {
    const dueOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 50,
    });

    for (const { id } of dueOrders) {
      try {
        const expired = await this.prisma.$transaction(async (tx) => {
          // Conditional update so a webhook that just marked the order PAID
          // is never overwritten with EXPIRED.
          const { count } = await tx.order.updateMany({
            where: { id, status: OrderStatus.PENDING_PAYMENT },
            data: { status: OrderStatus.EXPIRED },
          });

          if (count === 0) {
            return false;
          }

          await tx.orderStatusHistory.create({
            data: {
              orderId: id,
              fromStatus: OrderStatus.PENDING_PAYMENT,
              toStatus: OrderStatus.EXPIRED,
              source: 'expiry_job',
              note: 'Order expired: unpaid after 30 minutes',
            },
          });

          return true;
        });

        if (expired) {
          this.logger.log(`Expired unpaid order ${id}`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to expire order ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Returns an existing order for a repeated Idempotency-Key, retrying the
   * payment session if the first attempt never got one.
   */
  private async replayOrder(
    order: OrderWithRelations,
    requester: OrderRequester,
  ) {
    // A logged-in user's key must not reveal someone else's order.
    if (order.userId && order.userId !== requester.userId) {
      throw new ConflictException(
        'Idempotency-Key has already been used for a different order',
      );
    }

    const payment = await this.ensurePaymentSession(order);

    return {
      order,
      payment,
      idempotentReplay: true,
    };
  }

  /**
   * Reuses the order's existing checkout session, or creates one if the
   * order is still payable and has none yet.
   */
  private async ensurePaymentSession(order: OrderWithRelations) {
    const existingPayment = order.payments.find((p) => p.checkoutUrl);
    if (existingPayment) {
      return {
        paymentId: existingPayment.id,
        checkoutId: existingPayment.providerReference,
        checkoutUrl: existingPayment.checkoutUrl,
        status: existingPayment.status,
      };
    }

    const isPayable =
      order.status === OrderStatus.PENDING_PAYMENT &&
      order.expiresAt.getTime() > Date.now();

    if (!isPayable) {
      return null;
    }

    try {
      const session = await this.paymentsService.createSessionForOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        publicToken: order.publicToken,
        total: order.total,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
      });

      return {
        paymentId: session.paymentId,
        checkoutId: session.checkoutId,
        checkoutUrl: session.checkoutUrl,
        status: PaymentStatus.PENDING,
      };
    } catch (error) {
      this.logger.error(
        `Payment session failed for order ${order.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException({
        code: 'PAYMENT_INIT_FAILED',
        message:
          'Your order was saved but payment could not be started. Retry the same request with the same Idempotency-Key.',
        details: {
          orderId: order.id,
          publicToken: order.publicToken,
        },
      });
    }
  }

  /**
   * Logged-in users may only check out their own cart; guests must present
   * the cart token (X-Cart-Token header or cart_token cookie) of an unclaimed cart.
   * Responds 404 rather than 403 so cart IDs can't be probed.
   */
  private async assertCartOwnership(cartId: string, requester: OrderRequester) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, token: true },
    });

    const isOwner = requester.userId
      ? cart?.userId === requester.userId
      : Boolean(requester.cartToken) &&
        cart?.userId === null &&
        cart.token === requester.cartToken;

    if (!cart || !isOwner) {
      throw new NotFoundException('Cart not found');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
