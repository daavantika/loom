import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager, In, Repository } from 'typeorm';
import { PayoutMethod, RazorpayAccountStatus, VerificationRecord } from './verification-record.entity';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { CryptoService } from '../common/crypto.service';
import {
  VERIFICATION_APPROVED,
  VERIFICATION_REJECTED,
  VERIFICATION_SUBMITTED,
} from './verification.events';

const ACTIVE_STATUSES = ['SUBMITTED', 'IN_REVIEW'] as const;

export interface CookVerificationStatus {
  verified: boolean;
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: Date;
  rejectionReason?: string;
}

/** Admin-only fields (FSSAI number, payout method) — never merged into CookVerificationStatus, which backs public/customer-facing endpoints. */
export interface CookVerificationDetails {
  fssaiNumber?: string;
  payoutMethod?: PayoutMethod;
}

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationRecord, 'adminDb') private readonly records: Repository<VerificationRecord>,
    private readonly crypto: CryptoService,
    private readonly events: EventEmitter2,
  ) {}

  async findActiveForCook(cookId: string): Promise<VerificationRecord | null> {
    return this.records.findOne({ where: { cookId, status: 'SUBMITTED' } }) ??
      this.records.findOne({ where: { cookId, status: 'IN_REVIEW' } });
  }

  async findLatestForCook(cookId: string): Promise<VerificationRecord | null> {
    return this.records.findOne({ where: { cookId }, order: { createdAt: 'DESC' } });
  }

  private toStatus(latest: VerificationRecord | undefined): CookVerificationStatus {
    if (!latest) return { verified: false, status: 'NONE' };
    if (latest.status === 'APPROVED') {
      return { verified: true, status: 'VERIFIED', verifiedAt: latest.reviewedAt };
    }
    if (latest.status === 'REJECTED') {
      return { verified: false, status: 'REJECTED', rejectionReason: latest.rejectionReason };
    }
    return { verified: false, status: 'PENDING' };
  }

  /**
   * Cross-DB read: the only place "is this cook verified" is decided. Backed
   * entirely by the admin DB's verification_records — cook_profiles (user DB)
   * never caches a copy of this, so callers on the user-DB side must go
   * through this method (or the batch form below) rather than reading a
   * local status column.
   */
  async getStatusForCook(cookId: string): Promise<CookVerificationStatus> {
    const statuses = await this.getStatusForCooks([cookId]);
    return statuses.get(cookId) ?? this.toStatus(undefined);
  }

  /** Batch form — one query for N cooks, avoiding N+1 in list endpoints (catalog search, favorites). */
  async getStatusForCooks(cookIds: string[]): Promise<Map<string, CookVerificationStatus>> {
    const result = new Map<string, CookVerificationStatus>();
    const latestRows = await this.getLatestRecordsForCooks(cookIds);
    for (const row of latestRows) {
      result.set(row.cookId, this.toStatus(row));
    }
    return result;
  }

  /** Admin-only batch form of FSSAI number + payout method — never merged into the public CookVerificationStatus shape. */
  async getDetailsForCooks(cookIds: string[]): Promise<Map<string, CookVerificationDetails>> {
    const result = new Map<string, CookVerificationDetails>();
    const latestRows = await this.getLatestRecordsForCooks(cookIds);
    for (const row of latestRows) {
      result.set(row.cookId, { fssaiNumber: row.fssaiNumber, payoutMethod: row.payoutMethod });
    }
    return result;
  }

  /** Shared "latest verification record per cook" query backing both getStatusForCooks and getDetailsForCooks. */
  private async getLatestRecordsForCooks(cookIds: string[]): Promise<VerificationRecord[]> {
    if (cookIds.length === 0) return [];
    return this.records
      .createQueryBuilder('record')
      .distinctOn(['record.cookId'])
      .where('record.cookId IN (:...cookIds)', { cookIds })
      .orderBy('record.cookId', 'ASC')
      .addOrderBy('record.createdAt', 'DESC')
      .getMany();
  }

  /** Used by ModerationService to enrich case listings — these ids are moderation_cases.entity_id values, i.e. specific verification_records rows, not "latest per cook". */
  async findByIds(ids: string[]): Promise<VerificationRecord[]> {
    if (ids.length === 0) return [];
    return this.records.find({ where: { id: In(ids) } });
  }

  /** The cook's Razorpay Route linked-account id, only when it's actually usable (CREATED). Null otherwise — including PENDING/FAILED/never-attempted. */
  async getRazorpayAccountForCook(cookId: string): Promise<string | null> {
    const latest = await this.findLatestForCook(cookId);
    if (!latest || latest.razorpayAccountStatus !== 'CREATED' || !latest.razorpayAccountId) return null;
    return latest.razorpayAccountId;
  }

  /**
   * Records the outcome of PaymentsService's best-effort linked-account
   * creation. A plain single-row update, deliberately outside any
   * transaction — this always runs well after the approval transaction that
   * emitted VERIFICATION_APPROVED has already committed.
   */
  async attachRazorpayAccount(verificationId: string, accountId: string | null, status: RazorpayAccountStatus): Promise<void> {
    await this.records.update({ id: verificationId }, { razorpayAccountId: accountId ?? undefined, razorpayAccountStatus: status });
  }

  async submit(cookId: string, dto: SubmitVerificationDto, isResubmission: boolean): Promise<VerificationRecord> {
    const active = await this.findActiveForCook(cookId);
    if (active) {
      throw new ConflictException('A verification review is already in progress');
    }

    const record = this.records.create({
      cookId,
      type: isResubmission ? 'RENEWAL' : 'INITIAL',
      fssaiNumber: dto.fssaiNumber,
      fssaiDocUrl: dto.fssaiDocUrl,
      payoutMethod: dto.payoutMethod,
      payoutDetailsEncrypted: this.crypto.encrypt(dto.payoutDetails),
      status: 'SUBMITTED',
    });
    const saved = await this.records.save(record);

    this.events.emit(VERIFICATION_SUBMITTED, {
      verificationId: saved.id,
      cookId,
      type: saved.type,
    });

    return saved;
  }

  /** Pass `manager` to participate in a caller's adminDb transaction (e.g. ModerationService.approveVerification). */
  async approve(verificationId: string, adminId: string, manager?: EntityManager): Promise<VerificationRecord> {
    const repo = manager ? manager.withRepository(this.records) : this.records;
    const record = await repo.findOne({ where: { id: verificationId } });
    if (!record) throw new NotFoundException('Verification record not found');
    if (!(ACTIVE_STATUSES as readonly string[]).includes(record.status)) {
      throw new ForbiddenException('Verification record is not awaiting review');
    }

    record.status = 'APPROVED';
    record.reviewedBy = adminId;
    record.reviewedAt = new Date();
    const saved = await repo.save(record);

    this.events.emit(VERIFICATION_APPROVED, {
      verificationId: saved.id,
      cookId: saved.cookId,
      payoutMethod: saved.payoutMethod,
      payoutDetailsEncrypted: saved.payoutDetailsEncrypted,
    });
    return saved;
  }

  async reject(verificationId: string, adminId: string, reason: string, manager?: EntityManager): Promise<VerificationRecord> {
    const repo = manager ? manager.withRepository(this.records) : this.records;
    const record = await repo.findOne({ where: { id: verificationId } });
    if (!record) throw new NotFoundException('Verification record not found');
    if (!(ACTIVE_STATUSES as readonly string[]).includes(record.status)) {
      throw new ForbiddenException('Verification record is not awaiting review');
    }

    record.status = 'REJECTED';
    record.reviewedBy = adminId;
    record.reviewedAt = new Date();
    record.rejectionReason = reason;
    const saved = await repo.save(record);

    this.events.emit(VERIFICATION_REJECTED, { verificationId: saved.id, cookId: saved.cookId, reason });
    return saved;
  }
}
