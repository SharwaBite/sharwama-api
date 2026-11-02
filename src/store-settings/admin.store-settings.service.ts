import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreSettingsDto } from './dto/store-settings.dto';
import {
  DEFAULT_OPENING_HOURS,
  StoreSettingsService,
} from './store-settings.service';

@Injectable()
export class AdminStoreSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeSettingsService: StoreSettingsService,
  ) {}

  async updateStoreSettings(dto: UpdateStoreSettingsDto) {
    await this.prisma.storeSetting.upsert({
      where: { id: 1 },
      update: {
        ...(dto.isOpenOverride !== undefined
          ? { isOpenOverride: dto.isOpenOverride }
          : {}),
        ...(dto.minOrderAmount !== undefined
          ? { minOrderAmount: dto.minOrderAmount }
          : {}),
        ...(dto.shopPhone !== undefined ? { shopPhone: dto.shopPhone } : {}),
        ...(dto.shopAddress !== undefined
          ? { shopAddress: dto.shopAddress }
          : {}),
        ...(dto.openingHours !== undefined
          ? {
              openingHours:
                dto.openingHours as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
      create: {
        id: 1,
        isOpenOverride: dto.isOpenOverride ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,
        shopPhone: dto.shopPhone ?? null,
        shopAddress: dto.shopAddress ?? null,
        openingHours: (dto.openingHours ??
          DEFAULT_OPENING_HOURS) as unknown as Prisma.InputJsonValue,
      },
    });

    return this.storeSettingsService.getStoreStatus();
  }
}

