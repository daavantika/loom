import type { Kitchen } from '../data/types';

export function findDish(kitchens: Kitchen[], dishId: string): { dish: Kitchen['dishes'][number]; kitchen: Kitchen } | undefined {
  for (const kitchen of kitchens) {
    const dish = kitchen.dishes.find((d) => d.id === dishId);
    if (dish) return { dish, kitchen };
  }
  return undefined;
}
