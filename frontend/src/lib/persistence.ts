import type { Review } from '../data/types';

const REVIEWS_KEY = 'loom-customer-reviews';

export function loadReviews(): Review[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (Array.isArray(saved)) return saved as Review[];
  } catch {
    /* fall through to empty */
  }
  return [];
}

export function saveReviews(reviews: Review[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}
