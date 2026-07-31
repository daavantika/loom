import type { Dish, Kitchen } from '../data/types';

export interface Special {
  dish: Dish;
  cook: string;
  cookId: string;
  left: string;
}

/** The three featured "today's specials" dishes. Looked up by stable kitchen id
 * (not array index) so a published seller store — which is prepended to the
 * kitchens list — can never shift these onto the wrong kitchen/dish. */
export function todaysSpecials(kitchens: Kitchen[]): Special[] {
  const meera = kitchens.find((k) => k.id === 'meera');
  const shafi = kitchens.find((k) => k.id === 'shafi');
  const anitha = kitchens.find((k) => k.id === 'anitha');
  const specials: Special[] = [];
  if (meera) specials.push({ dish: meera.dishes[0], cook: meera.name, cookId: meera.id, left: '7 portions left' });
  if (shafi) specials.push({ dish: shafi.dishes[0], cook: shafi.name, cookId: shafi.id, left: '5 portions left' });
  if (anitha) specials.push({ dish: anitha.dishes[1], cook: anitha.name, cookId: anitha.id, left: '4 portions left' });
  return specials;
}
