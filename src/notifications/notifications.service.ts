import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, OrderType } from '../generated/prisma/client';

export interface OrderNotificationPayload {
  id: string;
  orderNumber: number;
  publicToken: string;
  type: OrderType;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  total: number;
  riderName?: string | null;
  riderPhone?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Dispatches a customer & kitchen notification when an order status changes.
   * Never throws so notification failures cannot break order or webhook flows.
   */
  async notifyOrderStatusChanged(order: OrderNotificationPayload) {
    const totalNaira = (order.total / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const message = this.buildCustomerMessage(order, totalNaira);

    this.logger.log(
      `[Order #${order.orderNumber} -> ${order.status}] To ${order.customerName} (${order.customerPhone}): ${message}`,
    );

    await this.postWebhookIfConfigured({
      event: 'order.status_changed',
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      type: order.type,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? null,
      totalKobo: order.total,
      totalFormatted: `₦${totalNaira}`,
      riderName: order.riderName ?? null,
      riderPhone: order.riderPhone ?? null,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Alerts staff when a payment is flagged for manual review (underpaid or late payment).
   */
  async notifyFlaggedPayment(
    order: OrderNotificationPayload,
    reviewReason: string,
  ) {
    this.logger.warn(
      `[Flagged Payment - Order #${order.orderNumber}] ${reviewReason}`,
    );

    await this.postWebhookIfConfigured({
      event: 'payment.flagged_for_review',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      reviewReason,
      timestamp: new Date().toISOString(),
    });
  }

  private buildCustomerMessage(
    order: OrderNotificationPayload,
    totalNaira: string,
  ): string {
    switch (order.status) {
      case OrderStatus.PAID:
        return `Payment of ₦${totalNaira} confirmed for Order #${order.orderNumber}. Waiting for the kitchen to accept your order.`;
      case OrderStatus.ACCEPTED:
        return `Order #${order.orderNumber} has been accepted by the kitchen!`;
      case OrderStatus.PREPARING:
        return `Your shawarma for Order #${order.orderNumber} is now being prepared fresh on the grill.`;
      case OrderStatus.READY:
        return order.type === OrderType.PICKUP
          ? `Order #${order.orderNumber} is ready for pickup at the shop!`
          : `Order #${order.orderNumber} is packed and ready for dispatch.`;
      case OrderStatus.OUT_FOR_DELIVERY:
        return order.riderName && order.riderPhone
          ? `Order #${order.orderNumber} is out for delivery with rider ${order.riderName} (${order.riderPhone}).`
          : `Order #${order.orderNumber} is out for delivery.`;
      case OrderStatus.DELIVERED:
        return `Order #${order.orderNumber} has been delivered. Enjoy your meal!`;
      case OrderStatus.PICKED_UP:
        return `Order #${order.orderNumber} has been picked up. Enjoy your meal!`;
      case OrderStatus.CANCELLED:
        return `Order #${order.orderNumber} has been cancelled.`;
      case OrderStatus.REFUNDED:
        return `Order #${order.orderNumber} has been refunded.`;
      default:
        return `Order #${order.orderNumber} status is now ${order.status}.`;
    }
  }

  private async postWebhookIfConfigured(payload: Record<string, unknown>) {
    const webhookUrl = this.configService.get<string>(
      'NOTIFICATION_WEBHOOK_URL',
    );
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.logger.warn(
        `Notification webhook delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
