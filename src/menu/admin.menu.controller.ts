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
  ApiToggleItemAvailabilityDocs,
  ApiUpdateCategoryDocs,
  ApiUpdateMenuItemDocs,
  ApiUpdateOptionDocs,
  ApiUpdateOptionGroupDocs,
} from '../common/swagger/api-docs';
import { Role } from '../generated/prisma/client';
import { AdminMenuService } from './admin.menu.service';
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

@Controller('admin/menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminMenuController {
  constructor(private readonly adminMenuService: AdminMenuService) {}

  // ==========================================================================
  // ADMIN MENU OVERVIEW & CATEGORIES CRUD
  // ==========================================================================

  @Get()
  @ApiGetAdminMenuDocs()
  getAdminMenu() {
    return this.adminMenuService.getAdminMenu();
  }

  @Post('categories')
  @ApiCreateCategoryDocs()
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminMenuService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiUpdateCategoryDocs()
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminMenuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiDeleteCategoryDocs()
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminMenuService.deleteCategory(id);
  }

  // ==========================================================================
  // ADMIN MENU ITEMS & AVAILABILITY TOGGLE
  // ==========================================================================

  @Post('items')
  @ApiCreateMenuItemDocs()
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.adminMenuService.createMenuItem(dto);
  }

  @Patch('items/:id')
  @ApiUpdateMenuItemDocs()
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.adminMenuService.updateMenuItem(id, dto);
  }

  @Patch('items/:id/availability')
  @ApiToggleItemAvailabilityDocs()
  toggleItemAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.adminMenuService.toggleItemAvailability(id, dto);
  }

  @Delete('items/:id')
  @ApiDeleteMenuItemDocs()
  deleteMenuItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminMenuService.deleteMenuItem(id);
  }

  // ==========================================================================
  // ADMIN OPTION GROUPS & OPTIONS CRUD
  // ==========================================================================

  @Post('items/:itemId/option-groups')
  @ApiCreateOptionGroupDocs()
  createOptionGroup(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.adminMenuService.createOptionGroup(itemId, dto);
  }

  @Patch('option-groups/:groupId')
  @ApiUpdateOptionGroupDocs()
  updateOptionGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.adminMenuService.updateOptionGroup(groupId, dto);
  }

  @Delete('option-groups/:groupId')
  @ApiDeleteOptionGroupDocs()
  deleteOptionGroup(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.adminMenuService.deleteOptionGroup(groupId);
  }

  @Post('option-groups/:groupId/options')
  @ApiCreateOptionDocs()
  createOption(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.adminMenuService.createOption(groupId, dto);
  }

  @Patch('options/:optionId')
  @ApiUpdateOptionDocs()
  updateOption(
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.adminMenuService.updateOption(optionId, dto);
  }

  @Delete('options/:optionId')
  @ApiDeleteOptionDocs()
  deleteOption(@Param('optionId', ParseUUIDPipe) optionId: string) {
    return this.adminMenuService.deleteOption(optionId);
  }
}

