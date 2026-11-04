import { Test, TestingModule } from '@nestjs/testing';
import { OrderType, PromoType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromosService } from '../promos/promos.service';
import { StoreSettingsService } from '../store-settings/store-settings.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let promosService: {
    evaluatePromo: jest.Mock;
  };
  let storeSettingsService: {
    getStoreStatus: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    promosService = {
      evaluatePromo: jest.fn(),
    };

    storeSettingsService = {
      getStoreStatus: jest.fn().mockResolvedValue({
        isOpen: true,
        minOrderAmount: 300000,
        closedMessage: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: PromosService, useValue: promosService },
        { provide: StoreSettingsService, useValue: storeSettingsService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('re-prices cart items, options, delivery zone fee, and promo discount accurately', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      token: 'tok-1',
      userId: null,
      orderType: OrderType.DELIVERY,
      zoneId: 'zone-1',
      promoCodeId: 'promo-1',
      updatedAt: new Date(),
      zone: {
        id: 'zone-1',
        name: 'Lekki Phase 1',
        fee: 150000,
        isActive: true,
      },
      promo: {
        id: 'promo-1',
        code: 'WELCOME10',
        type: PromoType.PERCENT,
        value: 10,
        minOrder: 500000,
        isActive: true,
      },
      items: [
        {
          id: 'citem-1',
          menuItemId: 'mitem-1',
          quantity: 2,
          notes: 'Extra spicy',
          selectedOptionIds: ['opt-1'],
          menuItem: {
            id: 'mitem-1',
            name: 'Classic Chicken Shawarma',
            imageUrl: null,
            cutoutUrl: null,
            basePrice: 350000,
            isAvailable: true,
            category: { id: 'cat-1', isActive: true },
            optionGroups: [
              {
                id: 'grp-1',
                name: 'Sausage',
                isRequired: false,
                minSelect: 0,
                maxSelect: 2,
                options: [
                  {
                    id: 'opt-1',
                    name: 'Double Sausage',
                    priceDelta: 80000,
                    isAvailable: true,
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    promosService.evaluatePromo.mockReturnValue({
      valid: true,
      discount: 86000,
    });

    const result = await service.formatAndPriceCart('cart-1');

    expect(result.items[0].unitPrice).toBe(430000);
    expect(result.items[0].lineTotal).toBe(860000);
    expect(result.subtotal).toBe(860000);
    expect(result.deliveryFee).toBe(150000);
    expect(result.discount).toBe(86000);
    expect(result.total).toBe(924000);
    expect(result.canCheckout).toBe(true);
    expect(result.hasUnavailableItems).toBe(false);
  });

  it('flags sold-out items and disables checkout without throwing', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-2',
      token: 'tok-2',
      userId: null,
      orderType: OrderType.PICKUP,
      zoneId: null,
      promoCodeId: null,
      updatedAt: new Date(),
      zone: null,
      promo: null,
      items: [
        {
          id: 'citem-2',
          menuItemId: 'mitem-2',
          quantity: 1,
          notes: null,
          selectedOptionIds: [],
          menuItem: {
            id: 'mitem-2',
            name: 'Beef SuYa Shawarma',
            imageUrl: null,
            cutoutUrl: null,
            basePrice: 400000,
            isAvailable: false,
            category: { id: 'cat-1', isActive: true },
            optionGroups: [],
          },
        },
      ],
    });

    const result = await service.formatAndPriceCart('cart-2');

    expect(result.items[0].isAvailable).toBe(false);
    expect(result.hasUnavailableItems).toBe(true);
    expect(result.canCheckout).toBe(false);
    expect(result.warnings).toContain(
      '"Beef SuYa Shawarma" is currently sold out',
    );
  });

  it('deletes stale carts untouched for 30 days', async () => {
    prisma.cart.deleteMany.mockResolvedValue({ count: 3 });

    const res = await service.cleanupStaleCarts();
    expect(res.count).toBe(3);
    expect(prisma.cart.deleteMany).toHaveBeenCalledTimes(1);
  });
});

