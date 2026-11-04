import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCancelOrderDto,
  AdminOrdersQueryDto,
  AssignRiderDto,
  UpdateOrderStatusDto,
} from './dto/admin-order.dto';
import { assertTransition, getAllowedNextStatuses } from './order-status';

const ADMIN_ORDER_INCLUDE = {
  items: true,
  payments: {
    orderBy: { createdAt: 'desc' as const },
  },
  history: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  },
  zone: true,
  promo: true,
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
};

type AdminOrderPayload = Prisma.OrderGetPayload<{
  include: typeof ADMIN_ORDER_INCLUDE;
}>;

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/admin/orders
   * Paginated list of orders with status, fulfillment type, date range, and search filters.
   */
  async findAll(query: AdminOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.fromDate || query.toDate) {
      where.placedAt = {
        ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
      };
    }

    if (query.search) {
      const term = query.search.trim();
      const cleanedNumber = term.replace(/^#/, '');
      const parsedOrderNo = /^\d+$/.test(cleanedNumber)
        ? Number.parseInt(cleanedNumber, 10)
        : null;

      where.OR = [
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
        { customerEmail: { contains: term, mode: 'insensitive' } },
        ...(parsedOrderNo !== null ? [{ orderNumber: parsedOrderNo }] : []),
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ADMIN_ORDER_INCLUDE,
        orderBy: { placedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.withAllowedTransitions(order)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /api/admin/orders/:id
   * Full order detail with items, payments, status history, and allowed next transitions.
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    return this.withAllowedTransitions(order);
  }

  /**
   * PATCH /api/admin/orders/:id/status
   * Validates and executes an admin order status transition and records history.
   */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    adminUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    const isPaid = order.payments.some(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );

    assertTransition(order.status, dto.status, 'ADMIN', {
      type: order.type,
      hasRider: Boolean(order.riderName && order.riderPhone),
      isPaid,
    });

    const note =
      dto.note?.trim() || `Status updated from ${order.status} to ${dto.status}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: dto.status,
          ...(dto.status === OrderStatus.PAID && !order.paidAt
            ? { paidAt: new Date() }
            : {}),
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Order status was modified by another action. Please refresh and try again.',
        );
      }

      // If staff accepted a late payment on an EXPIRED order or marked the order REFUNDED,
      // clear any pending review flags on its payments.
      if (
        dto.status === OrderStatus.PAID ||
        dto.status === OrderStatus.REFUNDED
      ) {
        await tx.payment.updateMany({
          where: { orderId: order.id, needsReview: true },
          data: { needsReview: false },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: dto.status,
          source: 'admin',
          changedById: adminUserId,
          note,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ADMIN_ORDER_INCLUDE,
      });
    });

    return this.withAllowedTransitions(updated);
  }

  /**
   * PATCH /api/admin/orders/:id/rider
   * Assigns or updates the delivery rider on a DELIVERY order.
   * When `dispatchNow: true` and the order is READY, also transitions to OUT_FOR_DELIVERY.
   */
  async assignRider(id: string, dto: AssignRiderDto, adminUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    if (order.type !== OrderType.DELIVERY) {
      throw new BadRequestException(
        'Cannot assign a delivery rider to a PICKUP order',
      );
    }

    const isPaid = order.payments.some(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );

    const targetStatus = dto.dispatchNow
      ? OrderStatus.OUT_FOR_DELIVERY
      : order.status;

    if (dto.dispatchNow) {
      assertTransition(order.status, OrderStatus.OUT_FOR_DELIVERY, 'ADMIN', {
        type: order.type,
        hasRider: true,
        isPaid,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          riderName: dto.riderName,
          riderPhone: dto.riderPhone,
          status: targetStatus,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Order status was modified by another action. Please refresh and try again.',
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: targetStatus,
          source: 'admin',
          changedById: adminUserId,
          note: dto.dispatchNow
            ? `Assigned rider ${dto.riderName} (${dto.riderPhone}) and dispatched for delivery`
            : `Assigned rider ${dto.riderName} (${dto.riderPhone})`,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ADMIN_ORDER_INCLUDE,
      });
    });

    return this.withAllowedTransitions(updated);
  }

  /**
   * POST /api/admin/orders/:id/cancel
   * Cancels an order as staff/admin and records the reason in status history.
   */
  async cancelOrder(
    id: string,
    dto: AdminCancelOrderDto,
    adminUserId: string,
  ) {
    return this.updateStatus(
      id,
      {
        status: OrderStatus.CANCELLED,
        note: dto.reason || 'Order cancelled by staff',
      },
      adminUserId,
    );
  }

  private withAllowedTransitions(order: AdminOrderPayload) {
    const isPaid = order.payments.some(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );

    const allowedNextStatuses = getAllowedNextStatuses(order.status, 'ADMIN', {
      type: order.type,
      hasRider: Boolean(order.riderName && order.riderPhone),
      isPaid,
    });

    return {
      ...order,
      allowedNextStatuses,
    };
  }
}

