import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface CreatePickupInput {
  orderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropLat: number;
  dropLng: number;
  dropAddress?: string;
}

export interface CreatePickupResult {
  porterOrderId: string;
  trackingUrl?: string;
}

/**
 * Thin wrapper around Porter's Enterprise/API Integrations delivery API
 * (porter.in/api-integrations). Porter does not publish a public API spec —
 * access requires a business agreement with their partnerships team, so the
 * endpoint URL, payload shape, and header names below are placeholders
 * (marked TODO) pending real docs and sandbox credentials. Everything is
 * gated behind isConfigured(), same as RazorpayClientService/
 * GeminiClientService — with no PORTER_API_KEY set, dispatch is safely
 * skipped and orders proceed without a Porter booking (see DeliveryService).
 */
@Injectable()
export class PorterClientService {
  private readonly apiKey?: string;
  private readonly clientId?: string;
  private readonly webhookSecret?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('PORTER_API_KEY') || undefined;
    this.clientId = config.get<string>('PORTER_CLIENT_ID') || undefined;
    this.webhookSecret = config.get<string>('PORTER_WEBHOOK_SECRET') || undefined;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // TODO: replace URL/payload/response-parsing with Porter's real contract
  // once their API docs are available — this shape is a placeholder.
  async createPickup(input: CreatePickupInput): Promise<CreatePickupResult> {
    if (!this.apiKey) throw new Error('PorterClientService: not configured (missing PORTER_API_KEY)');

    const res = await fetch('https://api.porter.in/v1/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.clientId ? { 'X-Client-Id': this.clientId } : {}),
      },
      body: JSON.stringify({
        request_id: input.orderId,
        pickup_details: { lat: input.pickupLat, lng: input.pickupLng, address: input.pickupAddress },
        drop_details: { lat: input.dropLat, lng: input.dropLng, address: input.dropAddress },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`Porter API error (${res.status}): ${data?.message ?? res.statusText}`);
    }

    const porterOrderId = data?.order_id;
    if (typeof porterOrderId !== 'string') {
      throw new Error('Porter API returned an unexpected response shape');
    }
    return { porterOrderId, trackingUrl: typeof data?.tracking_url === 'string' ? data.tracking_url : undefined };
  }

  // TODO: confirm Porter's real webhook signature header name and algorithm
  // against their docs. HMAC-SHA256 of the raw body (this codebase's
  // RazorpayClientService convention) is used here as a placeholder.
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
