import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  CreateOptionDto,
  CreateOptionGroupDto,
  ToggleAvailabilityDto,
  UpdateCategoryDto,
  UpdateMenuItemDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
} from './dto/menu.dto';
import { MenuService } from './menu.service';

@Injectable()
export class AdminMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuService: MenuService,
  ) {}

  // ==========================================================================
  // ADMIN MENU OVERVIEW & CATEGORY CRUD
  // ==========================================================================

  async getAdminMenu() {
    const categories = await this.prisma.menuCategory.findMany({
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

    return { categories };
  }

  async createCategory(dto: CreateCategoryDto) {
    const category = await this.prisma.menuCategory.create({
      data: {
        name: dto.name.trim(),
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    this.menuService.invalidateMenuCache();
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);

    const category = await this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    this.menuService.invalidateMenuCache();
    return category;
  }

  async deleteCategory(id: string) {
    await this.ensureCategoryExists(id);

    const itemCount = await this.prisma.menuItem.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      throw new ConflictException({
        code: 'CATEGORY_NOT_EMPTY',
        message:
          'Cannot delete a category that still contains menu items. Move or delete its items first.',
      });
    }

    await this.prisma.menuCategory.delete({
      where: { id },
    });

    this.menuService.invalidateMenuCache();
    return { deleted: true, id };
  }

  private async ensureCategoryExists(id: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Menu category not found',
      });
    }
  }

  // ==========================================================================
  // ADMIN MENU ITEM CRUD & AVAILABILITY TOGGLE
  // ==========================================================================

  async createMenuItem(dto: CreateMenuItemDto) {
    await this.ensureCategoryExists(dto.categoryId);

    const item = await this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        basePrice: dto.basePrice,
        imageUrl: dto.imageUrl ?? null,
        cutoutUrl: dto.cutoutUrl ?? null,
        isAvailable: dto.isAvailable ?? true,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        ...(dto.optionGroups && dto.optionGroups.length > 0
          ? {
              optionGroups: {
                create: dto.optionGroups.map((group, groupIdx) => ({
                  name: group.name.trim(),
                  isRequired: group.isRequired ?? false,
                  minSelect: group.minSelect ?? 0,
                  maxSelect: group.maxSelect ?? 1,
                  sortOrder: group.sortOrder ?? groupIdx,
                  ...(group.options && group.options.length > 0
                    ? {
                        options: {
                          create: group.options.map((opt, optIdx) => ({
                            name: opt.name.trim(),
                            priceDelta: opt.priceDelta ?? 0,
                            imageUrl: opt.imageUrl ?? null,
                            isAvailable: opt.isAvailable ?? true,
                            sortOrder: opt.sortOrder ?? optIdx,
                          })),
                        },
                      }
                    : {}),
                })),
              },
            }
          : {}),
      },
      include: {
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    this.menuService.invalidateMenuCache();
    return item;
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    await this.menuService.getMenuItemById(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.cutoutUrl !== undefined ? { cutoutUrl: dto.cutoutUrl } : {}),
        ...(dto.isAvailable !== undefined
          ? { isAvailable: dto.isAvailable }
          : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    this.menuService.invalidateMenuCache();
    return updated;
  }

  async toggleItemAvailability(id: string, dto: ToggleAvailabilityDto) {
    await this.menuService.getMenuItemById(id);

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: dto.isAvailable },
      select: {
        id: true,
        name: true,
        isAvailable: true,
      },
    });

    this.menuService.invalidateMenuCache();
    return updated;
  }

  async deleteMenuItem(id: string) {
    await this.menuService.getMenuItemById(id);

    await this.prisma.menuItem.delete({
      where: { id },
    });

    this.menuService.invalidateMenuCache();
    return { deleted: true, id };
  }

  // ==========================================================================
  // ADMIN OPTION GROUPS & OPTIONS CRUD
  // ==========================================================================

  async createOptionGroup(itemId: string, dto: CreateOptionGroupDto) {
    await this.menuService.getMenuItemById(itemId);

    const minSelect = dto.minSelect ?? 0;
    const maxSelect = dto.maxSelect ?? 1;
    if (minSelect > maxSelect) {
      throw new BadRequestException({
        code: 'INVALID_OPTION_LIMITS',
        message: 'minSelect cannot be greater than maxSelect',
      });
    }

    const group = await this.prisma.optionGroup.create({
      data: {
        itemId,
        name: dto.name.trim(),
        isRequired: dto.isRequired ?? false,
        minSelect,
        maxSelect,
        sortOrder: dto.sortOrder ?? 0,
        ...(dto.options && dto.options.length > 0
          ? {
              options: {
                create: dto.options.map((opt, idx) => ({
                  name: opt.name.trim(),
                  priceDelta: opt.priceDelta ?? 0,
                  imageUrl: opt.imageUrl ?? null,
                  isAvailable: opt.isAvailable ?? true,
                  sortOrder: opt.sortOrder ?? idx,
                })),
              },
            }
          : {}),
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.menuService.invalidateMenuCache();
    return group;
  }

  async updateOptionGroup(groupId: string, dto: UpdateOptionGroupDto) {
    const existing = await this.prisma.optionGroup.findUnique({
      where: { id: groupId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'OPTION_GROUP_NOT_FOUND',
        message: 'Option group not found',
      });
    }

    const nextMin = dto.minSelect ?? existing.minSelect;
    const nextMax = dto.maxSelect ?? existing.maxSelect;
    if (nextMin > nextMax) {
      throw new BadRequestException({
        code: 'INVALID_OPTION_LIMITS',
        message: 'minSelect cannot be greater than maxSelect',
      });
    }

    const updated = await this.prisma.optionGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
        ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.menuService.invalidateMenuCache();
    return updated;
  }

  async deleteOptionGroup(groupId: string) {
    const existing = await this.prisma.optionGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'OPTION_GROUP_NOT_FOUND',
        message: 'Option group not found',
      });
    }

    await this.prisma.optionGroup.delete({
      where: { id: groupId },
    });

    this.menuService.invalidateMenuCache();
    return { deleted: true, id: groupId };
  }

  async createOption(groupId: string, dto: CreateOptionDto) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException({
        code: 'OPTION_GROUP_NOT_FOUND',
        message: 'Option group not found',
      });
    }

    const option = await this.prisma.option.create({
      data: {
        groupId,
        name: dto.name.trim(),
        priceDelta: dto.priceDelta ?? 0,
        imageUrl: dto.imageUrl ?? null,
        isAvailable: dto.isAvailable ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    this.menuService.invalidateMenuCache();
    return option;
  }

  async updateOption(optionId: string, dto: UpdateOptionDto) {
    const existing = await this.prisma.option.findUnique({
      where: { id: optionId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'OPTION_NOT_FOUND',
        message: 'Option not found',
      });
    }

    const updated = await this.prisma.option.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.isAvailable !== undefined
          ? { isAvailable: dto.isAvailable }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    this.menuService.invalidateMenuCache();
    return updated;
  }

  async deleteOption(optionId: string) {
    const existing = await this.prisma.option.findUnique({
      where: { id: optionId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'OPTION_NOT_FOUND',
        message: 'Option not found',
      });
    }

    await this.prisma.option.delete({
      where: { id: optionId },
    });

    this.menuService.invalidateMenuCache();
    return { deleted: true, id: optionId };
  }
}

