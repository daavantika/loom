import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { RazorpayClientService } from './razorpay-client.service';
import { CryptoService } from '../common/crypto.service';
import { CooksService } from '../cooks/cooks.service';
import { VerificationService } from '../verification/verification.service';

function makeService(overrides: Partial<{ razorpay: any; cooks: any; verification: any; commissionPct: string }> = {}) {
  const razorpay =
    overrides.razorpay ??
    ({
      isConfigured: jest.fn(() => true),
      publicKeyId: 'rzp_test_key',
      createOrder: jest.fn(async () => ({ id: 'order_razorpay1', amount: 17000 })),
      createLinkedAccount: jest.fn(async () => ({ id: 'acc_cook1', status: 'created' })),
      verifyPaymentSignature: jest.fn(() => true),
      verifyWebhookSignature: jest.fn(() => true),
    } as unknown as RazorpayClientService);
  const crypto = { decrypt: jest.fn(() => 'cook@upi'), encrypt: jest.fn() } as unknown as CryptoService;
  const cooks =
    overrides.cooks ??
    ({
      getOwnerContact: jest.fn(async () => ({ email: 'cook@loom.test', phone: '9876543210', kitchenName: 'Test Kitchen', ownerName: 'Test Owner' })),
    } as unknown as CooksService);
  const verification =
    overrides.verification ??
    ({
      attachRazorpayAccount: jest.fn(async () => undefined),
    } as unknown as VerificationService);
  const config = { get: (key: string) => (key === 'PLATFORM_COMMISSION_PCT' ? (overrides.commissionPct ?? '5') : undefined) } as unknown as ConfigService;

  const service = new PaymentsService(razorpay, crypto, cooks, verification, config);
  return { service, razorpay, cooks, verification };
}

describe('PaymentsService.getPublicConfig', () => {
  it('reports disabled with no key id when Razorpay is not configured', () => {
    const { service } = makeService({ razorpay: { isConfigured: () => false, publicKeyId: null } as any });
    expect(service.getPublicConfig()).toEqual({ enabled: false, keyId: null });
  });

  it('reports enabled with the (non-secret) key id when configured', () => {
    const { service } = makeService();
    expect(service.getPublicConfig()).toEqual({ enabled: true, keyId: 'rzp_test_key' });
  });
});

describe('PaymentsService.createOrderForCheckout', () => {
  it('computes a 5% platform commission out of the subtotal and transfers the rest to the cook', async () => {
    const { service, razorpay } = makeService();

    const result = await service.createOrderForCheckout({ id: 'order-1', subtotalPaise: 17000, totalPaise: 17000 }, 'acc_cook1');

    // 5% of 17000 = 850 (rounded), cook gets the remaining 16150
    expect(result.platformFeePaise).toBe(850);
    expect(result.cookPayoutPaise).toBe(16150);
    expect(result.razorpayOrderId).toBe('order_razorpay1');
    expect(result.keyId).toBe('rzp_test_key');
    expect(razorpay.createOrder).toHaveBeenCalledWith({
      amountPaise: 17000,
      receipt: 'order-1',
      transfers: [{ account: 'acc_cook1', amountPaise: 16150 }],
    });
  });

  it('honors a configured PLATFORM_COMMISSION_PCT other than the 5% default', async () => {
    const { service, razorpay } = makeService({ commissionPct: '10' });

    const result = await service.createOrderForCheckout({ id: 'order-1', subtotalPaise: 10000, totalPaise: 10000 }, 'acc_cook1');

    expect(result.platformFeePaise).toBe(1000);
    expect(result.cookPayoutPaise).toBe(9000);
    expect(razorpay.createOrder).toHaveBeenCalledWith(expect.objectContaining({ transfers: [{ account: 'acc_cook1', amountPaise: 9000 }] }));
  });
});

describe('PaymentsService — VERIFICATION_APPROVED listener', () => {
  const event = { verificationId: 'record-1', cookId: 'cook-1', payoutMethod: 'UPI' as const, payoutDetailsEncrypted: Buffer.from('cipher') };

  it('no-ops entirely when Razorpay is not configured — cook approval must never depend on payments being set up', async () => {
    const { service, cooks, verification } = makeService({ razorpay: { isConfigured: () => false } as any });

    await service.handleVerificationApproved(event);

    expect(cooks.getOwnerContact).not.toHaveBeenCalled();
    expect(verification.attachRazorpayAccount).not.toHaveBeenCalled();
  });

  it('creates a linked account and records CREATED on success', async () => {
    const { service, razorpay, verification } = makeService();

    await service.handleVerificationApproved(event);

    expect(razorpay.createLinkedAccount).toHaveBeenCalledWith({
      email: 'cook@loom.test',
      phone: '9876543210',
      legalBusinessName: 'Test Owner',
    });
    expect(verification.attachRazorpayAccount).toHaveBeenCalledWith('record-1', 'acc_cook1', 'CREATED');
  });

  it('records FAILED (and never throws) when the cook has no phone on file', async () => {
    const { service, cooks, razorpay, verification } = makeService({
      cooks: { getOwnerContact: jest.fn(async () => ({ email: 'cook@loom.test', phone: undefined })) } as any,
    });

    await expect(service.handleVerificationApproved(event)).resolves.toBeUndefined();

    expect(razorpay.createLinkedAccount).not.toHaveBeenCalled();
    expect(verification.attachRazorpayAccount).toHaveBeenCalledWith('record-1', null, 'FAILED');
  });

  it('records FAILED (and never throws) when Razorpay rejects the linked-account creation', async () => {
    const { service, verification } = makeService({
      razorpay: {
        isConfigured: () => true,
        publicKeyId: 'rzp_test_key',
        createLinkedAccount: jest.fn().mockRejectedValue(new Error('Razorpay: phone number invalid')),
      } as any,
    });

    await expect(service.handleVerificationApproved(event)).resolves.toBeUndefined();

    expect(verification.attachRazorpayAccount).toHaveBeenCalledWith('record-1', null, 'FAILED');
  });
});
