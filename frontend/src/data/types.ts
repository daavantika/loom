export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  isTodaysSpecial?: boolean;
  specialPortionsLeft?: number;
  caloriesKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  fibreG?: number;
}

export interface Kitchen {
  id: string;
  name: string;
  cook: string;
  cuisine: string;
  rating: string;
  reviews: string;
  distance: string;
  time: string;
  image: string;
  avatar: string;
  bio: string;
  dishes: Dish[];
}

export interface CartItem {
  dish: Dish;
  kitchenId: string;
  quantity: number;
}

export interface Review {
  cookId: string;
  name: string;
  stars: number;
  text: string;
  photoName: string;
}

export interface PlanDraft {
  cookId: string;
  days: string[];
}

export type Role = 'customer' | 'cook' | 'admin';
export type CookTab = 'Overview' | 'Orders' | 'Messages' | 'Menu' | 'Customers' | 'More';
export type AdminTab = 'Needs review' | 'Hygiene' | 'Orders';

export interface ModerationCase {
  title: string;
  status: string;
  body: string;
  actions: Array<['approve' | 'review', 'approved' | 'review' | 'resolved', string]>;
}
