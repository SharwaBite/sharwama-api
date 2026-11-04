import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common';
import { PromoType } from './../src/generated/prisma/enums';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Sharwama API (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    storeSetting: {
      upsert: jest.fn().mockResolvedValue({
        id: 1,
        isOpenOverride: true,
        minOrderAmount: 200000,
        shopPhone: '+2348012345678',
        shopAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
        openingHours: null,
        updatedAt: new Date(),
      }),
    },
    menuCategory: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Shawarma Wraps',
          slug: 'shawarma-wraps',
          isActive: true,
          sortOrder: 0,
          items: [],
        },
      ]),
    },
    deliveryZone: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'zone-1',
          name: 'Lekki Phase 1',
          fee: 150000,
          estimatedMins: 35,
          isActive: true,
        },
      ]),
    },
    promoCode: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'promo-1',
        code: 'SHARWAMA10',
        type: PromoType.PERCENT,
        value: 10,
        minOrder: 300000,
        maxUses: 100,
        usedCount: 5,
        expiresAt: null,
        isActive: true,
      }),
    },
    cart: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 OK outside /api prefix', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/store-settings returns store configuration', async () => {
    const res = await request(app.getHttpServer()).get('/api/store-settings').expect(200);
    expect(res.body.isOpen).toBe(true);
    expect(res.body.minOrderAmount).toBe(200000);
  });

  it('GET /api/menu returns active menu categories', async () => {
    const res = await request(app.getHttpServer()).get('/api/menu').expect(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories[0].slug).toBe('shawarma-wraps');
  });

  it('GET /api/delivery-zones returns active delivery zones', async () => {
    const res = await request(app.getHttpServer()).get('/api/delivery-zones').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Lekki Phase 1');
  });

  it('POST /api/promo/validate validates promo code and enforces ValidationPipe', async () => {
    const validRes = await request(app.getHttpServer())
      .post('/api/promo/validate')
      .send({ code: 'sharwama10', subtotal: 500000 })
      .expect(200);

    expect(validRes.body.valid).toBe(true);
    expect(validRes.body.code).toBe('SHARWAMA10');
    expect(validRes.body.discount).toBe(50000);

    await request(app.getHttpServer())
      .post('/api/promo/validate')
      .send({ code: 'SHARWAMA10', subtotal: -100, extraField: 'forbidden' })
      .expect(400);
  });

  it('GET /api/cart returns empty priced cart structure for new guest', async () => {
    const res = await request(app.getHttpServer()).get('/api/cart').expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.canCheckout).toBe(false);
  });

  it('GET /api/admin/orders rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get('/api/admin/orders').expect(401);
  });
});
