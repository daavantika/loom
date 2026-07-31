import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CooksService } from './cooks.service';
import { VerificationService } from '../verification/verification.service';

function makeProfileRepo(profile: any) {
  return {
    findOne: jest.fn(async () => profile),
    create: jest.fn((input) => ({ status: 'DRAFT', minOrderValuePaise: 0, ...input })),
    save: jest.fn(async (entity) => entity),
  };
}

function makeVerification(getStatusForCookResult: { status: string; verified: boolean }) {
  return {
    submit: jest.fn(async () => ({ id: 'record-1', status: 'SUBMITTED' })),
    getStatusForCook: jest.fn(async () => getStatusForCookResult),
  } as unknown as VerificationService;
}

describe('CooksService.submitVerification', () => {
  const dto = { payoutMethod: 'UPI' as const, payoutDetails: 'cook@upi' };

  it('rejects submission when required onboarding fields are missing', async () => {
    const incompleteProfile = {
      id: 'cook-1',
      userId: 'user-1',
      kitchenName: undefined,
      ownerName: 'Meera',
      area: undefined,
      deliveryRadiusKm: 5,
      photos: [],
      status: 'DRAFT',
    };
    const profiles = makeProfileRepo(incompleteProfile);
    const verification = makeVerification({ status: 'NONE', verified: false });
    const service = new CooksService(profiles as any, {} as any, verification);

    await expect(service.submitVerification('user-1', dto)).rejects.toThrow(BadRequestException);
    expect(verification.submit).not.toHaveBeenCalled();
  });

  it('refuses to resubmit an already-verified kitchen (per the admin DB, not a local column)', async () => {
    const profile = {
      id: 'cook-1',
      userId: 'user-1',
      kitchenName: 'Meera Kitchen',
      ownerName: 'Meera',
      area: 'RS Puram',
      deliveryRadiusKm: 5,
      photos: [{ url: 'x' }],
      status: 'PENDING_VERIFICATION',
    };
    const profiles = makeProfileRepo(profile);
    const verification = makeVerification({ status: 'VERIFIED', verified: true });
    const service = new CooksService(profiles as any, {} as any, verification);

    await expect(service.submitVerification('user-1', dto)).rejects.toThrow(ConflictException);
    expect(verification.getStatusForCook).toHaveBeenCalledWith('cook-1');
  });

  it('submits successfully once all required fields and a photo are present, moving status to PENDING_VERIFICATION', async () => {
    const completeProfile = {
      id: 'cook-1',
      userId: 'user-1',
      kitchenName: 'Meera Kitchen',
      ownerName: 'Meera',
      area: 'RS Puram',
      deliveryRadiusKm: 5,
      photos: [{ url: 'x' }],
      status: 'DRAFT',
    };
    const profiles = makeProfileRepo(completeProfile);
    const verification = makeVerification({ status: 'NONE', verified: false });
    const service = new CooksService(profiles as any, {} as any, verification);

    const result = await service.submitVerification('user-1', dto);

    expect(verification.submit).toHaveBeenCalledWith('cook-1', dto, false);
    expect(result.profile.status).toBe('PENDING_VERIFICATION');
  });

  it('marks a resubmission as such when the admin DB says the prior attempt was rejected', async () => {
    const completeProfile = {
      id: 'cook-1',
      userId: 'user-1',
      kitchenName: 'Meera Kitchen',
      ownerName: 'Meera',
      area: 'RS Puram',
      deliveryRadiusKm: 5,
      photos: [{ url: 'x' }],
      status: 'DRAFT',
    };
    const profiles = makeProfileRepo(completeProfile);
    const verification = makeVerification({ status: 'REJECTED', verified: false });
    const service = new CooksService(profiles as any, {} as any, verification);

    await service.submitVerification('user-1', dto);

    expect(verification.submit).toHaveBeenCalledWith('cook-1', dto, true);
  });
});

describe('CooksService.getPublicProfile', () => {
  it('merges the user-DB profile with the admin-DB verification status', async () => {
    const profile = { id: 'cook-1', kitchenName: 'Meera Kitchen', photos: [] };
    const profiles = makeProfileRepo(profile);
    const verification = makeVerification({ status: 'VERIFIED', verified: true });
    const service = new CooksService(profiles as any, {} as any, verification);

    const result = await service.getPublicProfile('cook-1');

    expect(result.profile).toBe(profile);
    expect(result.verification.verified).toBe(true);
    expect(verification.getStatusForCook).toHaveBeenCalledWith('cook-1');
  });
});

describe('CooksService.getMyProfileWithStatus', () => {
  it('merges the caller’s own profile with their live verification status', async () => {
    const profile = { id: 'cook-1', userId: 'user-1', kitchenName: 'Meera Kitchen', photos: [] };
    const profiles = makeProfileRepo(profile);
    const verification = makeVerification({ status: 'REJECTED', verified: false });
    const service = new CooksService(profiles as any, {} as any, verification);

    const result = await service.getMyProfileWithStatus('user-1');

    expect(result.profile).toBe(profile);
    expect(result.verification.status).toBe('REJECTED');
  });
});

describe('CooksService.findProfilesByIds', () => {
  it('returns an empty array without querying when given no ids', async () => {
    const find = jest.fn();
    const service = new CooksService({ find } as any, {} as any, {} as unknown as VerificationService);

    const result = await service.findProfilesByIds([]);

    expect(result).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('batch-looks-up profiles by id', async () => {
    const rows = [{ id: 'cook-1' }, { id: 'cook-2' }];
    const find = jest.fn(async () => rows);
    const service = new CooksService({ find } as any, {} as any, {} as unknown as VerificationService);

    const result = await service.findProfilesByIds(['cook-1', 'cook-2']);

    expect(result).toBe(rows);
  });
});

describe('CooksService.getOwnerContact', () => {
  it('joins to the linked user for email, alongside phone/kitchenName/ownerName from the profile', async () => {
    const findOne = jest.fn(async (opts: any) => {
      expect(opts).toEqual({ where: { id: 'cook-1' }, relations: ['user'] });
      return { id: 'cook-1', phone: '9876543210', kitchenName: 'Test Kitchen', ownerName: 'Test Owner', user: { email: 'cook@loom.test' } };
    });
    const service = new CooksService({ findOne } as any, {} as any, {} as unknown as VerificationService);

    const result = await service.getOwnerContact('cook-1');

    expect(result).toEqual({ email: 'cook@loom.test', phone: '9876543210', kitchenName: 'Test Kitchen', ownerName: 'Test Owner' });
  });

  it('404s when the cook profile does not exist', async () => {
    const findOne = jest.fn(async () => null);
    const service = new CooksService({ findOne } as any, {} as any, {} as unknown as VerificationService);

    await expect(service.getOwnerContact('nonexistent')).rejects.toThrow(NotFoundException);
  });
});
