import { BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderType } from '../generated/prisma/client';

/**
 * Who is attempting the status change.
 * - CUSTOMER: the order owner (logged-in user or guest with the public token)
 * - ADMIN: staff dashboard
 * - SYSTEM: Bachs webhook, payment reconciliation job, or the expiry job
 */
export type OrderActor = 'CUSTOMER' | 'ADMIN' | 'SYSTEM';

/**
 * Value written to OrderStatusHistory.source for every status change.
 */
export type OrderStatusSource =
  | 'customer'
  | 'admin'
  | 'webhook'
  | 'reconciliation'
  | 'expiry_job';

/**
 * Facts about the order that some transitions depend on.
 */
export interface TransitionContext {
  type: OrderType;
  /** True when a rider name and phone have been set on the order. */
  hasRider: boolean;
  /** True when a SUCCEEDED payment exists for the order. */
  isPaid: boolean;
}

interface TransitionRule {
  actors: OrderActor[];
  /** Returns an error message when the transition is not allowed, otherwise null. */
  check?: (ctx: TransitionContext) => string | null;
}

const requirePaid = (ctx: TransitionContext) =>
  ctx.isPaid ? null : 'Order has no successful payment';

/**
 * Allowed transitions: TRANSITIONS[from][to] = rule.
 * Anything not listed here is rejected.
 *
 * Happy path:
 * PENDING_PAYMENT -> PAID -> ACCEPTED -> PREPARING -> READY
 *   -> OUT_FOR_DELIVERY -> DELIVERED   (DELIVERY orders)
 *   -> PICKED_UP                        (PICKUP orders)
 */
const TRANSITIONS: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, TransitionRule>>>
> = {
  [OrderStatus.PENDING_PAYMENT]: {
    // PAID is only ever set by the webhook or reconciliation, never by a redirect.
    [OrderStatus.PAID]: { actors: ['SYSTEM'] },
    [OrderStatus.EXPIRED]: { actors: ['SYSTEM'] },
    [OrderStatus.CANCELLED]: { actors: ['CUSTOMER', 'ADMIN'] },
  },
  [OrderStatus.PAID]: {
    [OrderStatus.ACCEPTED]: { actors: ['ADMIN'] },
    [OrderStatus.CANCELLED]: { actors: ['CUSTOMER', 'ADMIN'] },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.ACCEPTED]: {
    [OrderStatus.PREPARING]: { actors: ['ADMIN'] },
    [OrderStatus.CANCELLED]: { actors: ['CUSTOMER', 'ADMIN'] },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.PREPARING]: {
    [OrderStatus.READY]: { actors: ['ADMIN'] },
    [OrderStatus.CANCELLED]: { actors: ['ADMIN'] },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.READY]: {
    [OrderStatus.OUT_FOR_DELIVERY]: {
      actors: ['ADMIN'],
      check: (ctx) => {
        if (ctx.type !== OrderType.DELIVERY) {
          return 'Only DELIVERY orders can go out for delivery';
        }
        if (!ctx.hasRider) {
          return 'Set the rider name and phone before sending the order out';
        }
        return null;
      },
    },
    [OrderStatus.PICKED_UP]: {
      actors: ['ADMIN'],
      check: (ctx) =>
        ctx.type === OrderType.PICKUP
          ? null
          : 'Only PICKUP orders can be marked as picked up',
    },
    [OrderStatus.CANCELLED]: { actors: ['ADMIN'] },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    [OrderStatus.DELIVERED]: { actors: ['ADMIN'] },
    [OrderStatus.CANCELLED]: { actors: ['ADMIN'] },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.DELIVERED]: {
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.PICKED_UP]: {
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.CANCELLED]: {
    // A paid order that was cancelled still needs its money returned.
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  [OrderStatus.EXPIRED]: {
    // Late payment (arrived after expiry): the webhook flags it for review,
    // then staff either accept the order or refund the customer.
    [OrderStatus.PAID]: { actors: ['ADMIN'], check: requirePaid },
    [OrderStatus.REFUNDED]: { actors: ['ADMIN'], check: requirePaid },
  },
  // REFUNDED is terminal.
};

/** Statuses from which nothing else can happen. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  OrderStatus.REFUNDED,
];

/** Statuses a customer may still cancel from (before PREPARING). */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
];

/** Orders the kitchen is actively working on (for dashboards). */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

/**
 * Returns the error message for a transition, or null if it is allowed.
 */
export function getTransitionError(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  ctx: TransitionContext,
): string | null {
  if (from === to) {
    return `Order is already ${from}`;
  }

  const rule = TRANSITIONS[from]?.[to];
  if (!rule) {
    return `Cannot change order status from ${from} to ${to}`;
  }

  if (!rule.actors.includes(actor)) {
    if (actor === 'CUSTOMER' && to === OrderStatus.CANCELLED) {
      return 'This order can no longer be cancelled because it is already being prepared';
    }
    return `Changing order status from ${from} to ${to} is not allowed for ${actor.toLowerCase()}`;
  }

  return rule.check ? rule.check(ctx) : null;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  ctx: TransitionContext,
): boolean {
  return getTransitionError(from, to, actor, ctx) === null;
}

/**
 * Throws BadRequestException when the transition is not allowed.
 */
export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  ctx: TransitionContext,
): void {
  const error = getTransitionError(from, to, actor, ctx);
  if (error) {
    throw new BadRequestException(error);
  }
}

/**
 * Next statuses the given actor may move the order to (useful for admin UI buttons).
 */
export function getAllowedNextStatuses(
  from: OrderStatus,
  actor: OrderActor,
  ctx: TransitionContext,
): OrderStatus[] {
  const targets = Object.keys(TRANSITIONS[from] ?? {}) as OrderStatus[];
  return targets.filter((to) => canTransition(from, to, actor, ctx));
}

