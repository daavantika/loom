import { BadRequestException, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { MenuService } from './menu.service';

function makeItemsRepo(items: any[]) {
  return {
    find: jest.fn(async (opts: any) => items.filter((i) => matches(i, opts.where))),
    findOne: jest.fn(async (opts: any) => items.find((i) => i.id === opts.where.id) ?? null),
    create: jest.fn((input) => ({ id: 'new-item', tags: [], active: true, ...input })),
    save: jest.fn(async (entity) => entity),
    delete: jest.fn(async () => undefined),
  };
}

function matches(item: any, where: any) {
  return Object.entries(where).every(([key, value]) => item[key] === value);
}

describe('MenuService', () => {
  it('creates a menu item defaulting tags to an empty array', async () => {
    const repo = makeItemsRepo([]);
    const service = new MenuService(repo as any);

    const result = await service.create('cook-1', { name: 'Dosa', pricePaise: 5000 } as any);

    expect(result.cookId).toBe('cook-1');
    expect(result.tags).toEqual([]);
  });

  it('listActiveForCook only returns active items', async () => {
    const repo = makeItemsRepo([
      { id: '1', cookId: 'cook-1', active: true },
      { id: '2', cookId: 'cook-1', active: false },
    ]);
    const service = new MenuService(repo as any);

    const result = await service.listActiveForCook('cook-1');

    expect(result.map((i) => i.id)).toEqual(['1']);
  });

  it('refuses to update a menu item owned by a different cook (404, not another cook\'s data)', async () => {
    const repo = makeItemsRepo([{ id: 'item-1', cookId: 'cook-A', name: 'Idli' }]);
    const service = new MenuService(repo as any);

    await expect(service.update('cook-B', 'item-1', { name: 'Hacked' } as any)).rejects.toThrow(NotFoundException);
  });

  it('refuses to delete a menu item owned by a different cook', async () => {
    const repo = makeItemsRepo([{ id: 'item-1', cookId: 'cook-A' }]);
    const service = new MenuService(repo as any);

    await expect(service.delete('cook-B', 'item-1')).rejects.toThrow(NotFoundException);
  });

  it('allows the owning cook to update their own item', async () => {
    const repo = makeItemsRepo([{ id: 'item-1', cookId: 'cook-A', name: 'Idli', active: true }]);
    const service = new MenuService(repo as any);

    const result = await service.update('cook-A', 'item-1', { active: false } as any);

    expect(result.active).toBe(false);
  });
});

function makeOrderableItemsRepo(items: any[]) {
  return {
    find: jest.fn(async (opts: any) => {
      const idOperator = opts.where.id as ReturnType<typeof In>;
      const ids: string[] = (idOperator as any).value;
      return items.filter((i) => ids.includes(i.id) && i.cookId === opts.where.cookId && i.active === opts.where.active);
    }),
  };
}

describe('MenuService.getOrderableItems', () => {
  it('returns the requested items when all belong to the cook and are active', async () => {
    const repo = makeOrderableItemsRepo([
      { id: 'item-1', cookId: 'cook-1', active: true },
      { id: 'item-2', cookId: 'cook-1', active: true },
    ]);
    const service = new MenuService(repo as any);

    const result = await service.getOrderableItems('cook-1', ['item-1', 'item-2']);

    expect(result.map((i) => i.id).sort()).toEqual(['item-1', 'item-2']);
  });

  it('rejects when a requested item belongs to a different cook', async () => {
    const repo = makeOrderableItemsRepo([{ id: 'item-1', cookId: 'cook-OTHER', active: true }]);
    const service = new MenuService(repo as any);

    await expect(service.getOrderableItems('cook-1', ['item-1'])).rejects.toThrow(BadRequestException);
  });

  it('rejects when a requested item is inactive', async () => {
    const repo = makeOrderableItemsRepo([{ id: 'item-1', cookId: 'cook-1', active: false }]);
    const service = new MenuService(repo as any);

    await expect(service.getOrderableItems('cook-1', ['item-1'])).rejects.toThrow(BadRequestException);
  });

  it('rejects when a requested item does not exist at all', async () => {
    const repo = makeOrderableItemsRepo([]);
    const service = new MenuService(repo as any);

    await expect(service.getOrderableItems('cook-1', ['nonexistent'])).rejects.toThrow(BadRequestException);
  });
});
