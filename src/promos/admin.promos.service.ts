import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromoType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto, UpdatePromoDto } from './dto/promo.dto';

@Injectable()
export class AdminPromosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promo) {
      throw new NotFoundException(`Promo code with ID "${id}" not found`);
    }

    return promo;
  }

  async create(dto: CreatePromoDto) {
    const normalizedCode = dto.code.trim().toUpperCase();

    if (dto.type === PromoType.PERCENT && dto.value > 100) {
      throw new BadRequestException(
        'Percentage discount value cannot exceed 100',
      );
    }

    const existing = await this.prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException(
        `Promo code "${normalizedCode}" already exists`,
      );
    }

    return this.prisma.promoCode.create({
      data: {
        code: normalizedCode,
        type: dto.type,
        value: dto.value,
        minOrder: dto.minOrder ?? 0,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePromoDto) {
    const existing = await this.findOne(id);

    const effectiveType = dto.type ?? existing.type;
    const effectiveValue = dto.value ?? existing.value;

    if (effectiveType === PromoType.PERCENT && effectiveValue > 100) {
      throw new BadRequestException(
        'Percentage discount value cannot exceed 100',
      );
    }

    let normalizedCode: string | undefined;
    if (dto.code !== undefined) {
      normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const duplicate = await this.prisma.promoCode.findUnique({
          where: { code: normalizedCode },
        });
        if (duplicate) {
          throw new ConflictException(
            `Promo code "${normalizedCode}" already exists`,
          );
        }
      }
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.minOrder !== undefined ? { minOrder: dto.minOrder } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.promoCode.delete({
      where: { id },
    });

    return {
      deleted: true,
      id,
    };
  }
}

