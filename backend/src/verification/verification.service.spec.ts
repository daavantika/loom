import { ConflictException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationService } from './verification.service';
import { VerificationRecord } from './verification-record.entity';
import { CryptoService } from '../common/crypto.service';
import { VERIFICATION_APPROVED, VERIFICATION_SUBMITTED } from './verification.events';

describe('VerificationService', () => {
  let service: VerificationService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let suspensionsRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let crypto: CryptoService;
  let events: EventEmitter2;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((input) => ({ id: 'record-1', createdAt: new Date(), ...input })),
      save: jest.fn(async (entity) => entity),
      update: jest.fn(async () => undefined),
    };
    suspensionsRepo = {
      find: jest.fn(async () => []),
      create: jest.fn((input) => ({ suspendedAt: new Date(), ...input })),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn(async () => undefined),
    };
    crypto = { encrypt: jest.fn(() => Buffer.from('cipher')) } as unknown as CryptoService;
    events = { emit: jest.fn() } as unknown as EventEmitter2;
    service = new VerificationService(repo as any, suspensionsRepo as any, crypto, events);
  });

  const dto = { payoutMethod: 'UPI' as const, payoutDetails: 'cook@upi' };

  it('creates a SUBMITTED record and emits verification.submitted when none is active', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.submit('cook-1', dto, false);

    expect(result.status).toBe('SUBMITTED');
    expect(result.type).toBe('INITIAL');
    expect(events.emit).toHaveBeenCalledWith(
      VERIFICATION_SUBMITTED,
      expect.objectContaining({ cookId: 'cook-1', type: 'INITIAL' }),
    );
  });

  it('marks a resubmission as RENEWAL', async () => {
    repo.findOne.mockResolvedValue(null);
    const result = await service.submit('cook-1', dto, true);
    expect(result.type).toBe('RENEWAL');
  });

  it('rejects a second submission while one is already SUBMITTED or IN_REVIEW', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'existing', status: 'SUBMITTED' } as VerificationRecord);

    await expect(service.submit('cook-1', dto, false)).rejects.toThrow(ConflictException);
  });

  it('approves a SUBMITTED record and emits verification.approved with the payout fields embedded (no re-query needed by listeners)', async () => {
    const encrypted = Buffer.from('cipher');
    repo.findOne.mockResolvedValue({
      id: 'record-1',
      cookId: 'cook-1',
      status: 'SUBMITTED',
      payoutMethod: 'UPI',
      payoutDetailsEncrypted: encrypted,
    } as VerificationRecord);

    const result = await service.approve('record-1', 'admin-1');

    expect(result.status).toBe('APPROVED');
    expect(result.reviewedBy).toBe('admin-1');
    expect(events.emit).toHaveBeenCalledWith(
      VERIFICATION_APPROVED,
      expect.objectContaining({ verificationId: 'record-1', cookId: 'cook-1', payoutMethod: 'UPI', payoutDetailsEncrypted: encrypted }),
    );
  });

  it('refuses to approve a record that is not SUBMITTED or IN_REVIEW (no skipping states)', async () => {
    repo.findOne.mockResolvedValue({ id: 'record-1', cookId: 'cook-1', status: 'APPROVED' } as VerificationRecord);

    await expect(service.approve('record-1', 'admin-1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses to reject an already-REJECTED record', async () => {
    repo.findOne.mockResolvedValue({ id: 'record-1', cookId: 'cook-1', status: 'REJECTED' } as VerificationRecord);

    await expect(service.reject('record-1', 'admin-1', 'because')).rejects.toThrow(ForbiddenException);
  });
});

describe('VerificationService.suspendCook / reinstateCook / getSuspensionsForCooks', () => {
  let service: VerificationService;
  let suspensionsRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    suspensionsRepo = {
      find: jest.fn(async () => []),
      create: jest.fn((input) => ({ suspendedAt: new Date('2026-01-01T00:00:00Z'), ...input })),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn(async () => undefined),
    };
    service = new VerificationService(
      {} as any,
      suspensionsRepo as any,
      {} as CryptoService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('suspendCook creates a cook_suspensions row with the admin id and reason', async () => {
    await service.suspendCook('cook-1', 'admin-1', 'hygiene complaint');

    expect(suspensionsRepo.create).toHaveBeenCalledWith({ cookId: 'cook-1', suspendedBy: 'admin-1', reason: 'hygiene complaint' });
    expect(suspensionsRepo.save).toHaveBeenCalled();
  });

  it('reinstateCook deletes the cook_suspensions row', async () => {
    await service.reinstateCook('cook-1');
    expect(suspensionsRepo.delete).toHaveBeenCalledWith({ cookId: 'cook-1' });
  });

  it('getSuspensionsForCooks returns a map keyed by cookId for existing rows only', async () => {
    suspensionsRepo.find.mockResolvedValue([
      { cookId: 'cook-1', reason: 'spam', suspendedAt: new Date('2026-01-02T00:00:00Z') },
    ]);

    const result = await service.getSuspensionsForCooks(['cook-1', 'cook-2']);

    expect(result.get('cook-1')).toEqual({ reason: 'spam', suspendedAt: new Date('2026-01-02T00:00:00Z') });
    expect(result.has('cook-2')).toBe(false);
  });

  it('getSuspensionsForCooks short-circuits on an empty id list without querying', async () => {
    const result = await service.getSuspensionsForCooks([]);
    expect(result.size).toBe(0);
    expect(suspensionsRepo.find).not.toHaveBeenCalled();
  });
});

function makeQueryBuilderRepo(rows: Partial<VerificationRecord>[]) {
  const qb = {
    distinctOn: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => rows),
  };
  return { createQueryBuilder: jest.fn(() => qb), qb };
}

describe('VerificationService.getStatusForCook / getStatusForCooks', () => {
  const makeService = (rows: Partial<VerificationRecord>[]) => {
    const { createQueryBuilder } = makeQueryBuilderRepo(rows);
    const repo = { createQueryBuilder };
    return new VerificationService(repo as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);
  };

  it('reports NONE when the cook has never submitted', async () => {
    const service = makeService([]);
    const result = await service.getStatusForCook('cook-1');
    expect(result).toEqual({ verified: false, status: 'NONE' });
  });

  it('reports VERIFIED (and verified=true) when the latest record is APPROVED', async () => {
    const reviewedAt = new Date('2026-01-01T00:00:00Z');
    const service = makeService([{ cookId: 'cook-1', status: 'APPROVED', reviewedAt }]);
    const result = await service.getStatusForCook('cook-1');
    expect(result).toEqual({ verified: true, status: 'VERIFIED', verifiedAt: reviewedAt });
  });

  it('reports REJECTED (and verified=false) when the latest record is REJECTED', async () => {
    const service = makeService([{ cookId: 'cook-1', status: 'REJECTED', rejectionReason: 'missing FSSAI' }]);
    const result = await service.getStatusForCook('cook-1');
    expect(result).toEqual({ verified: false, status: 'REJECTED', rejectionReason: 'missing FSSAI' });
  });

  it('reports PENDING for SUBMITTED/IN_REVIEW records', async () => {
    const service = makeService([{ cookId: 'cook-1', status: 'SUBMITTED' }]);
    const result = await service.getStatusForCook('cook-1');
    expect(result).toEqual({ verified: false, status: 'PENDING' });
  });

  it('getStatusForCooks returns a map keyed by cookId, one entry per distinct cook', async () => {
    const service = makeService([
      { cookId: 'cook-1', status: 'APPROVED', reviewedAt: new Date('2026-01-01T00:00:00Z') },
      { cookId: 'cook-2', status: 'REJECTED', rejectionReason: 'no photos' },
    ]);
    const result = await service.getStatusForCooks(['cook-1', 'cook-2', 'cook-3']);

    expect(result.get('cook-1')).toEqual({ verified: true, status: 'VERIFIED', verifiedAt: new Date('2026-01-01T00:00:00Z') });
    expect(result.get('cook-2')?.status).toBe('REJECTED');
    expect(result.has('cook-3')).toBe(false);
  });

  it('getStatusForCooks short-circuits on an empty id list without querying', async () => {
    const { createQueryBuilder } = makeQueryBuilderRepo([]);
    const service = new VerificationService(
      { createQueryBuilder } as any,
      {} as any,
      {} as CryptoService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );

    const result = await service.getStatusForCooks([]);

    expect(result.size).toBe(0);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});

describe('VerificationService.getRazorpayAccountForCook', () => {
  const makeService = (latest: Partial<VerificationRecord> | null) => {
    const findOne = jest.fn(async () => latest);
    return new VerificationService({ findOne } as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);
  };

  it('returns null when the cook has never submitted', async () => {
    const service = makeService(null);
    expect(await service.getRazorpayAccountForCook('cook-1')).toBeNull();
  });

  it('returns null when the account creation is still PENDING or FAILED — not just "not CREATED"', async () => {
    const pending = makeService({ razorpayAccountId: 'acc_cook1', razorpayAccountStatus: 'PENDING' });
    expect(await pending.getRazorpayAccountForCook('cook-1')).toBeNull();

    const failed = makeService({ razorpayAccountId: 'acc_cook1', razorpayAccountStatus: 'FAILED' });
    expect(await failed.getRazorpayAccountForCook('cook-1')).toBeNull();
  });

  it('returns the account id once it is actually CREATED', async () => {
    const service = makeService({ razorpayAccountId: 'acc_cook1', razorpayAccountStatus: 'CREATED' });
    expect(await service.getRazorpayAccountForCook('cook-1')).toBe('acc_cook1');
  });
});

describe('VerificationService.attachRazorpayAccount', () => {
  it('writes the account id and status via a plain update, not a transaction', async () => {
    const update = jest.fn(async () => undefined);
    const service = new VerificationService({ update } as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);

    await service.attachRazorpayAccount('record-1', 'acc_cook1', 'CREATED');

    expect(update).toHaveBeenCalledWith({ id: 'record-1' }, { razorpayAccountId: 'acc_cook1', razorpayAccountStatus: 'CREATED' });
  });

  it('records a FAILED status with no account id', async () => {
    const update = jest.fn(async () => undefined);
    const service = new VerificationService({ update } as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);

    await service.attachRazorpayAccount('record-1', null, 'FAILED');

    expect(update).toHaveBeenCalledWith({ id: 'record-1' }, { razorpayAccountId: undefined, razorpayAccountStatus: 'FAILED' });
  });
});

describe('VerificationService.findByIds', () => {
  it('returns an empty array without querying when given no ids', async () => {
    const find = jest.fn();
    const service = new VerificationService({ find } as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);

    const result = await service.findByIds([]);

    expect(result).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('looks up specific records by id (not "latest per cook")', async () => {
    const rows = [{ id: 'record-1' }, { id: 'record-2' }];
    const find = jest.fn(async () => rows);
    const service = new VerificationService({ find } as any, {} as any, {} as CryptoService, { emit: jest.fn() } as unknown as EventEmitter2);

    const result = await service.findByIds(['record-1', 'record-2']);

    expect(result).toBe(rows);
  });
});
