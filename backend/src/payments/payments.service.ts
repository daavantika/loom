import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { RazorpayClientService } from './razorpay-client.service';
import { CryptoService } from '../common/crypto.service';
import { CooksService } from '../cooks/cooks.service';
import { VerificationService } from '../verification/verification.service';
import { VERIFICATION_APPROVED, VerificationApprovedEvent } from '../verification/verification.events';

export interface CheckoutOrderResult {
  razorpayOrderId: string;
  amountPaise: number;
  keyId: string;
  platformFeePaise: number;
  cookPayoutPaise: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionPct: number;

  constructor(
    private readonly razorpay: RazorpayClientService,
    private readonly crypto: CryptoService,
    private readonly cooks: CooksService,
    private readonly verification: VerificationService,
    config: ConfigService,
  ) {
    this.commissionPct = Number(config.get<string>('PLATFORM_COMMISSION_PCT') ?? '5');
  }

  getPublicConfig(): { enabled: boolean; keyId: string | null } {
    const enabled = this.razorpay.isConfigured();
    return { enabled, keyId: enabled ? this.razorpay.publicKeyId : null };
  }

  /**
   * Commission comes out of the cook's payout (customer's total is
   * unchanged from COD) — 5% default, configurable via
   * PLATFORM_COMMISSION_PCT. The uncollected commission simply isn't
   * transferred, so it stays with the platform's own primary account.
   */
  async createOrderForCheckout(
    order: { id: string; subtotalPaise: number; totalPaise: number },
    cookRazorpayAccountId: string,
  ): Promise<CheckoutOrderResult> {
    const platformFeePaise = Math.round((order.subtotalPaise * this.commissionPct) / 100);
    const cookPayoutPaise = order.totalPaise - platformFeePaise;

    const razorpayOrder = await this.razorpay.createOrder({
      amountPaise: order.totalPaise,
      receipt: order.id,
      transfers: [{ account: cookRazorpayAccountId, amountPaise: cookPayoutPaise }],
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amountPaise: order.totalPaise,
      keyId: this.razorpay.publicKeyId!,
      platformFeePaise,
      cookPayoutPaise,
    };
  }

  verifyClientPayment(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
    return this.razorpay.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return this.razorpay.verifyWebhookSignature(rawBody, signature);
  }

  /**
   * Best-effort side effect of a kitchen being approved: register the cook
   * as a Razorpay Route linked account so future online orders can split-pay
   * them automatically. Must never surface as a failed cook approval —
   * every failure path here only logs and records razorpayAccountStatus.
   *
   * Deliberately does NOT attach payout/bank details here, even though
   * they're right there on the event (decrypted via CryptoService — see
   * below) — Razorpay's account-creation payload (confirmed against their
   * docs: email/phone/legal_business_name/business_type/profile) has no
   * bank_account field; attaching real settlement details is a separate
   * follow-up API call (their Stakeholders/Products APIs) whose exact
   * required shape needs verifying against a real sandbox once keys exist,
   * per specs/phase-10-razorpay-payments. Decrypting payoutDetailsEncrypted
   * without an immediate use would just be needless plaintext exposure, so
   * this handler doesn't call crypto.decrypt at all — event.payoutMethod /
   * event.payoutDetailsEncrypted stay unused here until that follow-up step
   * is built.
   */
  @OnEvent(VERIFICATION_APPROVED)
  async handleVerificationApproved(event: VerificationApprovedEvent): Promise<void> {
    if (!this.razorpay.isConfigured()) return;

    try {
      const contact = await this.cooks.getOwnerContact(event.cookId);
      if (!contact.phone) {
        this.logger.warn(`Cook ${event.cookId} approved with no phone on file — skipping Razorpay linked-account creation`);
        await this.verification.attachRazorpayAccount(event.verificationId, null, 'FAILED');
        return;
      }

      const account = await this.razorpay.createLinkedAccount({
        email: contact.email,
        phone: contact.phone,
        legalBusinessName: contact.ownerName ?? contact.kitchenName ?? 'LOOM Kitchen',
      });
      await this.verification.attachRazorpayAccount(event.verificationId, account.id, 'CREATED');
    } catch (err) {
      this.logger.error(`Razorpay linked-account creation failed for cook ${event.cookId}: ${(err as Error).message}`);
      await this.verification.attachRazorpayAccount(event.verificationId, null, 'FAILED').catch(() => undefined);
    }
  }
}
