import { apiFetch } from './api';
import { foodImages } from '../data/kitchens';
import type { Kitchen, Dish } from '../data/types';
import type { ApiCookProfile, ApiMenuItem } from '../data/api-types';

export function adaptMenuItemToDish(item: ApiMenuItem): Dish {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    price: item.pricePaise / 100,
    image: item.imageUrl ?? foodImages.thali,
    tags: item.tags,
    isTodaysSpecial: item.isTodaysSpecial,
    specialPortionsLeft: item.specialPortionsLeft,
    caloriesKcal: item.caloriesKcal,
    proteinG: item.proteinG,
    fatG: item.fatG,
    carbsG: item.carbsG,
    fibreG: item.fibreG,
  };
}

/**
 * Maps a real cook + their menu onto the existing (originally mock-shaped)
 * Kitchen type so every screen that already consumes Kitchen/Dish (Explore,
 * CookProfileModal, Cart, FavouritesModal, Home) needs zero shape changes.
 * Fields with no real backend equivalent yet (rating/reviews/cuisine) get
 * honest placeholders, never fabricated numbers — `distance` is reused to
 * show the cook's free-text `area` since there's no real geo-distance yet.
 */
export function adaptCookToKitchen(cook: ApiCookProfile, menuItems: ApiMenuItem[]): Kitchen {
  const photo = cook.photos[0];
  return {
    id: cook.id,
    name: cook.kitchenName ?? 'Unnamed kitchen',
    cook: cook.ownerName ?? '',
    cuisine: 'Home kitchen',
    rating: '—',
    reviews: '0',
    distance: cook.area ?? '',
    time: 'Ask for today’s slot',
    image: photo ?? foodImages.kitchen,
    avatar: photo ?? foodImages.cook1,
    bio: cook.bio ?? '',
    dishes: menuItems.filter((item) => item.active).map(adaptMenuItemToDish),
  };
}

/** N+1 (one /menu call per cook) — an accepted prototype-scale tradeoff; a bulk endpoint can be added later if the catalog grows large. */
export async function fetchCatalog(): Promise<Kitchen[]> {
  const cooks = await apiFetch<ApiCookProfile[]>('/cooks?verifiedOnly=true', { auth: false });
  return Promise.all(
    cooks.map(async (cook) => {
      const menu = await apiFetch<ApiMenuItem[]>(`/cooks/${cook.id}/menu`, { auth: false });
      return adaptCookToKitchen(cook, menu);
    }),
  );
}
