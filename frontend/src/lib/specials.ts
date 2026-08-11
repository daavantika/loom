import type { Dish, Kitchen } from '../data/types';

export interface Special {
  dish: Dish;
  cook: string;
  cookId: string;
  left: string;
}

const MAX_SPECIALS = 6;

/** Real "today's specials" — dishes any cook has flagged via the Menu tab
 * (Dish.isTodaysSpecial), scanned across every real kitchen. No hardcoded
 * kitchen ids — whichever cooks opt in show up here, or none do yet. */
export function todaysSpecials(kitchens: Kitchen[]): Special[] {
  const specials: Special[] = [];
  for (const kitchen of kitchens) {
    for (const dish of kitchen.dishes) {
      if (!dish.isTodaysSpecial) continue;
      const left = dish.specialPortionsLeft != null ? `${dish.specialPortionsLeft} portions left` : 'Ask about availability';
      specials.push({ dish, cook: kitchen.name, cookId: kitchen.id, left });
      if (specials.length >= MAX_SPECIALS) return specials;
    }
  }
  return specials;
}
