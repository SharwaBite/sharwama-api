import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(['webhooks/bachs', 'payments/webhooks/bachs', 'v1/webhooks/bachs'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process incoming Bachs webhook events',
    description:
      'Verifies HMAC-SHA256 signature (X-Bachs-Signature-V2 or X-Bachs-Signature) against the raw request body and fulfills paid orders.',
  })
  @ApiHeader({
    name: 'X-Bachs-Signature-V2',
    description:
      'Bachs webhook signature header format: t={timestamp},v1={signature}',
    required: false,
    example:
      't=1776780000,v1=5d41402abc4b2a76b9719d911017c592',
  })
  @ApiHeader({
    name: 'X-Bachs-Signature',
    description: 'Legacy Bachs webhook signature hex digest',
    required: false,
    example: '5d41402abc4b2a76b9719d911017c592',
  })
  @ApiHeader({
    name: 'X-Bachs-Timestamp',
    description: 'Unix timestamp (in seconds) when the event was sent',
    required: false,
    example: '1776780000',
  })
  @ApiBody({
    description:
      'Raw JSON event payload delivered by Bachs (collection.succeeded, checkout.completed, or collection.failed)',
    schema: {
      type: 'object',
      example: {
        id: 'evt_3ab4e0d5d27445cf8a52ab3d8cb8f0b1',
        type: 'collection.succeeded',
        created_at: '2026-09-22T10:41:18.402Z',
        organization_id: 'acct_7KpQ2mNv4XbR9dLc',
        data: {
          charge_id: 'ch_1a2b3c4d5e6f',
          checkout_id: 'chk_6R7s8T9u0V1w2X3y',
          reference: '0195f1e2-b011-7000-8000-000000000101',
          status: 'SUCCEEDED',
          amount: '9240.00',
          currency: 'NGN',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook acknowledged and processed successfully',
    schema: {
      example: {
        received: true,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid signature, expired timestamp, or malformed body',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid or expired Bachs webhook signature',
        error: 'Bad Request',
      },
    },
  })
  async handleBachsWebhook(
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const rawBody = req.rawBody ?? (req.body as unknown as Buffer);
    return this.paymentsService.handleBachsWebhook(rawBody, headers);
  }
}
