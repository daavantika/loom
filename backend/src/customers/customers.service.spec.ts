import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CooksService } from '../cooks/cooks.service';

function makeProfilesRepo(existing: any) {
  return {
    findOne: jest.fn(async () => existing),
    create: jest.fn((input) => ({ id: 'profile-1', ...input })),
    save: jest.fn(async (entity) => ({ id: entity.id ?? 'profile-1', ...entity })),
  };
}

function makeTransactionalDataSource() {
  // Simplified in-memory transaction: `manager.withRepository(repo)` just returns
  // the same repo, since these unit tests don't need real isolation — only that
  // the default-address unset-then-set sequencing happens.
  return {
    transaction: jest.fn(async (cb: any) => cb({ withRepository: (repo: any) => repo })),
  };
}

describe('CustomersService.getOrCreateProfile', () => {
  it('creates a profile on first call, reuses it after', async () => {
    const profiles = makeProfilesRepo(null);
    const service = new CustomersService(
      profiles as any,
      {} as any,
      {} as any,
      makeTransactionalDataSource() as any,
      {} as unknown as CooksService,
    );

    const result = await service.getOrCreateProfile('user-1');

    expect(profiles.create).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.id).toBe('profile-1');
  });
});

describe('CustomersService address defaults', () => {
  it('unsets other addresses as default when adding a new default address', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const addresses = {
      update: jest.fn(async () => undefined),
      create: jest.fn((input) => ({ id: 'addr-2', ...input })),
      save: jest.fn(async (entity) => entity),
    };
    const service = new CustomersService(
      profiles as any,
      addresses as any,
      {} as any,
      makeTransactionalDataSource() as any,
      {} as unknown as CooksService,
    );

    const result = await service.addAddress('user-1', {
      label: 'Work',
      addressLine: '123 Main St',
      isDefault: true,
    } as any);

    expect(addresses.update).toHaveBeenCalledWith({ customerId: 'profile-1' }, { isDefault: false });
    expect(result.isDefault).toBe(true);
  });

  it('does not touch other addresses when the new address is not marked default', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const addresses = {
      update: jest.fn(async () => undefined),
      create: jest.fn((input) => ({ id: 'addr-2', ...input })),
      save: jest.fn(async (entity) => entity),
    };
    const service = new CustomersService(
      profiles as any,
      addresses as any,
      {} as any,
      makeTransactionalDataSource() as any,
      {} as unknown as CooksService,
    );

    await service.addAddress('user-1', { label: 'Home', addressLine: '1 First St' } as any);

    expect(addresses.update).not.toHaveBeenCalled();
  });

  it('refuses to update an address owned by a different customer (404)', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const addresses = {
      findOne: jest.fn(async () => ({ id: 'addr-1', customerId: 'someone-elses-profile' })),
    };
    const service = new CustomersService(
      profiles as any,
      addresses as any,
      {} as any,
      makeTransactionalDataSource() as any,
      {} as unknown as CooksService,
    );

    await expect(service.updateAddress('user-1', 'addr-1', { label: 'Hacked' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('CustomersService favorites', () => {
  it('addFavorite 404s when the cook does not exist', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const cooks = { getPublicProfile: jest.fn().mockRejectedValue(new NotFoundException()) };
    const service = new CustomersService(
      profiles as any,
      {} as any,
      {} as any,
      makeTransactionalDataSource() as any,
      cooks as unknown as CooksService,
    );

    await expect(service.addFavorite('user-1', 'nonexistent-cook')).rejects.toThrow(NotFoundException);
  });

  it('addFavorite is idempotent — inserts with ON CONFLICT DO NOTHING for an already-favorited cook', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const cooks = { getPublicProfile: jest.fn().mockResolvedValue({}) };
    const qb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const favorites = { createQueryBuilder: jest.fn(() => qb) };
    const service = new CustomersService(
      profiles as any,
      {} as any,
      favorites as any,
      makeTransactionalDataSource() as any,
      cooks as unknown as CooksService,
    );

    await service.addFavorite('user-1', 'cook-1');

    expect(qb.values).toHaveBeenCalledWith({ customerId: 'profile-1', cookId: 'cook-1' });
    expect(qb.orIgnore).toHaveBeenCalled();
  });

  it('removeFavorite is idempotent — delete is a no-op if the row does not exist', async () => {
    const profiles = makeProfilesRepo({ id: 'profile-1', userId: 'user-1' });
    const favorites = { delete: jest.fn(async () => ({ affected: 0 })) };
    const service = new CustomersService(
      profiles as any,
      {} as any,
      favorites as any,
      makeTransactionalDataSource() as any,
      {} as unknown as CooksService,
    );

    await service.removeFavorite('user-1', 'cook-1');

    expect(favorites.delete).toHaveBeenCalledWith({ customerId: 'profile-1', cookId: 'cook-1' });
  });
});
