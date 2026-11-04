import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type FlaggedPaymentResolutionAction =
  | 'ACCEPT_ORDER'
  | 'MARK_REFUNDED'
  | 'DISMISS';

export class ResolveFlaggedPaymentDto {
  @IsIn(['ACCEPT_ORDER', 'MARK_REFUNDED', 'DISMISS'])
  action: FlaggedPaymentResolutionAction;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/admin/payments/flagged
   * Lists all payments flagged with `needsReview: true` (underpaid or late payment on expired/cancelled order).
   */
  async findFlaggedPayments() {
    return this.prisma.payment.findMany({
      where: { needsReview: true },
      include: {
        order: {
          include: {
            items: true,
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
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * PATCH /api/admin/payments/:id/resolve
   * Resolves a flagged payment by accepting the order as PAID, marking it REFUNDED, or dismissing the review flag.
   */
  async resolveFlaggedPayment(
    paymentId: string,
    dto: ResolveFlaggedPaymentDto,
    adminUserId: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment "${paymentId}" not found`);
    }

    if (!payment.needsReview) {
      throw new BadRequestException(
        `Payment "${paymentId}" is not currently flagged for review`,
      );
    }

    const { order } = payment;

    let targetOrderStatus = order.status;
    let defaultNote = 'Flagged payment review dismissed by staff';

    if (dto.action === 'ACCEPT_ORDER') {
      targetOrderStatus = OrderStatus.PAID;
      defaultNote = 'Flagged payment reviewed and order accepted as PAID';
    } else if (dto.action === 'MARK_REFUNDED') {
      targetOrderStatus = OrderStatus.REFUNDED;
      defaultNote = 'Flagged payment reviewed and order marked as REFUNDED';
    }

    const historyNote = dto.note || defaultNote;

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          needsReview: false,
        },
      });

      if (targetOrderStatus !== order.status) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: targetOrderStatus,
            ...(targetOrderStatus === OrderStatus.PAID && !order.paidAt
              ? { paidAt: new Date() }
              : {}),
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: targetOrderStatus,
          source: 'admin',
          changedById: adminUserId,
          note: historyNote,
        },
      });

      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          payments: true,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        payment: updatedPayment,
        order: updatedOrder,
      };
    });
  }
}

