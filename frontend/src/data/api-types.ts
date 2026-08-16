// Types mirroring the backend's JSON response shapes (see ../../backend/src).
// Kept separate from ./types.ts, which describes the frontend's own UI-facing
// (partly still mock-backed) Kitchen/Dish/CartItem shapes.

export interface ApiCookProfile {
  id: string;
  kitchenName?: string;
  ownerName?: string;
  area?: string;
  bio?: string;
  deliveryRadiusKm?: number;
  minOrderValuePaise: number;
  verified: boolean;
  photos: string[];
}

export interface ApiMenuItem {
  id: string;
  cookId: string;
  name: string;
  description?: string;
  pricePaise: number;
  imageUrl?: string;
  tags: string[];
  active: boolean;
  isTodaysSpecial: boolean;
  specialPortionsLeft?: number;
  caloriesKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  fibreG?: number;
}

export interface ApiStory {
  id: string;
  cookId: string;
  title: string;
  body: string;
  createdAt: string;
  /** Only present on the public GET /stories feed, not the cook's own GET /cooks/me/stories list. */
  kitchenName?: string;
  cookImage?: string;
}

export interface ApiCustomerProfile {
  id: string;
  userId: string;
  displayName?: string;
  dietaryPreference?: string;
  spiceLevel?: string;
}

export interface ApiCustomerAddress {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  area?: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export type ApiOrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface ApiOrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  pricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export type ApiOrderPaymentStatus = 'COD' | 'PENDING' | 'PAID' | 'FAILED';
export type ApiOrderPaymentMethod = 'COD' | 'ONLINE';

export interface ApiOrder {
  id: string;
  customerId: string;
  cookId: string;
  deliveryAddressLabel: string;
  deliveryAddressLine: string;
  deliveryArea?: string;
  status: ApiOrderStatus;
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  paymentStatus: ApiOrderPaymentStatus;
  paymentMethod: ApiOrderPaymentMethod;
  razorpayOrderId?: string;
  items: ApiOrderItem[];
  createdAt: string;
}

/** Only present on POST /orders's response when paymentMethod was 'ONLINE'. */
export interface ApiRazorpayCheckout {
  orderId: string;
  amountPaise: number;
  keyId: string;
}

export type ApiCreateOrderResponse = ApiOrder & { razorpay?: ApiRazorpayCheckout };

export interface ApiPaymentsConfig {
  enabled: boolean;
  keyId: string | null;
}

export interface ApiOrderStatusEvent {
  id: string;
  orderId: string;
  status: ApiOrderStatus;
  actorUserId: string;
  note?: string;
  createdAt: string;
}

export interface ApiAuthResponse {
  accessToken: string;
  userId: string;
  email: string;
  role: string;
}

export interface ApiKitchenPhoto {
  id: string;
  cookId: string;
  url: string;
  sortOrder: number;
}

export type ApiCookVerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

/**
 * GET /cooks/me's shape — the caller's OWN profile, distinct from
 * ApiCookProfile (the public/catalog shape via toPublicCookProfile). Notably
 * `photos` here is the raw KitchenPhoto[] relation, not a flattened
 * string[], and status only ever holds DRAFT/PENDING_VERIFICATION —
 * verified/rejected live in the separate verificationStatus field, merged
 * live from the admin DB, never cached.
 */
export interface ApiMyCookProfile {
  id: string;
  userId: string;
  kitchenName?: string;
  ownerName?: string;
  phone?: string;
  area?: string;
  addressLine?: string;
  lat?: number;
  lng?: number;
  deliveryRadiusKm?: number;
  bio?: string;
  minOrderValuePaise: number;
  status: 'DRAFT' | 'PENDING_VERIFICATION';
  createdAt: string;
  updatedAt: string;
  photos: ApiKitchenPhoto[];
  verified: boolean;
  verificationStatus: ApiCookVerificationStatus;
  rejectionReason?: string;
}

/** GET /admin/moderation/verifications's enriched shape. */
export interface ApiEnrichedModerationCase {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  assignedAdminId?: string;
  resolutionNotes?: string;
  openedAt: string;
  resolvedAt?: string;
  verification: {
    fssaiNumber?: string;
    fssaiDocUrl?: string;
    payoutMethod: 'UPI' | 'BANK';
    type: 'INITIAL' | 'RENEWAL';
    createdAt: string;
  } | null;
  cook: {
    id: string;
    kitchenName?: string;
    ownerName?: string;
    area?: string;
    photos: string[];
    deliveryRadiusKm?: number;
    bio?: string;
  } | null;
}

/** GET /admin/cooks's directory shape — every cook profile regardless of onboarding status. */
export interface ApiAdminCookProfile {
  id: string;
  kitchenName?: string;
  ownerName?: string;
  phone?: string;
  area?: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION';
  minOrderValuePaise: number;
  photos: string[];
  createdAt: string;
  verified: boolean;
  verificationStatus: ApiCookVerificationStatus;
  rejectionReason?: string;
}

export interface ApiMessage {
  id: string;
  cookId: string;
  customerId: string;
  senderRole: 'COOK' | 'CUSTOMER';
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface ApiConversationSummary {
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ApiAssistantMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ApiAssistantChatResponse {
  reply: string;
}
