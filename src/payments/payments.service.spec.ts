import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BachsClient } from './bachs.client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let bachsClient: {
    verifyAndParseWebhook: jest.Mock;
    createCheckoutSession: jest.Mock;
    getCheckoutSession: jest.Mock;
  };
  let txMock: {
    $executeRaw: jest.Mock;
    payment: { findUnique: jest.Mock; update: jest.Mock };
    order: { findUnique: jest.Mock; update: jest.Mock };
    promoCode: { update: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
  };
  let prisma: {
    webhookEvent: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    payment: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    bachsClient = {
      verifyAndParseWebhook: jest.fn(),
      createCheckoutSession: jest.fn(),
      getCheckoutSession: jest.fn(),
    };

    txMock = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      promoCode: {
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
    };

    prisma = {
      webhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: typeof txMock) => unknown) =>
        cb(txMock),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BachsClient, useValue: bachsClient },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('ignores duplicate webhook deliveries that were already processed', async () => {
    bachsClient.verifyAndParseWebhook.mockReturnValue({
      id: 'evt_dup',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {},
    });
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'wh_1',
      providerEventId: 'evt_dup',
      processedAt: new Date(),
    });

    const res = await service.handleBachsWebhook(Buffer.from('{}'), {});
    expect(res).toEqual({ received: true, duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('transitions PENDING_PAYMENT order to PAID and increments promo usedCount on full payment', async () => {
    bachsClient.verifyAndParseWebhook.mockReturnValue({
      id: 'evt_paid_1',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {
        checkout_id: 'chk_100',
        reference: 'order_100',
        amount: '9240.00',
        currency: 'NGN',
      },
    });
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_100',
      orderId: 'order_100',
      amount: 924000,
    });
    txMock.payment.findUnique.mockResolvedValue({
      id: 'pay_100',
      status: PaymentStatus.PENDING,
    });
    txMock.order.findUnique.mockResolvedValue({
      id: 'order_100',
      status: OrderStatus.PENDING_PAYMENT,
      total: 924000,
      promoCodeId: 'promo_1',
    });

    const res = await service.handleBachsWebhook(Buffer.from('{}'), {});
    expect(res).toEqual({ received: true });

    expect(txMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay_100' },
        data: expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          paidAmount: 924000,
          needsReview: false,
        }),
      }),
    );
    expect(txMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_100' },
        data: expect.objectContaining({
          status: OrderStatus.PAID,
        }),
      }),
    );
    expect(txMock.promoCode.update).toHaveBeenCalledWith({
      where: { id: 'promo_1' },
      data: { usedCount: { increment: 1 } },
    });
  });

  it('flags underpaid or late payments with needsReview: true without marking order PAID', async () => {
    bachsClient.verifyAndParseWebhook.mockReturnValue({
      id: 'evt_late_1',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {
        checkout_id: 'chk_200',
        reference: 'order_200',
        amount: '9240.00',
        currency: 'NGN',
      },
    });
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_200',
      orderId: 'order_200',
      amount: 924000,
    });
    txMock.payment.findUnique.mockResolvedValue({
      id: 'pay_200',
      status: PaymentStatus.PENDING,
    });
    txMock.order.findUnique.mockResolvedValue({
      id: 'order_200',
      status: OrderStatus.EXPIRED,
      total: 924000,
      promoCodeId: null,
    });

    await service.handleBachsWebhook(Buffer.from('{}'), {});

    expect(txMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay_200' },
        data: expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          needsReview: true,
          reviewReason: 'Late payment received for expired order',
        }),
      }),
    );
    expect(txMock.order.update).not.toHaveBeenCalled();
  });
});

