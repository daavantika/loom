export const VERIFICATION_SUBMITTED = 'verification.submitted';
export const VERIFICATION_APPROVED = 'verification.approved';
export const VERIFICATION_REJECTED = 'verification.rejected';

export interface VerificationSubmittedEvent {
  verificationId: string;
  cookId: string;
  type: 'INITIAL' | 'RENEWAL';
}

export interface VerificationApprovedEvent {
  verificationId: string;
  cookId: string;
  // Embedded directly from the already-loaded record at emit time — not
  // re-queried by listeners — see PaymentsService's VERIFICATION_APPROVED
  // handler for why (avoids an adminDB transaction-visibility race).
  payoutMethod: 'UPI' | 'BANK';
  payoutDetailsEncrypted: Buffer;
}

export interface VerificationRejectedEvent {
  verificationId: string;
  cookId: string;
  reason: string;
}
