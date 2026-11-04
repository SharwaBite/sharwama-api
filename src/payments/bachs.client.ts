import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CreateBachsCheckoutParams {
  orderId: string;
  orderNumber: number;
  publicToken: string;
  amountKobo: number;
  currency?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  expiresInMinutes?: number;
}

export interface BachsCheckoutSessionResponse {
  checkout_id: string;
  checkout_url: string;
  status: string;
  payment_status?: string;
  amount?: string;
  currency?: string | null;
  reference?: string | null;
  charge?: {
    id: string;
    amount: string;
    currency: string;
    status: string;
  } | null;
  expires_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface BachsWebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  created_at: string;
  organization_id?: string;
  account?: string;
  data: T;
}

@Injectable()
export class BachsClient {
  private readonly logger = new Logger(BachsClient.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Converts integer kobo to Bachs decimal string (e.g. 924000 -> "9240.00").
   * Per Bachs docs: Money is always a decimal string at the currency's precision.
   */
  static koboToDecimalString(amountKobo: number): string {
    return (amountKobo / 100).toFixed(2);
  }

  /**
   * Converts a Bachs decimal string (e.g. "9240.00") to integer kobo (924000).
   */
  static decimalStringToKobo(amountDecimal: string | number): number {
    const parsed =
      typeof amountDecimal === 'number'
        ? amountDecimal
        : Number.parseFloat(amountDecimal);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return Math.round(parsed * 100);
  }

  /**
   * POST /v1/checkout-sessions
   * Creates a hosted Bachs checkout session using raw `pricing` and an
   * idempotency key derived from the order ID (`checkout-${orderId}`).
   */
  async createCheckoutSession(
    params: CreateBachsCheckoutParams,
  ): Promise<BachsCheckoutSessionResponse> {
    const secretKey = this.configService.get<string>('BACHS_SECRET_KEY');
    const currency = params.currency ?? 'NGN';
    const amountDecimal = BachsClient.koboToDecimalString(params.amountKobo);

    // Development/sandbox fallback when BACHS_SECRET_KEY is not configured yet
    if (!secretKey) {
      this.logger.warn(
        `BACHS_SECRET_KEY is not set; returning simulated checkout session for order ${params.orderId}`,
      );
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3001';
      const simulatedId = `chk_sim_${params.orderId.replace(/-/g, '').slice(0, 16)}`;
      return {
        checkout_id: simulatedId,
        checkout_url: `${frontendUrl}/checkout/mock-pay?checkout_id=${simulatedId}&order_id=${params.orderId}&token=${params.publicToken}`,
        status: 'open',
        amount: amountDecimal,
        currency,
        reference: params.orderId,
        expires_at: new Date(
          Date.now() + (params.expiresInMinutes ?? 30) * 60 * 1000,
        ).toISOString(),
        created_at: new Date().toISOString(),
      };
    }

    const baseUrl = this.getApiBaseUrl(secretKey);
    const urls = this.buildRedirectUrls(params.orderId, params.publicToken);

    const body: Record<string, unknown> = {
      pricing: {
        currency,
        amount: amountDecimal,
      },
      reference: params.orderId,
      expires_in_minutes: params.expiresInMinutes ?? 30,
      metadata: {
        order_id: params.orderId,
        order_number: String(params.orderNumber),
        public_token: params.publicToken,
      },
      ...(urls.successUrl ? { success_url: urls.successUrl } : {}),
      ...(urls.cancelUrl ? { cancel_url: urls.cancelUrl } : {}),
    };

    // Bachs requires `email` whenever `customer` is provided; if guest omitted email,
    // omit `customer` so the hosted page collects it.
    if (params.customerEmail) {
      body.customer = {
        email: params.customerEmail,
        name: params.customerName,
        phone_number: params.customerPhone,
      };
    }

    const response = await fetch(`${baseUrl}/v1/checkout-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `checkout-${params.orderId}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Bachs createCheckoutSession failed (${response.status}): ${errorText}`,
      );
      throw new BadGatewayException(
        'Unable to initialize payment checkout session with Bachs',
      );
    }

    return (await response.json()) as BachsCheckoutSessionResponse;
  }

  /**
   * GET /v1/checkout-sessions/{checkout_id}
   * Used by the 5-minute reconciliation job to check session status.
   */
  async getCheckoutSession(
    checkoutId: string,
  ): Promise<BachsCheckoutSessionResponse | null> {
    const secretKey = this.configService.get<string>('BACHS_SECRET_KEY');
    if (!secretKey || checkoutId.startsWith('chk_sim_')) {
      return null;
    }

    const baseUrl = this.getApiBaseUrl(secretKey);
    const response = await fetch(
      `${baseUrl}/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      this.logger.warn(
        `Bachs getCheckoutSession(${checkoutId}) returned status ${response.status}`,
      );
      return null;
    }

    return (await response.json()) as BachsCheckoutSessionResponse;
  }

  /**
   * Verifies a Bachs webhook request using `X-Bachs-Signature-V2`
   * (`t={timestamp},v1={sig}`) or fallback `X-Bachs-Signature` + `X-Bachs-Timestamp`
   * against the raw request body.
   */
  verifyAndParseWebhook(
    rawBody: Buffer | string | undefined,
    headers: Record<string, string | string[] | undefined>,
    toleranceSeconds = 300,
  ): BachsWebhookEvent {
    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw request body for webhook verification',
      );
    }

