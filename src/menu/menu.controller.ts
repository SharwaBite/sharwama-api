import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../common';
import {
  ApiCreateCategoryDocs,
  ApiCreateMenuItemDocs,
  ApiCreateOptionDocs,
  ApiCreateOptionGroupDocs,
  ApiDeleteCategoryDocs,
  ApiDeleteMenuItemDocs,
  ApiDeleteOptionDocs,
  ApiDeleteOptionGroupDocs,
  ApiGetAdminMenuDocs,
  ApiGetMenuItemDocs,
  ApiGetPublicMenuDocs,
  ApiToggleItemAvailabilityDocs,
  ApiUpdateCategoryDocs,
  ApiUpdateMenuItemDocs,
  ApiUpdateOptionDocs,
  ApiUpdateOptionGroupDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
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

@ApiTags('Menu')
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ==========================================================================
  // PUBLIC MENU ENDPOINTS
  // ==========================================================================

  @Get('menu')
  @ApiGetPublicMenuDocs()
  getPublicMenu() {
    return this.menuService.getPublicMenu();
  }

  @Get('menu/items/:id')
  @ApiGetMenuItemDocs()
  getMenuItemById(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.getMenuItemById(id);
  }

  // ==========================================================================
  // ADMIN MENU OVERVIEW & CATEGORIES CRUD
  // ==========================================================================

  @Get('admin/menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiGetAdminMenuDocs()
  getAdminMenu() {
    return this.menuService.getAdminMenu();
  }

  @Post('admin/menu/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateCategoryDocs()
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Patch('admin/menu/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateCategoryDocs()
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('admin/menu/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteCategoryDocs()
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.deleteCategory(id);
  }

  // ==========================================================================
  // ADMIN MENU ITEMS & AVAILABILITY TOGGLE
  // ==========================================================================

  @Post('admin/menu/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateMenuItemDocs()
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Patch('admin/menu/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateMenuItemDocs()
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Patch('admin/menu/items/:id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiToggleItemAvailabilityDocs()
  toggleItemAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.menuService.toggleItemAvailability(id, dto);
  }

  @Delete('admin/menu/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteMenuItemDocs()
  deleteMenuItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  // ==========================================================================
  // ADMIN OPTION GROUPS & OPTIONS CRUD
  // ==========================================================================

  @Post('admin/menu/items/:itemId/option-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateOptionGroupDocs()
  createOptionGroup(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.menuService.createOptionGroup(itemId, dto);
  }

  @Patch('admin/menu/option-groups/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateOptionGroupDocs()
  updateOptionGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.menuService.updateOptionGroup(groupId, dto);
  }

  @Delete('admin/menu/option-groups/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteOptionGroupDocs()
  deleteOptionGroup(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.menuService.deleteOptionGroup(groupId);
  }

  @Post('admin/menu/option-groups/:groupId/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateOptionDocs()
  createOption(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.menuService.createOption(groupId, dto);
  }

  @Patch('admin/menu/options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateOptionDocs()
  updateOption(
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.menuService.updateOption(optionId, dto);
  }

  @Delete('admin/menu/options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteOptionDocs()
  deleteOption(@Param('optionId', ParseUUIDPipe) optionId: string) {
    return this.menuService.deleteOption(optionId);
  }
}
