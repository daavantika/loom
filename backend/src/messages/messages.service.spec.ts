import { BadRequestException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { MessagesService } from './messages.service';
import { CustomersService } from '../customers/customers.service';
import { CooksService } from '../cooks/cooks.service';

function makeQueryBuilder(rawRows: any[]) {
  const qb: any = {};
  ['innerJoin', 'select', 'addSelect', 'where', 'groupBy'].forEach((method) => {
    qb[method] = jest.fn(() => qb);
  });
  qb.getRawMany = jest.fn(async () => rawRows);
  return qb;
}

function makeService(overrides: Partial<{ messages: any; customers: any; cooks: any }> = {}) {
  const messages = overrides.messages ?? {
    find: jest.fn(async () => []),
    create: jest.fn((input) => ({ id: 'message-1', createdAt: new Date(), ...input })),
    save: jest.fn(async (entity) => entity),
    update: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => makeQueryBuilder([])),
  };
  const customers = overrides.customers ?? { getOrCreateProfile: jest.fn(async () => ({ id: 'customer-1' })) };
  const cooks = overrides.cooks ?? {
    getMyProfile: jest.fn(async () => ({ id: 'cook-1' })),
    getPublicProfile: jest.fn(async () => ({ profile: { id: 'cook-1' }, verification: { verified: true } })),
  };
  const service = new MessagesService(messages as any, customers as unknown as CustomersService, cooks as unknown as CooksService);
  return { service, messages, customers, cooks };
}

describe('MessagesService.listThread', () => {
  it('lists a thread ordered oldest-first', async () => {
    const rows = [{ id: 'm1' }, { id: 'm2' }];
    const find = jest.fn(async () => rows);
    const { service } = makeService({ messages: { find, create: jest.fn(), save: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() } });

    const result = await service.listThread('cook-1', 'customer-1');

    expect(result).toBe(rows);
    expect(find).toHaveBeenCalledWith({ where: { cookId: 'cook-1', customerId: 'customer-1' }, order: { createdAt: 'ASC' } });
  });
});

describe('MessagesService.sendMessage', () => {
  it('creates and saves a message with the given sender role and body', async () => {
    const { service, messages } = makeService();

    const result = await service.sendMessage('cook-1', 'customer-1', 'CUSTOMER', 'Hello!');

    expect(messages.create).toHaveBeenCalledWith({ cookId: 'cook-1', customerId: 'customer-1', senderRole: 'CUSTOMER', body: 'Hello!' });
    expect(result.body).toBe('Hello!');
  });
});

describe('MessagesService.markRead', () => {
  it("marks the OTHER party's unread messages read when the cook reads a thread", async () => {
    const { service, messages } = makeService();

    await service.markRead('cook-1', 'customer-1', 'COOK');

    expect(messages.update).toHaveBeenCalledWith(
      { cookId: 'cook-1', customerId: 'customer-1', senderRole: 'CUSTOMER', readAt: IsNull() },
      { readAt: expect.any(Date) },
    );
  });

  it("marks the cook's messages read when the customer reads a thread", async () => {
    const { service, messages } = makeService();

    await service.markRead('cook-1', 'customer-1', 'CUSTOMER');

    expect(messages.update).toHaveBeenCalledWith(
      expect.objectContaining({ senderRole: 'COOK' }),
      { readAt: expect.any(Date) },
    );
  });
});

describe('MessagesService.listConversationsForCook', () => {
  it('maps raw rows and sorts by most recent message first', async () => {
    const rawRows = [
      { customerId: 'customer-1', customerName: 'Asha', lastMessage: 'older', lastMessageAt: '2026-01-01T00:00:00Z', unreadCount: '0' },
      { customerId: 'customer-2', customerName: 'Ravi', lastMessage: 'newer', lastMessageAt: '2026-01-02T00:00:00Z', unreadCount: '3' },
    ];
    const createQueryBuilder = jest.fn(() => makeQueryBuilder(rawRows));
    const { service } = makeService({ messages: { find: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), createQueryBuilder } });

    const result = await service.listConversationsForCook('cook-1');

    expect(result[0]).toMatchObject({ customerId: 'customer-2', unreadCount: 3 });
    expect(result[1]).toMatchObject({ customerId: 'customer-1', unreadCount: 0 });
  });
});

describe('MessagesService.assertCookIsMessageable', () => {
  it('passes silently for a verified cook', async () => {
    const { service } = makeService();
    await expect(service.assertCookIsMessageable('cook-1')).resolves.toBeUndefined();
  });

  it('rejects an unverified cook', async () => {
    const { service } = makeService({
      cooks: { getMyProfile: jest.fn(), getPublicProfile: jest.fn(async () => ({ profile: { id: 'cook-1' }, verification: { verified: false } })) },
    });
    await expect(service.assertCookIsMessageable('cook-1')).rejects.toThrow(BadRequestException);
  });
});

describe('MessagesService.resolveOwnCustomerId / resolveOwnCookId', () => {
  it("resolves the caller's own customer profile id", async () => {
    const { service } = makeService();
    expect(await service.resolveOwnCustomerId('user-1')).toBe('customer-1');
  });

  it("resolves the caller's own cook profile id", async () => {
    const { service } = makeService();
    expect(await service.resolveOwnCookId('user-1')).toBe('cook-1');
  });
});
