import {
  BadRequestException,
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
  payments: true,
  history: {
    orderBy: { createdAt: 'desc' as const },
  },
  zone: true,
  promo: true,
};

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
   */
  async createOrder(
    dto: CreateOrderDto,
    idempotencyKey?: string,
    actor?: { userId?: string; cartToken?: string },
  ) {
    // 1. Check idempotency key first
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: ORDER_INCLUDE,
      });

      if (existing) {
        const latestPayment = existing.payments[0];
        return {
          order: existing,
          payment: latestPayment
            ? {
                paymentId: latestPayment.id,
                checkoutId: latestPayment.providerReference,
                checkoutUrl: latestPayment.checkoutUrl,
              }
            : null,
          idempotentReplay: true,
        };
      }
    }

    // 2. Fetch and price the cart
    const cart = await this.cartService.formatAndPriceCart(dto.cartId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    // Cart ownership check
    if (actor?.userId && cart.userId && cart.userId !== actor.userId) {
      throw new ForbiddenException('You do not have access to this cart');
    }

    if (!cart.canCheckout) {
      const issues = cart.warnings.length > 0
        ? cart.warnings.join('; ')
        : 'Cart is not ready for checkout';
      throw new BadRequestException(`Cannot place order: ${issues}`);
    }

    // Address verification for DELIVERY
    if (cart.orderType === OrderType.DELIVERY) {
      if (!dto.address?.street?.trim()) {
        throw new BadRequestException(
          'Delivery street address is required for delivery orders',
        );
      }
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lifetime

    // 3. Snapshot cart into order within a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          idempotencyKey: idempotencyKey ?? null,
          userId: actor?.userId ?? cart.userId ?? null,
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

          zoneId: cart.zoneId,
          deliveryZoneName: cart.deliveryZone?.name ?? null,
          deliveryStreet:
            cart.orderType === OrderType.DELIVERY
              ? dto.address?.street?.trim() ?? null
              : null,
          deliveryLandmark:
            cart.orderType === OrderType.DELIVERY
              ? dto.address?.landmark?.trim() ?? null
              : null,

          promoCodeId: cart.promo?.id ?? null,
          promoCode: cart.promo?.code ?? null,

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
              note: 'Order placed by customer',
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      // Clear the cart items & promo so the cart is emptied upon checkout
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { promoCodeId: null },
      });

      return createdOrder;
    });

    // 4. Create the Bachs payment session
    const paymentSession = await this.paymentsService.createSessionForOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
      total: order.total,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
    });

    return {
      order,
      payment: paymentSession,
      idempotentReplay: false,
    };
  }

  /**
   * GET /api/v1/orders/:idOrToken
   * Look up order by ID or public tracking token.
   */
  async getOrder(
    idOrToken: string,
    actor?: { userId?: string; role?: string; token?: string },
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

    // Access check:
    // 1. Admin can access any order
    if (actor?.role === 'ADMIN') {
      return order;
    }

    // 2. Guest with public token matching order
    if (actor?.token && actor.token === order.publicToken) {
      return order;
    }

    // 3. Directly fetched by publicToken
    if (idOrToken === order.publicToken) {
      return order;
    }

    // 4. Authenticated user matching order.userId
    if (actor?.userId && order.userId === actor.userId) {
      return order;
    }

    throw new ForbiddenException('You do not have permission to view this order');
  }

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancel an order before preparation (customer or admin).
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

    // Customer ownership verification
    if (actor === 'CUSTOMER') {
      const isOwnerUser = actorUserId && order.userId === actorUserId;
      const isOwnerGuest = guestToken && order.publicToken === guestToken;

      if (!isOwnerUser && !isOwnerGuest) {
        throw new ForbiddenException(
          'You do not have permission to cancel this order',
        );
      }
    }

    const hasSucceededPayment = order.payments.some(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );

    assertTransition(order.status, OrderStatus.CANCELLED, actor, {
      type: order.type,
      hasRider: Boolean(order.riderName && order.riderPhone),
      isPaid: hasSucceededPayment,
    });

    const note = dto.reason?.trim() || (actor === 'ADMIN' ? 'Cancelled by staff' : 'Cancelled by customer');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
        include: ORDER_INCLUDE,
      });

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

      return updated;
    });
  }

  /**
   * List customer's own order history.
   */
  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { placedAt: 'desc' },
    });
  }

  /**
   * Scheduled cron job: expires unpaid orders older than 30 minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnpaidOrders() {
    const now = new Date();

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lte: now },
      },
      select: { id: true, status: true },
      take: 50,
    });

    for (const order of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.EXPIRED },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: OrderStatus.PENDING_PAYMENT,
              toStatus: OrderStatus.EXPIRED,
              source: 'expiry_job',
              note: 'Order expired: unpaid after 30 minutes',
            },
          });
        });

        this.logger.log(`Expired unpaid order ${order.id}`);
      } catch (err) {
        this.logger.error(
          `Failed to expire order ${order.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
