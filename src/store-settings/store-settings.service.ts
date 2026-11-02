import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreSettingsDto } from './dto/store-settings.dto';

export interface DaySchedule {
  open: string;
  close: string;
  closed?: boolean;
}

export type WeeklyOpeningHours = Record<string, DaySchedule>;

const DEFAULT_OPENING_HOURS: WeeklyOpeningHours = {
  mon: { open: '10:00', close: '22:00', closed: false },
  tue: { open: '10:00', close: '22:00', closed: false },
  wed: { open: '10:00', close: '22:00', closed: false },
  thu: { open: '10:00', close: '22:00', closed: false },
  fri: { open: '10:00', close: '23:00', closed: false },
  sat: { open: '10:00', close: '23:00', closed: false },
  sun: { open: '12:00', close: '22:00', closed: false },
};

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoreStatus() {
    const setting = await this.prisma.storeSetting.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        isOpenOverride: null,
        minOrderAmount: 0,
        shopPhone: null,
        shopAddress: null,
        openingHours: DEFAULT_OPENING_HOURS as unknown as Prisma.InputJsonValue,
      },
    });

    const openingHours: WeeklyOpeningHours =
      setting.openingHours && typeof setting.openingHours === 'object'
        ? {
            ...DEFAULT_OPENING_HOURS,
            ...(setting.openingHours as unknown as WeeklyOpeningHours),
          }
        : DEFAULT_OPENING_HOURS;

    const { isOpenBySchedule, todaySchedule } =
      this.evaluateScheduleInLagos(openingHours);

    const isOpen =
      setting.isOpenOverride !== null && setting.isOpenOverride !== undefined
        ? setting.isOpenOverride
        : isOpenBySchedule;

    const formattedOpenTime = this.formatTime12Hour(
      todaySchedule?.open ?? '10:00',
    );

    return {
      isOpen,
      isOpenOverride: setting.isOpenOverride,
      minOrderAmount: setting.minOrderAmount,
      shopPhone: setting.shopPhone,
      shopAddress: setting.shopAddress,
      openingHours,
      closedMessage: isOpen
        ? null
        : `We are closed right now. We open at ${formattedOpenTime}.`,
      updatedAt: setting.updatedAt,
    };
  }

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

    return this.getStoreStatus();
  }

  private evaluateScheduleInLagos(openingHours: WeeklyOpeningHours) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Lagos',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const weekday = (
      parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
    ).toLowerCase();
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '12';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const currentHm = `${hour === '24' ? '00' : hour}:${minute}`;

    const todaySchedule = openingHours[weekday] ?? DEFAULT_OPENING_HOURS.mon;

    if (!todaySchedule || todaySchedule.closed) {
      return { isOpenBySchedule: false, todaySchedule };
    }

    const isOpenBySchedule =
      currentHm >= todaySchedule.open && currentHm < todaySchedule.close;

    return { isOpenBySchedule, todaySchedule };
  }

  private formatTime12Hour(time24: string): string {
    const [rawHours, rawMinutes] = time24.split(':');
    const hours = Number.parseInt(rawHours ?? '10', 10);
    const minutes = rawMinutes ?? '00';
    if (Number.isNaN(hours)) {
      return '10:00 AM';
    }
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutes} ${suffix}`;
  }
}

