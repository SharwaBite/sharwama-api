import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BachsClient } from './bachs.client';

describe('BachsClient', () => {
  const webhookSecret = 'whsec_test_secret_123';
  let client: BachsClient;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BACHS_WEBHOOK_SECRET') {
          return webhookSecret;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    client = new BachsClient(configService);
  });

  it('converts kobo to decimal strings and decimal strings back to kobo accurately', () => {
    expect(BachsClient.koboToDecimalString(924000)).toBe('9240.00');
    expect(BachsClient.koboToDecimalString(35050)).toBe('350.50');
    expect(BachsClient.decimalStringToKobo('9240.00')).toBe(924000);
    expect(BachsClient.decimalStringToKobo('350.50')).toBe(35050);
  });

  it('verifies a valid X-Bachs-Signature-V2 header (including during secret rotation with multiple v1 values)', () => {
    const rawBody = JSON.stringify({
      id: 'evt_001',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {
        checkout_id: 'chk_123',
        amount: '9240.00',
        currency: 'NGN',
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const validSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    const rotatedHeader = `t=${timestamp},v1=deadbeef00000000,v1=${validSig}`;

    const event = client.verifyAndParseWebhook(Buffer.from(rawBody, 'utf8'), {
      'x-bachs-signature-v2': rotatedHeader,
    });

    expect(event.id).toBe('evt_001');
    expect(event.type).toBe('collection.succeeded');
  });

  it('rejects stale timestamps (> 300s) and tampered payloads', () => {
    const rawBody = JSON.stringify({
      id: 'evt_002',
      type: 'collection.succeeded',
      created_at: new Date().toISOString(),
      data: {},
    });

    const staleTimestamp = Math.floor(Date.now() / 1000) - 600;
    const staleSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${staleTimestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    expect(() =>
      client.verifyAndParseWebhook(Buffer.from(rawBody, 'utf8'), {
        'x-bachs-signature-v2': `t=${staleTimestamp},v1=${staleSig}`,
      }),
    ).toThrow(BadRequestException);

    const freshTimestamp = Math.floor(Date.now() / 1000);
    const validSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${freshTimestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    const tamperedBody = rawBody.replace('evt_002', 'evt_tampered');
    expect(() =>
      client.verifyAndParseWebhook(Buffer.from(tamperedBody, 'utf8'), {
        'x-bachs-signature-v2': `t=${freshTimestamp},v1=${validSig}`,
      }),
    ).toThrow(BadRequestException);
  });
});

