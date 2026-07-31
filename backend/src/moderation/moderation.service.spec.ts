import { ModerationService } from './moderation.service';
import { VerificationService } from '../verification/verification.service';
import { CooksService } from '../cooks/cooks.service';

describe('ModerationService.listOpenVerificationCases', () => {
  it('returns an empty array without querying verification/cook services when there are no open cases', async () => {
    const cases = { find: jest.fn(async () => []) };
    const verification = { findByIds: jest.fn() };
    const cooks = { findProfilesByIds: jest.fn() };
    const service = new ModerationService(
      cases as any,
      verification as unknown as VerificationService,
      cooks as unknown as CooksService,
      {} as any,
    );

    const result = await service.listOpenVerificationCases();

    expect(result).toEqual([]);
    expect(verification.findByIds).not.toHaveBeenCalled();
    expect(cooks.findProfilesByIds).not.toHaveBeenCalled();
  });

  it('enriches each case with its verification record and cook profile', async () => {
    const modCase = { id: 'case-1', type: 'VERIFICATION', entityType: 'verification_record', entityId: 'record-1', status: 'OPEN' };
    const record = {
      id: 'record-1',
      cookId: 'cook-1',
      fssaiNumber: 'FSSAI123',
      fssaiDocUrl: 'https://example.com/doc.pdf',
      payoutMethod: 'UPI',
      type: 'INITIAL',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    const cook = {
      id: 'cook-1',
      kitchenName: 'Meera Kitchen',
      ownerName: 'Meera',
      area: 'RS Puram',
      deliveryRadiusKm: 5,
      bio: 'Home cook',
      photos: [{ url: 'https://example.com/kitchen.jpg' }],
    };

    const cases = { find: jest.fn(async () => [modCase]) };
    const verification = { findByIds: jest.fn(async () => [record]) };
    const cooks = { findProfilesByIds: jest.fn(async () => [cook]) };
    const service = new ModerationService(
      cases as any,
      verification as unknown as VerificationService,
      cooks as unknown as CooksService,
      {} as any,
    );

    const [result] = await service.listOpenVerificationCases();

    expect(verification.findByIds).toHaveBeenCalledWith(['record-1']);
    expect(cooks.findProfilesByIds).toHaveBeenCalledWith(['cook-1']);
    expect(result.id).toBe('case-1');
    expect(result.verification).toEqual({
      fssaiNumber: 'FSSAI123',
      fssaiDocUrl: 'https://example.com/doc.pdf',
      payoutMethod: 'UPI',
      type: 'INITIAL',
      createdAt: record.createdAt,
    });
    expect(result.cook).toEqual({
      id: 'cook-1',
      kitchenName: 'Meera Kitchen',
      ownerName: 'Meera',
      area: 'RS Puram',
      photos: ['https://example.com/kitchen.jpg'],
      deliveryRadiusKm: 5,
      bio: 'Home cook',
    });
  });

  it('degrades gracefully to null verification/cook when a referenced record or profile is missing', async () => {
    const modCase = { id: 'case-1', type: 'VERIFICATION', entityType: 'verification_record', entityId: 'record-missing', status: 'OPEN' };
    const cases = { find: jest.fn(async () => [modCase]) };
    const verification = { findByIds: jest.fn(async () => []) };
    const cooks = { findProfilesByIds: jest.fn(async () => []) };
    const service = new ModerationService(
      cases as any,
      verification as unknown as VerificationService,
      cooks as unknown as CooksService,
      {} as any,
    );

    const [result] = await service.listOpenVerificationCases();

    expect(result.verification).toBeNull();
    expect(result.cook).toBeNull();
  });
});
