import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiGetMenuItemDocs,
  ApiGetPublicMenuDocs,
} from '../common/swagger/api-docs';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiGetPublicMenuDocs()
  getPublicMenu() {
    return this.menuService.getPublicMenu();
  }

  @Get('items/:id')
  @ApiGetMenuItemDocs()
  getMenuItemById(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.getMenuItemById(id);
  }
}
