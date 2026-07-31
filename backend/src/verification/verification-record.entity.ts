import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type VerificationType = 'INITIAL' | 'RENEWAL';
export type VerificationStatus = 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type PayoutMethod = 'UPI' | 'BANK';
export type RazorpayAccountStatus = 'PENDING' | 'CREATED' | 'FAILED';

@Entity('verification_records')
export class VerificationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cook_id' })
  cookId!: string;

  @Column({ type: 'text' })
  type!: VerificationType;

  @Column({ name: 'fssai_number', nullable: true })
  fssaiNumber?: string;

  @Column({ name: 'fssai_doc_url', nullable: true })
  fssaiDocUrl?: string;

  @Column({ name: 'payout_method', type: 'text' })
  payoutMethod!: PayoutMethod;

  /** AES-256-GCM ciphertext (iv + authTag + data) via CryptoService — never returned in plaintext by any API response. */
  @Column({ name: 'payout_details_encrypted', type: 'bytea' })
  payoutDetailsEncrypted!: Buffer;

  @Column({ type: 'text', default: 'SUBMITTED' })
  status!: VerificationStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  // Set (best-effort, silently, via the VERIFICATION_APPROVED listener in
  // PaymentsModule) once this cook has a Razorpay Route linked account.
  // 'CREATED' here only means Razorpay accepted the account — it does not
  // mean the cook has completed Razorpay's own KYC step required before real
  // money can settle to them. See specs/phase-10-razorpay-payments.
  @Column({ name: 'razorpay_account_id', nullable: true })
  razorpayAccountId?: string;

  @Column({ name: 'razorpay_account_status', type: 'text', nullable: true })
  razorpayAccountStatus?: RazorpayAccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
