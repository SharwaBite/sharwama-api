import { Module } from '@nestjs/common';
import { AdminMenuController } from './admin.menu.controller';
import { AdminMenuService } from './admin.menu.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController, AdminMenuController],
  providers: [MenuService, AdminMenuService],
  exports: [MenuService, AdminMenuService],
})
export class MenuModule {}
