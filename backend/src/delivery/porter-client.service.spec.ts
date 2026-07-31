import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PorterClientService } from './porter-client.service';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('PorterClientService.isConfigured', () => {
  it('is false when no key is set (the default until the user completes Porter Enterprise onboarding)', () => {
    const svc = new PorterClientService(makeConfig({}));
    expect(svc.isConfigured()).toBe(false);
  });

  it('is true once PORTER_API_KEY is set', () => {
    const svc = new PorterClientService(makeConfig({ PORTER_API_KEY: 'porter_test_key' }));
    expect(svc.isConfigured()).toBe(true);
  });
});

describe('PorterClientService.createPickup — unconfigured guard', () => {
  it('throws a clear error instead of hitting the network when not configured', async () => {
    const svc = new PorterClientService(makeConfig({}));
    await expect(
      svc.createPickup({ orderId: 'o1', pickupLat: 11, pickupLng: 77, dropLat: 11.1, dropLng: 77.1 }),
    ).rejects.toThrow(/not configured/);
  });
});

describe('PorterClientService.verifyWebhookSignature', () => {
  it('accepts a signature computed as HMAC-SHA256 of the raw body with the webhook secret', () => {
    const svc = new PorterClientService(makeConfig({ PORTER_API_KEY: 'k', PORTER_WEBHOOK_SECRET: 'webhook-shh' }));
    const rawBody = '{"order_id":"por_123","status":"order_completed"}';
    const signature = createHmac('sha256', 'webhook-shh').update(rawBody).digest('hex');

    expect(svc.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const svc = new PorterClientService(makeConfig({ PORTER_API_KEY: 'k', PORTER_WEBHOOK_SECRET: 'webhook-shh' }));
    const rawBody = '{"order_id":"por_123","status":"order_completed"}';
    const wrongSignature = createHmac('sha256', 'a-different-secret').update(rawBody).digest('hex');

    expect(svc.verifyWebhookSignature(rawBody, wrongSignature)).toBe(false);
  });

  it('rejects everything when no webhook secret is configured (no secret to verify against)', () => {
    const svc = new PorterClientService(makeConfig({ PORTER_API_KEY: 'k' }));
    expect(svc.verifyWebhookSignature('{}', 'anything')).toBe(false);
  });
});
