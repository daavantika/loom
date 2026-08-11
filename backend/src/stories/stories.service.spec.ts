import { NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { StoriesService } from './stories.service';
import { CooksService } from '../cooks/cooks.service';

function makeStoriesRepo(rows: any[]) {
  return {
    find: jest.fn(async (opts: any) => {
      const cookId = opts?.where?.cookId;
      if (cookId && typeof cookId === 'object' && 'value' in cookId) {
        // In(...) FindOperator — used by listPublicFeed
        const ids: string[] = (cookId as ReturnType<typeof In>).value;
        return rows.filter((r) => ids.includes(r.cookId));
      }
      return rows.filter((r) => r.cookId === cookId);
    }),
    findOne: jest.fn(async (opts: any) => rows.find((r) => r.id === opts.where.id) ?? null),
    create: jest.fn((input) => ({ id: 'new-story', createdAt: new Date(), ...input })),
    save: jest.fn(async (entity) => entity),
    delete: jest.fn(async () => undefined),
  };
}

function makeService(rows: any[], cooksOverride?: any) {
  const stories = makeStoriesRepo(rows);
  const cooks =
    cooksOverride ??
    ({
      searchPublic: jest.fn(async () => [{ id: 'cook-1', kitchenName: "Meera's Kitchen", photos: ['photo.jpg'] }]),
    } as unknown as CooksService);
  const service = new StoriesService(stories as any, cooks);
  return { service, stories, cooks };
}

describe('StoriesService.create', () => {
  it('creates a story owned by the given cook', async () => {
    const { service } = makeService([]);

    const result = await service.create('cook-1', { title: 'My first tiffin', body: 'A short story' });

    expect(result.cookId).toBe('cook-1');
    expect(result.title).toBe('My first tiffin');
  });
});

describe('StoriesService.listForCook', () => {
  it("returns only the cook's own stories, newest first per the query", async () => {
    const { service, stories } = makeService([
      { id: 's1', cookId: 'cook-1' },
      { id: 's2', cookId: 'cook-2' },
    ]);

    const result = await service.listForCook('cook-1');

    expect(result.map((s: any) => s.id)).toEqual(['s1']);
    expect(stories.find).toHaveBeenCalledWith({ where: { cookId: 'cook-1' }, order: { createdAt: 'DESC' } });
  });
});

describe('StoriesService.delete', () => {
  it('refuses to delete a story owned by a different cook', async () => {
    const { service } = makeService([{ id: 's1', cookId: 'cook-A' }]);

    await expect(service.delete('cook-B', 's1')).rejects.toThrow(NotFoundException);
  });

  it('deletes a story owned by the requesting cook', async () => {
    const { service, stories } = makeService([{ id: 's1', cookId: 'cook-A' }]);

    await service.delete('cook-A', 's1');

    expect(stories.delete).toHaveBeenCalledWith({ id: 's1' });
  });
});

describe('StoriesService.listPublicFeed', () => {
  it('only returns stories from verified cooks, enriched with kitchen name/photo', async () => {
    const { service } = makeService([
      { id: 's1', cookId: 'cook-1', title: 'Verified story', body: 'body', createdAt: new Date() },
      { id: 's2', cookId: 'cook-unverified', title: 'Should not appear', body: 'body', createdAt: new Date() },
    ]);

    const result = await service.listPublicFeed();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(result[0].kitchenName).toBe("Meera's Kitchen");
    expect(result[0].cookImage).toBe('photo.jpg');
  });

  it('returns an empty feed with no query when there are no verified cooks', async () => {
    const cooks = { searchPublic: jest.fn(async () => []) } as unknown as CooksService;
    const { service, stories } = makeService([{ id: 's1', cookId: 'cook-1' }], cooks);

    const result = await service.listPublicFeed();

    expect(result).toEqual([]);
    expect(stories.find).not.toHaveBeenCalled();
  });
});
