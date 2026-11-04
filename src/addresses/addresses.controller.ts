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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  ApiCreateAddressDocs,
  ApiDeleteAddressDocs,
  ApiGetAddressesDocs,
  ApiUpdateAddressDocs,
} from '../common/swagger/api-docs';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiGetAddressesDocs()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAll(user.id);
  }

  @Post()
  @ApiCreateAddressDocs()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiUpdateAddressDocs()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiDeleteAddressDocs()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}

