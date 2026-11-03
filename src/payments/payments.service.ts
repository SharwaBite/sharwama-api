import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BachsClient, BachsWebhookEvent } from './bachs.client';

const RECONCILIATION_LOCK_ID = 8492019;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bachsClient: BachsClient,
  ) {}

  /**
   * Initializes a Bachs checkout session and stores a PENDING payment record.
   */
  async createSessionForOrder(order: {
    id: string;
    orderNumber: number;
    publicToken: string;
    total: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
  }) {
    const session = await this.bachsClient.createCheckoutSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
      amountKobo: order.total,
      currency: 'NGN',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      expiresInMinutes: 30,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'bachs',
        providerReference: session.checkout_id,
        checkoutUrl: session.checkout_url,
        status: PaymentStatus.PENDING,
        amount: order.total,
        currency: 'NGN',
      },
    });

    return {
      paymentId: payment.id,
      checkoutId: session.checkout_id,
      checkoutUrl: session.checkout_url,
      expiresAt: session.expires_at,
    };
  }

  /**
   * Processes verified Bachs webhook events (collection.succeeded, checkout.completed, collection.failed).
   * Deduplicates using WebhookEvent table.
   */
  async handleBachsWebhook(
    rawBody: Buffer | string | undefined,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const event = this.bachsClient.verifyAndParseWebhook(rawBody, headers);

    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (existingEvent?.processedAt) {
      this.logger.log(`Ignoring duplicate webhook event ${event.id}`);
      return { received: true, duplicate: true };
    }

    if (!existingEvent) {
      await this.prisma.webhookEvent.create({
        data: {
          providerEventId: event.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });
    }

    switch (event.type) {
      case 'collection.succeeded':
      case 'checkout.completed':
        await this.handlePaymentSucceeded(event);
        break;

      case 'collection.failed':
        await this.handlePaymentFailed(event);
        break;

      default:
        this.logger.log(`Unhandled Bachs webhook event type: ${event.type}`);
        break;
    }

    await this.prisma.webhookEvent.update({
      where: { providerEventId: event.id },
      data: { processedAt: new Date() },
    });

    return { received: true };
  }

  /**
   * Reconciliation cron job running every 5 minutes guarded by a Postgres advisory lock.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingPayments() {
    const lockRows = await this.prisma.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
      SELECT pg_try_advisory_lock(${RECONCILIATION_LOCK_ID}) as pg_try_advisory_lock;
    `;

    const acquired = lockRows[0]?.pg_try_advisory_lock ?? false;
    if (!acquired) {
      this.logger.debug(
        'Reconciliation job skipped: lock already held by another worker',
      );
      return;
    }

    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: { gte: twoHoursAgo },
          order: {
            status: OrderStatus.PENDING_PAYMENT,
          },
        },
        include: { order: true },
        take: 50,
      });

      for (const payment of pendingPayments) {
        try {
          const session = await this.bachsClient.getCheckoutSession(
            payment.providerReference,
          );
          if (!session) {
            continue;
          }

          const isPaid =
            session.payment_status === 'paid' ||
            (session.status === 'completed' &&
              session.charge?.status?.toLowerCase() === 'succeeded');

          if (isPaid) {
            const rawAmount = session.amount ?? session.charge?.amount;
            const paidKobo = rawAmount
              ? BachsClient.decimalStringToKobo(rawAmount)
              : payment.amount;

            await this.finalizeOrderPayment({
              orderId: payment.orderId,
              paymentId: payment.id,
              paidAmountKobo: paidKobo,
              source: 'reconciliation',
              note: 'Payment reconciled via Bachs API polling',
            });
          }
        } catch (error) {
          this.logger.error(
            `Error reconciling payment ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } finally {
      await this.prisma.$queryRaw`
        SELECT pg_advisory_unlock(${RECONCILIATION_LOCK_ID});
      `;
    }
  }

  /**
   * Admin lookup for flagged payments that require manual staff intervention.
   */
  async getFlaggedPayments() {
    return this.prisma.payment.findMany({
      where: { needsReview: true },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async handlePaymentSucceeded(event: BachsWebhookEvent) {
    const data = (event.data || {}) as Record<string, unknown>;
    const checkoutId = (data.checkout_id as string) || null;
    const orderId =
      (data.reference as string) ||
      ((data.metadata as Record<string, unknown>)?.order_id as string) ||
      null;

    let payment = checkoutId
      ? await this.prisma.payment.findUnique({
          where: { providerReference: checkoutId },
          include: { order: true },
        })
      : null;

    if (!payment && orderId) {
      payment = await this.prisma.payment.findFirst({
        where: { orderId },
        include: { order: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!payment) {
      this.logger.warn(
        `Received payment webhook for unknown checkout "${checkoutId}" / order "${orderId}"`,
      );
      return;
    }

    const rawAmount =
      (data.amount as string) ||
      ((data.charge as Record<string, unknown>)?.amount as string);
    const paidAmountKobo = rawAmount
      ? BachsClient.decimalStringToKobo(rawAmount)
      : payment.amount;

    await this.finalizeOrderPayment({
      orderId: payment.orderId,
      paymentId: payment.id,
      paidAmountKobo,
      rawWebhook: event as unknown as Prisma.InputJsonValue,
      source: 'webhook',
      note: 'Payment confirmed via Bachs webhook',
    });
  }

  private async handlePaymentFailed(event: BachsWebhookEvent) {
    const data = (event.data || {}) as Record<string, unknown>;
    const checkoutId = (data.checkout_id as string) || null;

    if (!checkoutId) {
      return;
    }

    await this.prisma.payment.updateMany({
      where: {
        providerReference: checkoutId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
        rawWebhook: event as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async finalizeOrderPayment(params: {
    orderId: string;
    paymentId: string;
    paidAmountKobo: number;
    rawWebhook?: Prisma.InputJsonValue;
    source: 'webhook' | 'reconciliation';
    note: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order ${params.orderId} not found`);
      }

      const isUnderpaid = params.paidAmountKobo < order.total;
      const isLatePayment =
        order.status === OrderStatus.EXPIRED ||
        order.status === OrderStatus.CANCELLED;

      let needsReview = false;
      let reviewReason: string | null = null;

      if (isUnderpaid) {
        needsReview = true;
        reviewReason = `Underpaid: received ${params.paidAmountKobo} kobo, expected ${order.total} kobo`;
      } else if (isLatePayment) {
        needsReview = true;
        reviewReason = `Late payment received for ${order.status.toLowerCase()} order`;
      }

      await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAmount: params.paidAmountKobo,
          paidAt: new Date(),
          needsReview,
          reviewReason,
          ...(params.rawWebhook !== undefined
            ? { rawWebhook: params.rawWebhook }
            : {}),
        },
      });

      if (!needsReview && order.status === OrderStatus.PENDING_PAYMENT) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paidAt: new Date(),
          },
        });

        if (order.promoCodeId) {
          await tx.promoCode.update({
            where: { id: order.promoCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.PAID,
            source: params.source,
            note: params.note,
          },
        });
      } else if (needsReview) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: order.status,
            source: params.source,
            note: `Payment flagged for review: ${reviewReason}`,
          },
        });
      }
    });
  }
}
