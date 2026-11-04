import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      include: { zone: true },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.zoneId) {
      await this.validateActiveZone(dto.zoneId);
    }

    const existingCount = await this.prisma.address.count({
      where: { userId },
    });

    const shouldBeDefault = existingCount === 0 || Boolean(dto.isDefault);

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault && existingCount > 0) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: dto.label || null,
          street: dto.street,
          landmark: dto.landmark || null,
          zoneId: dto.zoneId || null,
          isDefault: shouldBeDefault,
        },
        include: { zone: true },
      });
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    if (dto.zoneId) {
      await this.validateActiveZone(dto.zoneId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, id: { not: addressId }, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label || null } : {}),
          ...(dto.street !== undefined ? { street: dto.street } : {}),
          ...(dto.landmark !== undefined
            ? { landmark: dto.landmark || null }
            : {}),
          ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId || null } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
        include: { zone: true },
      });
    });
  }

  async remove(userId: string, addressId: string) {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id: addressId },
      });

      if (existing.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { id: 'desc' },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return {
      deleted: true,
      id: addressId,
    };
  }

  private async validateActiveZone(zoneId: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new NotFoundException(`Delivery zone "${zoneId}" not found`);
    }

    if (!zone.isActive) {
      throw new BadRequestException(
        `Delivery zone "${zone.name}" is currently unavailable`,
      );
    }
  }
}

