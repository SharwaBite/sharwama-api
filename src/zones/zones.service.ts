import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from './dto/delivery-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.deliveryZone.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException({
        code: 'ZONE_NOT_FOUND',
        message: 'Delivery zone not found',
      });
    }

    return zone;
  }

  async findActiveZoneOrThrow(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone || !zone.isActive) {
      throw new BadRequestException({
        code: 'OUT_OF_DELIVERY_AREA',
        message:
          'We do not deliver to this area yet. You can choose pickup instead.',
      });
    }

    return zone;
  }

  async create(dto: CreateDeliveryZoneDto) {
    const cleanedAreas = Array.from(
      new Set(dto.areas.map((area) => area.trim()).filter(Boolean)),
    );

    return this.prisma.deliveryZone.create({
      data: {
        name: dto.name.trim(),
        areas: cleanedAreas,
        fee: dto.fee,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDeliveryZoneDto) {
    await this.findOne(id);

    const cleanedAreas = dto.areas
      ? Array.from(
          new Set(dto.areas.map((area) => area.trim()).filter(Boolean)),
        )
      : undefined;

    return this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(cleanedAreas !== undefined ? { areas: cleanedAreas } : {}),
        ...(dto.fee !== undefined ? { fee: dto.fee } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.deliveryZone.delete({
      where: { id },
    });

    return {
      deleted: true,
      id,
    };
  }
}
