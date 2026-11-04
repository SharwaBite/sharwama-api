import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PromoType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromosService } from './promos.service';

describe('PromosService', () => {
  let service: PromosService;
  let prisma: {
    promoCode: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      promoCode: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PromosService>(PromosService);
  });

  it('calculates PERCENT discount in kobo and validates active promo', async () => {
    prisma.promoCode.findUnique.mockResolvedValue({
      id: 'promo-1',
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: 10,
      minOrder: 500000,
      maxUses: 100,
      usedCount: 12,
      expiresAt: new Date(Date.now() + 86400_000),
      isActive: true,
    });

    const result = await service.validatePromo({
      code: '  welcome10 ',
      subtotal: 860000,
    });

    expect(prisma.promoCode.findUnique).toHaveBeenCalledWith({
      where: { code: 'WELCOME10' },
    });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(86000);
  });

  it('caps FIXED discount at the cart subtotal', () => {
    const discount = service.calculateDiscount(
      {
        id: 'promo-2',
        code: 'FLAT2K',
        type: PromoType.FIXED,
        value: 200000,
        minOrder: 0,
        maxUses: null,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
      },
      150000,
    );

    expect(discount).toBe(150000);
  });

  it('rejects expired, exhausted, or below-minOrder promo codes', async () => {
    prisma.promoCode.findUnique.mockResolvedValue({
      id: 'promo-1',
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: 10,
      minOrder: 500000,
      maxUses: 10,
      usedCount: 10,
      expiresAt: null,
      isActive: true,
    });

    await expect(
      service.validatePromo({ code: 'WELCOME10', subtotal: 600000 }),
    ).rejects.toThrow(BadRequestException);

    prisma.promoCode.findUnique.mockResolvedValue({
      id: 'promo-1',
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: 10,
      minOrder: 500000,
      maxUses: 100,
      usedCount: 5,
      expiresAt: null,
      isActive: true,
    });

    await expect(
      service.validatePromo({ code: 'WELCOME10', subtotal: 300000 }),
    ).rejects.toThrow(BadRequestException);
  });
});

