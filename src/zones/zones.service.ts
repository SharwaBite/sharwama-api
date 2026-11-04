import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
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
}
