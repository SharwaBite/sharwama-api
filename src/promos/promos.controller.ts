import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiValidatePromoDocs } from '../common/swagger/api-docs';
import { ValidatePromoDto } from './dto/promo.dto';
import { PromosService } from './promos.service';

@Controller('promo')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiValidatePromoDocs()
  validatePromo(@Body() dto: ValidatePromoDto) {
    return this.promosService.validatePromo(dto);
  }
}
