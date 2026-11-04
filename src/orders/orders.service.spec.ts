import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../cart/cart.service';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '../generated/prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let cartService: {
    formatAndPriceCart: jest.Mock;
  };
  let paymentsService: {
    createSessionForOrder: jest.Mock;
  };
  let txMock: {
    order: { create: jest.Mock; updateMany: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    cart: { update: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
  };
  let prisma: {
    order: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    cart: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    cartService = {
      formatAndPriceCart: jest.fn(),
    };

    paymentsService = {
      createSessionForOrder: jest.fn(),
    };

    txMock = {
      order: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      cart: {
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
    };

    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: typeof txMock) => unknown) =>
        cb(txMock),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('replays an existing order when Idempotency-Key was already used', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 1001,
      publicToken: 'pub-tok-1',
      userId: null,
      status: OrderStatus.PENDING_PAYMENT,
      total: 924000,
      expiresAt: new Date(Date.now() + 600_000),
      payments: [
        {
          id: 'pay-1',
          providerReference: 'chk_123',
          checkoutUrl: 'https://checkout.bachs.io/c/123',
          status: PaymentStatus.PENDING,
        },
      ],
    });

    const result = await service.createOrder(
      {
        cartId: 'cart-1',
        customer: { name: 'Ada Obi', phone: '08031234567' },
      },
      'idem-key-12345',
      { cartToken: 'tok-1' },
    );

    expect(result.idempotentReplay).toBe(true);
    expect(result.order.id).toBe('order-1');
    expect(result.payment?.checkoutId).toBe('chk_123');
    expect(cartService.formatAndPriceCart).not.toHaveBeenCalled();
  });

  it('rejects guest checkout when cartToken does not match the cart', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.cart.findUnique.mockResolvedValue({
      userId: null,
      token: 'real-cart-token',
    });

    await expect(
      service.createOrder(
        {
          cartId: 'cart-1',
          customer: { name: 'Ada Obi', phone: '08031234567' },
        },
        'idem-key-99999',
        { cartToken: 'wrong-cart-token' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('snapshots a valid cart into an order, empties the cart, and creates a Bachs session', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.cart.findUnique.mockResolvedValue({
      userId: null,
      token: 'guest-tok-1',
    });

    cartService.formatAndPriceCart.mockResolvedValue({
      id: 'cart-1',
      userId: null,
      orderType: OrderType.DELIVERY,
      zoneId: 'zone-1',
      deliveryZone: { id: 'zone-1', name: 'Lekki Phase 1', fee: 150000 },
      promo: { id: 'promo-1', code: 'WELCOME10', valid: true },
      subtotal: 860000,
      deliveryFee: 150000,
      discount: 86000,
      total: 924000,
      canCheckout: true,
      warnings: [],
      items: [
        {
          menuItemId: 'mitem-1',
          name: 'Classic Chicken Shawarma',
          unitPrice: 430000,
          quantity: 2,
          lineTotal: 860000,
          selectedOptions: [],
          notes: null,
        },
      ],
    });

    txMock.order.create.mockResolvedValue({
      id: 'order-new',
      orderNumber: 1002,
      publicToken: 'pub-tok-2',
      userId: null,
      status: OrderStatus.PENDING_PAYMENT,
      total: 924000,
      customerName: 'Ada Obi',
      customerPhone: '08031234567',
      customerEmail: 'ada@sharwama.ng',
      expiresAt: new Date(Date.now() + 1800_000),
      payments: [],
    });

    paymentsService.createSessionForOrder.mockResolvedValue({
      paymentId: 'pay-new',
      checkoutId: 'chk_new',
      checkoutUrl: 'https://checkout.bachs.io/c/new',
    });

    const result = await service.createOrder(
      {
        cartId: 'cart-1',
        customer: {
          name: 'Ada Obi',
          phone: '08031234567',
          email: 'ada@sharwama.ng',
        },
        address: {
          street: '14 Admiralty Way',
          landmark: 'Opposite Ebeano',
        },
      },
      'idem-key-new-001',
      { cartToken: 'guest-tok-1' },
    );

    expect(result.idempotentReplay).toBe(false);
    expect(result.order.id).toBe('order-new');
    expect(result.payment?.checkoutUrl).toBe(
      'https://checkout.bachs.io/c/new',
    );
    expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-1' },
    });
  });

  it('expires unpaid orders past 30 minutes using a conditional status update', async () => {
    prisma.order.findMany.mockResolvedValue([{ id: 'stale-order-1' }]);
    txMock.order.updateMany.mockResolvedValue({ count: 1 });

    await service.expireUnpaidOrders();

    expect(txMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'stale-order-1', status: OrderStatus.PENDING_PAYMENT },
      data: { status: OrderStatus.EXPIRED },
    });
    expect(txMock.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'stale-order-1',
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: OrderStatus.EXPIRED,
          source: 'expiry_job',
        }),
      }),
    );
  });
});

