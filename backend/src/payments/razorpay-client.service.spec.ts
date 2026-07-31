import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayClientService } from './razorpay-client.service';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('RazorpayClientService.isConfigured', () => {
  it('is false when no keys are set (the default until the user supplies them)', () => {
    const svc = new RazorpayClientService(makeConfig({}));
    expect(svc.isConfigured()).toBe(false);
    expect(svc.publicKeyId).toBeNull();
  });

  it('is false when only one of the two keys is set', () => {
    const svc = new RazorpayClientService(makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key' }));
    expect(svc.isConfigured()).toBe(false);
  });

  it('is true and exposes the (non-secret) key id once both keys are set', () => {
    const svc = new RazorpayClientService(makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh' }));
    expect(svc.isConfigured()).toBe(true);
    expect(svc.publicKeyId).toBe('rzp_test_key');
  });
});

describe('RazorpayClientService.verifyPaymentSignature', () => {
  it('accepts a signature computed the same way Razorpay documents (HMAC-SHA256 of order_id|payment_id)', () => {
    const svc = new RazorpayClientService(makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh' }));
    const signature = createHmac('sha256', 'shh').update('order_abc|pay_xyz').digest('hex');

    expect(svc.verifyPaymentSignature('order_abc', 'pay_xyz', signature)).toBe(true);
  });

  it('rejects a mismatched signature', () => {
    const svc = new RazorpayClientService(makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh' }));
    expect(svc.verifyPaymentSignature('order_abc', 'pay_xyz', 'not-the-real-signature')).toBe(false);
  });

  it('rejects everything when not configured (no secret to verify against)', () => {
    const svc = new RazorpayClientService(makeConfig({}));
    const signature = createHmac('sha256', 'shh').update('order_abc|pay_xyz').digest('hex');
    expect(svc.verifyPaymentSignature('order_abc', 'pay_xyz', signature)).toBe(false);
  });
});

describe('RazorpayClientService.verifyWebhookSignature', () => {
  it('accepts a signature computed over the raw body with the webhook secret', () => {
    const svc = new RazorpayClientService(
      makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh', RAZORPAY_WEBHOOK_SECRET: 'webhook-shh' }),
    );
    const rawBody = '{"event":"payment.captured"}';
    const signature = createHmac('sha256', 'webhook-shh').update(rawBody).digest('hex');

    expect(svc.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const svc = new RazorpayClientService(
      makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh', RAZORPAY_WEBHOOK_SECRET: 'webhook-shh' }),
    );
    const rawBody = '{"event":"payment.captured"}';
    const wrongSignature = createHmac('sha256', 'a-different-secret').update(rawBody).digest('hex');

    expect(svc.verifyWebhookSignature(rawBody, wrongSignature)).toBe(false);
  });

  it('rejects when no webhook secret is configured', () => {
    const svc = new RazorpayClientService(makeConfig({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh' }));
    expect(svc.verifyWebhookSignature('{}', 'anything')).toBe(false);
  });
});

describe('RazorpayClientService — unconfigured guard', () => {
  it('createOrder throws a clear error instead of hitting the network when not configured', async () => {
    const svc = new RazorpayClientService(makeConfig({}));
    await expect(svc.createOrder({ amountPaise: 100, receipt: 'r1', transfers: [] })).rejects.toThrow(/not configured/);
  });

  it('createLinkedAccount throws a clear error instead of hitting the network when not configured', async () => {
    const svc = new RazorpayClientService(makeConfig({}));
    await expect(svc.createLinkedAccount({ email: 'a@b.com', phone: '9999999999', legalBusinessName: 'Test' })).rejects.toThrow(
      /not configured/,
    );
  });
});
