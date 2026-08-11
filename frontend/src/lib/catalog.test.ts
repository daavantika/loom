import { describe, expect, it } from 'vitest';
import { adaptCookToKitchen, adaptMenuItemToDish } from './catalog';
import type { ApiCookProfile, ApiMenuItem } from '../data/api-types';

describe('adaptMenuItemToDish', () => {
  it('converts pricePaise to rupees', () => {
    const item: ApiMenuItem = {
      id: 'item-1',
      cookId: 'cook-1',
      name: 'Dosa',
      pricePaise: 6000,
      tags: ['Veg'],
      active: true,
      isTodaysSpecial: false,
    };
    const dish = adaptMenuItemToDish(item);
    expect(dish.price).toBe(60);
  });

  it('falls back to an empty description and a placeholder image when absent', () => {
    const item: ApiMenuItem = { id: 'item-1', cookId: 'cook-1', name: 'Dosa', pricePaise: 100, tags: [], active: true, isTodaysSpecial: false };
    const dish = adaptMenuItemToDish(item);
    expect(dish.description).toBe('');
    expect(dish.image).toMatch(/^https:\/\//);
  });

  it('maps today\'s-special and nutrition fields through from the API shape', () => {
    const item: ApiMenuItem = {
      id: 'item-1',
      cookId: 'cook-1',
      name: 'Lemon rice',
      pricePaise: 15000,
      tags: [],
      active: true,
      isTodaysSpecial: true,
      specialPortionsLeft: 7,
      caloriesKcal: 320,
      proteinG: 8.5,
      fatG: 10,
      carbsG: 45,
      fibreG: 3,
    };
    const dish = adaptMenuItemToDish(item);
    expect(dish.isTodaysSpecial).toBe(true);
    expect(dish.specialPortionsLeft).toBe(7);
    expect(dish.caloriesKcal).toBe(320);
    expect(dish.proteinG).toBe(8.5);
    expect(dish.fatG).toBe(10);
    expect(dish.carbsG).toBe(45);
    expect(dish.fibreG).toBe(3);
  });
});

describe('adaptCookToKitchen', () => {
  const cook: ApiCookProfile = {
    id: 'cook-1',
    kitchenName: 'Meera Kitchen',
    ownerName: 'Meera',
    area: 'RS Puram',
    minOrderValuePaise: 5000,
    verified: true,
    photos: [],
  };

  it('only includes active menu items as dishes', () => {
    const items: ApiMenuItem[] = [
      { id: 'a', cookId: 'cook-1', name: 'Active', pricePaise: 100, tags: [], active: true, isTodaysSpecial: false },
      { id: 'b', cookId: 'cook-1', name: 'Inactive', pricePaise: 100, tags: [], active: false, isTodaysSpecial: false },
    ];
    const kitchen = adaptCookToKitchen(cook, items);
    expect(kitchen.dishes.map((d) => d.id)).toEqual(['a']);
  });

  it('uses honest placeholders for fields with no backend equivalent, not fabricated numbers', () => {
    const kitchen = adaptCookToKitchen(cook, []);
    expect(kitchen.rating).toBe('—');
    expect(kitchen.reviews).toBe('0');
    expect(kitchen.distance).toBe('RS Puram');
  });

  it('falls back to placeholder images when the cook has no photos', () => {
    const kitchen = adaptCookToKitchen(cook, []);
    expect(kitchen.image).toMatch(/^https:\/\//);
    expect(kitchen.avatar).toMatch(/^https:\/\//);
  });

  it('uses the cook’s own first photo when available', () => {
    const withPhoto = { ...cook, photos: ['https://example.com/kitchen.jpg'] };
    const kitchen = adaptCookToKitchen(withPhoto, []);
    expect(kitchen.image).toBe('https://example.com/kitchen.jpg');
  });
});
