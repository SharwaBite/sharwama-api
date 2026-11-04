import { BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderType } from '../generated/prisma/client';
import {
  assertTransition,
  canTransition,
  getAllowedNextStatuses,
} from './order-status';

describe('Order Status State Machine', () => {
  it('allows SYSTEM to transition PENDING_PAYMENT to PAID or EXPIRED, but blocks CUSTOMER/ADMIN from setting PAID directly', () => {
    const ctx = { type: OrderType.DELIVERY, hasRider: false, isPaid: false };

    expect(
      canTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        'SYSTEM',
        ctx,
      ),
    ).toBe(true);

    expect(
      canTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        'CUSTOMER',
        ctx,
      ),
    ).toBe(false);

    expect(
      canTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        'ADMIN',
        ctx,
      ),
    ).toBe(false);
  });

  it('allows customer cancellation before PREPARING and blocks customer cancellation at PREPARING or later', () => {
    const ctx = { type: OrderType.DELIVERY, hasRider: false, isPaid: true };

    expect(
      canTransition(OrderStatus.PAID, OrderStatus.CANCELLED, 'CUSTOMER', ctx),
    ).toBe(true);
    expect(
      canTransition(
        OrderStatus.ACCEPTED,
        OrderStatus.CANCELLED,
        'CUSTOMER',
        ctx,
      ),
    ).toBe(true);

    expect(() =>
      assertTransition(
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
        'CUSTOMER',
        ctx,
      ),
    ).toThrow(BadRequestException);

    // Admin can still cancel during PREPARING
    expect(
      canTransition(
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
        'ADMIN',
        ctx,
      ),
    ).toBe(true);
  });

  it('requires a rider before transitioning a DELIVERY order from READY to OUT_FOR_DELIVERY', () => {
    expect(() =>
      assertTransition(
        OrderStatus.READY,
        OrderStatus.OUT_FOR_DELIVERY,
        'ADMIN',
        {
          type: OrderType.DELIVERY,
          hasRider: false,
          isPaid: true,
        },
      ),
    ).toThrow(BadRequestException);

    expect(
      canTransition(OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, 'ADMIN', {
        type: OrderType.DELIVERY,
        hasRider: true,
        isPaid: true,
      }),
    ).toBe(true);
  });

  it('returns correct allowedNextStatuses for PICKUP vs DELIVERY at READY', () => {
    const pickupNext = getAllowedNextStatuses(OrderStatus.READY, 'ADMIN', {
      type: OrderType.PICKUP,
      hasRider: false,
      isPaid: true,
    });
    expect(pickupNext).toContain(OrderStatus.PICKED_UP);
    expect(pickupNext).not.toContain(OrderStatus.OUT_FOR_DELIVERY);

    const deliveryNextWithRider = getAllowedNextStatuses(
      OrderStatus.READY,
      'ADMIN',
      {
        type: OrderType.DELIVERY,
        hasRider: true,
        isPaid: true,
      },
    );
    expect(deliveryNextWithRider).toContain(OrderStatus.OUT_FOR_DELIVERY);
    expect(deliveryNextWithRider).not.toContain(OrderStatus.PICKED_UP);
  });
});

