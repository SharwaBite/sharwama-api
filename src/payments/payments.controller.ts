import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBachsWebhookDocs } from '../common/swagger/api-docs';
import { PaymentsService } from './payments.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('bachs')
  @HttpCode(HttpStatus.OK)
  @ApiBachsWebhookDocs()
  async handleBachsWebhook(
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const rawBody = req.rawBody ?? (req.body as unknown as Buffer);
    return this.paymentsService.handleBachsWebhook(rawBody, headers);
  }
}