    const secret = this.configService.get<string>('BACHS_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('BACHS_WEBHOOK_SECRET is not configured');
    }

    const rawBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(rawBody, 'utf8');

    const sigV2 = this.getHeader(headers, 'x-bachs-signature-v2');
    const sigV1 = this.getHeader(headers, 'x-bachs-signature');
    const tsHeader = this.getHeader(headers, 'x-bachs-timestamp');

    let isValid = false;

    if (sigV2) {
      isValid = this.verifyV2Header(
        sigV2,
        rawBuffer,
        secret,
        toleranceSeconds,
      );
    } else if (sigV1 && tsHeader) {
      isValid = this.verifyV1Headers(
        tsHeader,
        sigV1,
        rawBuffer,
        secret,
        toleranceSeconds,
      );
    } else {
      throw new BadRequestException('Missing Bachs webhook signature headers');
    }

    if (!isValid) {
      throw new BadRequestException('Invalid or expired Bachs webhook signature');
    }

    try {
      return JSON.parse(rawBuffer.toString('utf8')) as BachsWebhookEvent;
    } catch {
      throw new BadRequestException('Malformed JSON in webhook payload');
    }
  }

  private verifyV2Header(
    header: string,
    rawBody: Buffer,
    secret: string,
    toleranceSeconds: number,
  ): boolean {
    const pairs = header
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.includes('='));

    let timestampStr: string | undefined;
    const signatures: string[] = [];

    for (const pair of pairs) {
      const [key, ...rest] = pair.split('=');
      const value = rest.join('=');
      if (key === 't') {
        timestampStr = value;
      } else if (key === 'v1' && value) {
        signatures.push(value);
      }
    }

    if (!timestampStr || signatures.length === 0) {
      return false;
    }

    const timestamp = Number.parseInt(timestampStr, 10);
    if (
      Number.isNaN(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds
    ) {
      return false;
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${timestamp}.`, 'utf8'),
      rawBody,
    ]);
    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return signatures.some((sig) => this.safeHexCompare(expectedHex, sig));
  }

  private verifyV1Headers(
    timestampHeader: string,
    signatureHeader: string,
    rawBody: Buffer,
    secret: string,
    toleranceSeconds: number,
  ): boolean {
    const timestamp = Number.parseInt(timestampHeader, 10);
    if (
      Number.isNaN(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds
    ) {
      return false;
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${timestamp}.`, 'utf8'),
      rawBody,
    ]);
    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return this.safeHexCompare(expectedHex, signatureHeader.trim());
  }

  private safeHexCompare(expectedHex: string, candidateHex: string): boolean {
    const a = Buffer.from(expectedHex, 'utf8');
    const b = Buffer.from(candidateHex, 'utf8');
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const val = headers[name] ?? headers[name.toLowerCase()];
    if (typeof val === 'string') {
      return val;
    }
    if (Array.isArray(val)) {
      return val[0];
    }
    return undefined;
  }

  private getApiBaseUrl(secretKey: string): string {
    const configured = this.configService.get<string>('BACHS_API_BASE_URL');
    if (configured && !configured.includes('api.bachs.com')) {
      return configured.replace(/\/+$/, '');
    }
    return secretKey.startsWith('sk_sandbox_')
      ? 'https://sandbox-api.bachs.io'
      : 'https://api.bachs.io';
  }

  /**
   * Bachs rejects `localhost` and private-network URLs in `success_url` / `cancel_url`
   * even in sandbox mode. Only include them when FRONTEND_URL is a public domain.
   */
  private buildRedirectUrls(orderId: string, publicToken: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      return { successUrl: undefined, cancelUrl: undefined };
    }

    try {
      const parsed = new URL(frontendUrl);
      const isLocal =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.endsWith('.local');

      if (isLocal) {
        return { successUrl: undefined, cancelUrl: undefined };
      }

      const base = frontendUrl.replace(/\/+$/, '');
      return {
        successUrl: `${base}/orders/${orderId}?token=${publicToken}`,
        cancelUrl: `${base}/checkout?cancelled=1`,
      };
    } catch {
      return { successUrl: undefined, cancelUrl: undefined };
    }
  }
}

