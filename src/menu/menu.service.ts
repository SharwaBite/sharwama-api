import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MENU_CACHE_TTL_MS = 60_000; 

@Injectable()
export class MenuService {
  private cachedCategories: unknown[] | null = null;
  private cacheExpiresAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  invalidateMenuCache() {
    this.cachedCategories = null;
    this.cacheExpiresAt = 0;
  }

  async getPublicMenu() {
    const categories = await this.getCachedPublicCategories();
    return { categories };
  }

  private async getCachedPublicCategories() {
    const now = Date.now();
    if (this.cachedCategories && now < this.cacheExpiresAt) {
      return this.cachedCategories;
    }

    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            optionGroups: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                options: {
                  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    this.cachedCategories = categories;
    this.cacheExpiresAt = now + MENU_CACHE_TTL_MS;
    return categories;
  }

  async getMenuItemById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        optionGroups: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            options: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException({
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'Menu item not found',
      });
    }

    return item;
  }
}
