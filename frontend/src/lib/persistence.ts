import type { Review } from '../data/types';

const REVIEWS_KEY = 'loom-customer-reviews';

const defaultReviews: Review[] = [
  { cookId: 'meera', name: 'Priya S.', stars: 5, text: 'The lemon rice was exactly like home.', photoName: 'meal-photo.jpg' },
  { cookId: 'anitha', name: 'Nandini K.', stars: 5, text: 'Perfectly soft tea cake and such careful packaging.', photoName: '' },
];

export function loadReviews(): Review[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (Array.isArray(saved)) return saved as Review[];
  } catch {
    /* fall through to defaults */
  }
  return defaultReviews;
}

export function saveReviews(reviews: Review[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}
