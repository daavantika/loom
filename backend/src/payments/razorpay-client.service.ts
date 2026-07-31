import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

export interface CreateRazorpayOrderInput {
  amountPaise: number;
  receipt: string;
  transfers: Array<{ account: string; amountPaise: number }>;
}

export interface CreateLinkedAccountInput {
  email: string;
  phone: string;
  legalBusinessName: string;
}

/**
 * Thin wrapper around the `razorpay` SDK. Every new payments code path
 * checks isConfigured() first and no-ops/400s cleanly when false — the app
 * runs COD-only with zero keys, matching the current deployment state (see
 * specs/phase-10-razorpay-payments). Signature verification is hand-rolled
 * with Node's built-in crypto, matching CryptoService's existing style
 * rather than reaching for the SDK's separate utils subpath.
 */
@Injectable()
export class RazorpayClientService {
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;
  private client?: Razorpay;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') || undefined;
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || undefined;
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || undefined;
    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  get publicKeyId(): string | null {
    return this.keyId ?? null;
  }

  private requireClient(): Razorpay {
    if (!this.client) throw new Error('RazorpayClientService: not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
    return this.client;
  }

  async createOrder(input: CreateRazorpayOrderInput): Promise<{ id: string; amount: number }> {
    const order = await this.requireClient().orders.create({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      transfers: input.transfers.map((t) => ({ account: t.account, amount: t.amountPaise, currency: 'INR', on_hold: false })),
    } as any);
    return { id: order.id, amount: Number(order.amount) };
  }

  async createLinkedAccount(input: CreateLinkedAccountInput): Promise<{ id: string; status: string }> {
    const account = await this.requireClient().accounts.create({
      email: input.email,
      phone: input.phone,
      type: 'route',
      legal_business_name: input.legalBusinessName,
      business_type: 'individual',
      profile: { category: 'food', subcategory: 'restaurant' },
    } as any);
    return { id: account.id, status: account.status };
  }

  /** Client-side checkout success confirmation — UX-only, never authoritative. See OrdersService.verifyPayment. */
  verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
    if (!this.keySecret) return false;
    const expected = createHmac('sha256', this.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    return safeCompare(expected, signature);
  }

  /** Authoritative payment-state source. Verifies the HMAC Razorpay computed over the exact raw webhook body. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return safeCompare(expected, signature);
  }
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
