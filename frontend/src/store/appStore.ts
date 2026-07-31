import { create } from 'zustand';
import type { CartItem, CookTab, AdminTab, Review, PlanDraft, Kitchen } from '../data/types';
import type { ModalState } from '../data/modal';
import type {
  ApiAssistantChatResponse,
  ApiAssistantMessage,
  ApiAuthResponse,
  ApiConversationSummary,
  ApiCookProfile,
  ApiCreateOrderResponse,
  ApiCustomerAddress,
  ApiCustomerProfile,
  ApiEnrichedModerationCase,
  ApiMenuItem,
  ApiMessage,
  ApiMyCookProfile,
  ApiOrder,
  ApiOrderStatus,
  ApiPaymentsConfig,
} from '../data/api-types';
import { findDish } from '../lib/kitchens';
import { baseKitchens } from '../data/kitchens';
import { loadReviews, saveReviews } from '../lib/persistence';
import { apiFetch, ApiError } from '../lib/api';
import { getSession, setSession, clearSession, type AuthSession } from '../lib/auth';
import { fetchCatalog } from '../lib/catalog';
import { loadRazorpayCheckout, openRazorpayCheckout } from '../lib/razorpay';

interface ActionResult {
  ok: boolean;
  message: string;
}

interface MenuItemInput {
  name: string;
  description?: string;
  pricePaise: number;
  imageUrl?: string;
  tags?: string[];
}

interface AppState {
  cart: CartItem[];
  search: string;
  activeChip: string;
  exploreCategory: string;
  activeFilters: string[];
  followed: Set<string>;
  delivery: string;
  address: string;
  cookTab: CookTab;
  adminTab: AdminTab;
  reviews: Review[];
  reviewDraft: { stars: number; photoName: string };
  planDraft: PlanDraft;
  modal: ModalState | null;
  toastMessage: string | null;
  toastNonce: number;

  // auth — real backend session (customer-only self-registration; cook/admin accounts log in the same way)
  auth: AuthSession | null;
  customerProfile: ApiCustomerProfile | null;

  // the caller's own kitchen application + live verification status (null + checked=true means "hasn't started onboarding yet")
  cookProfile: ApiMyCookProfile | null;
  cookProfileChecked: boolean;

  // real catalog (falls back to mock baseKitchens via kitchens() until loaded)
  catalogKitchens: Kitchen[];
  catalogLoaded: boolean;

  // real orders (customer side)
  orders: ApiOrder[];
  ordersLoading: boolean;

  // whether online payment is available at all (false until the platform's
  // Razorpay keys are configured) — checked once, drives whether Checkout
  // even offers "Pay online"
  paymentsConfig: ApiPaymentsConfig | null;

  // admin: real moderation queue
  moderationCases: ApiEnrichedModerationCase[];
  moderationCasesLoading: boolean;

  // cook: own menu + own incoming orders
  myMenuItems: ApiMenuItem[];
  myMenuLoading: boolean;
  cookOrders: ApiOrder[];
  cookOrdersLoading: boolean;

  // chat — customer side: a general thread with one kitchen (not per-order)
  chatThread: ApiMessage[];
  chatThreadCookId: string | null;
  chatThreadLoading: boolean;

  // chat — cook side: inbox of conversations, plus whichever one is open
  cookConversations: ApiConversationSummary[];
  cookConversationsLoading: boolean;
  cookThread: ApiMessage[];
  activeConversationCustomerId: string | null;
  cookThreadLoading: boolean;

  // AI assistant — stateless on the backend; the frontend holds the running
  // conversation and resends it each turn
  assistantMessages: ApiAssistantMessage[];
  assistantLoading: boolean;

  // derived-data helpers
  kitchens: () => Kitchen[];
  quantityOf: (dishId: string) => number;
  dishInCart: (dishId: string) => boolean;
  cartTotal: () => number;

  // cart
  addDish: (dishId: string) => void;
  changeQuantity: (dishId: string, amount: number) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: 'COD' | 'ONLINE') => Promise<ActionResult>;

  // browse / filters
  setSearch: (value: string) => void;
  setExploreCategory: (category: string) => void;
  setActiveChip: (chip: string) => void;
  toggleFilter: (filter: string) => void;
  resetFilters: () => void;
  toggleFollow: (cookId: string) => void;
  setDelivery: (slot: string) => void;
  setAddress: (address: string) => void;

  // dashboards
  setCookTab: (tab: CookTab) => void;
  setAdminTab: (tab: AdminTab) => void;

  // reviews
  resetReviewDraft: () => void;
  setReviewDraftStars: (stars: number) => void;
  setReviewDraftPhoto: (photoName: string) => void;

  // tiffin plan
  setPlanCookId: (cookId: string) => void;
  setPlanDays: (days: string[]) => void;
  togglePlanDay: (day: string) => void;

  // modal + toast
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  showToast: (message: string) => void;

  // auth actions
  login: (email: string, password: string) => Promise<ActionResult>;
  register: (email: string, password: string) => Promise<ActionResult>;
  logout: () => void;

  // real-data loaders
  loadCatalog: () => Promise<void>;
  loadOrders: () => Promise<void>;
  loadPaymentsConfig: () => Promise<void>;
  loadFavorites: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  loadCookStatus: () => Promise<void>;

  // admin actions
  loadModerationCases: () => Promise<void>;
  approveModerationCase: (caseId: string) => Promise<void>;
  rejectModerationCase: (caseId: string, reason: string) => Promise<void>;

  // cook actions
  loadMyMenu: () => Promise<void>;
  createMenuItem: (input: MenuItemInput) => Promise<ActionResult>;
  updateMenuItem: (id: string, input: Partial<MenuItemInput> & { active?: boolean }) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  loadCookOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: ApiOrderStatus, actingAsCook?: boolean) => Promise<ActionResult>;

  // chat actions
  loadChatThread: (cookId: string) => Promise<void>;
  sendChatMessage: (cookId: string, body: string) => Promise<ActionResult>;
  loadCookConversations: () => Promise<void>;
  loadCookThread: (customerId: string) => Promise<void>;
  sendCookMessage: (customerId: string, body: string) => Promise<ActionResult>;

  // assistant actions
  sendAssistantMessage: (text: string) => Promise<ActionResult>;
}

/** Resolves (creating if necessary) a real backend address to attach to an order, from the existing free-text `address` state — LocationModal's UI is unchanged this phase. */
async function ensureAddress(currentAddressText: string): Promise<string> {
  const existing = await apiFetch<ApiCustomerAddress[]>('/customers/me/addresses');
  if (existing.length > 0) {
    const chosen = existing.find((a) => a.isDefault) ?? existing[0];
    return chosen.id;
  }
  const created = await apiFetch<ApiCustomerAddress>('/customers/me/addresses', {
    method: 'POST',
    body: { label: 'Delivery address', addressLine: currentAddressText || 'Address not specified', isDefault: true },
  });
  return created.id;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export const useAppStore = create<AppState>((set, get) => ({
  cart: [],
  search: '',
  activeChip: 'For you',
  exploreCategory: 'All',
  activeFilters: ['Within 5 km', 'Verified cooks'],
  followed: new Set(),
  delivery: 'Tomorrow · 12:30–1:30 pm',
  address: 'RS Puram, Coimbatore',
  cookTab: 'Overview',
  adminTab: 'Needs review',
  reviews: loadReviews(),
  reviewDraft: { stars: 5, photoName: '' },
  planDraft: { cookId: 'meera', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  modal: null,
  toastMessage: null,
  toastNonce: 0,

  auth: getSession(),
  customerProfile: null,
  cookProfile: null,
  cookProfileChecked: false,
  catalogKitchens: [],
  catalogLoaded: false,
  orders: [],
  ordersLoading: false,
  paymentsConfig: null,
  moderationCases: [],
  moderationCasesLoading: false,
  myMenuItems: [],
  myMenuLoading: false,
  cookOrders: [],
  cookOrdersLoading: false,
  chatThread: [],
  chatThreadCookId: null,
  chatThreadLoading: false,
  cookConversations: [],
  cookConversationsLoading: false,
  cookThread: [],
  activeConversationCustomerId: null,
  cookThreadLoading: false,
  assistantMessages: [],
  assistantLoading: false,

  kitchens: () => {
    const { catalogKitchens, catalogLoaded } = get();
    return catalogLoaded && catalogKitchens.length > 0 ? catalogKitchens : baseKitchens;
  },
  quantityOf: (dishId) => get().cart.find((item) => item.dish.id === dishId)?.quantity ?? 0,
  dishInCart: (dishId) => get().cart.some((item) => item.dish.id === dishId),
  cartTotal: () => get().cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0),

  addDish: (dishId) => {
    const found = findDish(get().kitchens(), dishId);
    if (!found) return;
    set((s) => {
      const existing = s.cart.find((item) => item.dish.id === dishId);
      const cart = existing
        ? s.cart.map((item) => (item.dish.id === dishId ? { ...item, quantity: item.quantity + 1 } : item))
        : [...s.cart, { dish: found.dish, kitchenId: found.kitchen.id, quantity: 1 }];
      return { cart };
    });
    get().showToast(`${found.dish.name} added to your basket`);
  },

  changeQuantity: (dishId, amount) => {
    set((s) => {
      const item = s.cart.find((entry) => entry.dish.id === dishId);
      if (!item) return {};
      const nextQty = item.quantity + amount;
      const cart =
        nextQty <= 0
          ? s.cart.filter((entry) => entry.dish.id !== dishId)
          : s.cart.map((entry) => (entry.dish.id === dishId ? { ...entry, quantity: nextQty } : entry));
      return { cart };
    });
  },

  clearCart: () => set({ cart: [] }),

  placeOrder: async (paymentMethod) => {
    const { cart, auth, catalogKitchens, address } = get();
    if (!auth) return { ok: false, message: 'Please log in to place your order' };
    if (!cart.length) return { ok: false, message: 'Your basket is empty' };

    const realKitchenIds = new Set(catalogKitchens.map((k) => k.id));
    const groups = new Map<string, CartItem[]>();
    for (const item of cart) {
      if (!realKitchenIds.has(item.kitchenId)) {
        return { ok: false, message: "This kitchen isn't available for ordering yet — please refresh and try again." };
      }
      const list = groups.get(item.kitchenId) ?? [];
      list.push(item);
      groups.set(item.kitchenId, list);
    }

    try {
      const addressId = await ensureAddress(address);
      if (paymentMethod === 'ONLINE') await loadRazorpayCheckout();

      // One backend order per kitchen (existing model) — for ONLINE, that
      // means one Razorpay popup per kitchen too, opened sequentially. A
      // cart spanning several kitchens is a known v1 rough edge (see
      // specs/phase-10-razorpay-payments), not batched into one payment.
      for (const [cookId, items] of groups) {
        const created = await apiFetch<ApiCreateOrderResponse>('/orders', {
          method: 'POST',
          body: {
            cookId,
            addressId,
            items: items.map((i) => ({ menuItemId: i.dish.id, quantity: i.quantity })),
            paymentMethod,
          },
        });

        if (created.razorpay) {
          const result = await openRazorpayCheckout({
            key: created.razorpay.keyId,
            order_id: created.razorpay.orderId,
            amount: created.razorpay.amountPaise,
            currency: 'INR',
          });
          await apiFetch(`/orders/${created.id}/verify-payment`, {
            method: 'POST',
            body: { razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature },
          });
        }
      }
      set({ cart: [] });
      await get().loadOrders();
      return { ok: true, message: 'Order confirmed' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not place your order. Please try again.') };
    }
  },

  setSearch: (value) => set({ search: value }),
  setExploreCategory: (category) => set({ exploreCategory: category }),
  setActiveChip: (chip) => set({ activeChip: chip }),
  toggleFilter: (filter) =>
    set((s) => ({
      activeFilters: s.activeFilters.includes(filter) ? s.activeFilters.filter((f) => f !== filter) : [...s.activeFilters, filter],
    })),
  resetFilters: () => set({ activeFilters: [] }),

  toggleFollow: (cookId) => {
    const wasFollowed = get().followed.has(cookId);
    set((s) => {
      const followed = new Set(s.followed);
      if (wasFollowed) followed.delete(cookId);
      else followed.add(cookId);
      return { followed };
    });
    (async () => {
      try {
        await apiFetch(`/customers/me/favorites/${cookId}`, { method: wasFollowed ? 'DELETE' : 'PUT' });
      } catch (err) {
        set((s) => {
          const followed = new Set(s.followed);
          if (wasFollowed) followed.add(cookId);
          else followed.delete(cookId);
          return { followed };
        });
        get().showToast(errorMessage(err, 'Could not update favourites'));
      }
    })();
  },

  setDelivery: (slot) => set({ delivery: slot }),
  setAddress: (address) => set({ address }),

  setCookTab: (tab) => set({ cookTab: tab }),
  setAdminTab: (tab) => set({ adminTab: tab }),

  resetReviewDraft: () => set({ reviewDraft: { stars: 5, photoName: '' } }),
  setReviewDraftStars: (stars) => set((s) => ({ reviewDraft: { ...s.reviewDraft, stars } })),
  setReviewDraftPhoto: (photoName) => set((s) => ({ reviewDraft: { ...s.reviewDraft, photoName } })),

  setPlanCookId: (cookId) => set((s) => ({ planDraft: { ...s.planDraft, cookId } })),
  setPlanDays: (days) => set((s) => ({ planDraft: { ...s.planDraft, days } })),
  togglePlanDay: (day) =>
    set((s) => {
      const has = s.planDraft.days.includes(day);
      const days = has ? s.planDraft.days.filter((d) => d !== day) : [...s.planDraft.days, day];
      return { planDraft: { ...s.planDraft, days } };
    }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  showToast: (message) => set((s) => ({ toastMessage: message, toastNonce: s.toastNonce + 1 })),

  login: async (email, password) => {
    try {
      const res = await apiFetch<ApiAuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      setSession(res);
      set({ auth: res });
      return { ok: true, message: 'Logged in' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not log in. Please try again.') };
    }
  },

  register: async (email, password) => {
    try {
      const res = await apiFetch<ApiAuthResponse>('/auth/register', {
        method: 'POST',
        body: { email, password, role: 'CUSTOMER' },
        auth: false,
      });
      setSession(res);
      set({ auth: res });
      return { ok: true, message: 'Account created' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not create an account. Please try again.') };
    }
  },

  logout: () => {
    clearSession();
    set({
      auth: null,
      orders: [],
      customerProfile: null,
      followed: new Set(),
      cookProfile: null,
      cookProfileChecked: false,
      moderationCases: [],
      myMenuItems: [],
      cookOrders: [],
      chatThread: [],
      chatThreadCookId: null,
      cookConversations: [],
      cookThread: [],
      activeConversationCustomerId: null,
      assistantMessages: [],
    });
  },

  loadCatalog: async () => {
    try {
      const kitchens = await fetchCatalog();
      set({ catalogKitchens: kitchens, catalogLoaded: true });
    } catch {
      get().showToast('Could not reach the kitchen catalog — showing sample kitchens for now');
    }
  },

  loadPaymentsConfig: async () => {
    try {
      const config = await apiFetch<ApiPaymentsConfig>('/payments/config', { auth: false });
      set({ paymentsConfig: config });
    } catch {
      // Payments being unreachable shouldn't block browsing/COD checkout — just leave "Pay online" hidden.
      set({ paymentsConfig: { enabled: false, keyId: null } });
    }
  },

  loadOrders: async () => {
    set({ ordersLoading: true });
    try {
      const orders = await apiFetch<ApiOrder[]>('/orders/mine');
      set({ orders, ordersLoading: false });
    } catch (err) {
      set({ ordersLoading: false });
      get().showToast(errorMessage(err, 'Could not load your orders'));
    }
  },

  loadFavorites: async () => {
    try {
      const favorites = await apiFetch<ApiCookProfile[]>('/customers/me/favorites');
      set({ followed: new Set(favorites.map((f) => f.id)) });
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not load favourites'));
    }
  },

  loadProfile: async () => {
    try {
      const profile = await apiFetch<ApiCustomerProfile>('/customers/me');
      set({ customerProfile: profile });
    } catch {
      /* not logged in, or profile not reachable — screens fall back to auth.email */
    }
  },

  updateDisplayName: async (name) => {
    try {
      const profile = await apiFetch<ApiCustomerProfile>('/customers/me', { method: 'PATCH', body: { displayName: name } });
      set({ customerProfile: profile });
      get().showToast('Profile updated');
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not update profile'));
    }
  },

  loadCookStatus: async () => {
    try {
      const profile = await apiFetch<ApiMyCookProfile>('/cooks/me');
      set({ cookProfile: profile, cookProfileChecked: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        set({ cookProfile: null, cookProfileChecked: true });
      } else {
        set({ cookProfileChecked: true });
        get().showToast(errorMessage(err, 'Could not load your kitchen status'));
      }
    }
  },

  loadModerationCases: async () => {
    set({ moderationCasesLoading: true });
    try {
      const cases = await apiFetch<ApiEnrichedModerationCase[]>('/admin/moderation/verifications');
      set({ moderationCases: cases, moderationCasesLoading: false });
    } catch (err) {
      set({ moderationCasesLoading: false });
      get().showToast(errorMessage(err, 'Could not load the verification queue'));
    }
  },

  approveModerationCase: async (caseId) => {
    try {
      await apiFetch(`/admin/moderation/verifications/${caseId}/approve`, { method: 'POST' });
      get().showToast('Kitchen approved');
      await get().loadModerationCases();
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not approve this application'));
    }
  },

  rejectModerationCase: async (caseId, reason) => {
    try {
      await apiFetch(`/admin/moderation/verifications/${caseId}/reject`, { method: 'POST', body: { reason } });
      get().showToast('Application rejected');
      await get().loadModerationCases();
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not reject this application'));
    }
  },

  loadMyMenu: async () => {
    set({ myMenuLoading: true });
    try {
      const items = await apiFetch<ApiMenuItem[]>('/cooks/me/menu');
      set({ myMenuItems: items, myMenuLoading: false });
    } catch (err) {
      set({ myMenuLoading: false });
      get().showToast(errorMessage(err, 'Could not load your menu'));
    }
  },

  createMenuItem: async (input) => {
    try {
      await apiFetch('/cooks/me/menu', { method: 'POST', body: input });
      await get().loadMyMenu();
      return { ok: true, message: 'Item added to your menu' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not add this item') };
    }
  },

  updateMenuItem: async (id, input) => {
    try {
      await apiFetch(`/cooks/me/menu/${id}`, { method: 'PATCH', body: input });
      await get().loadMyMenu();
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not update this item'));
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await apiFetch(`/cooks/me/menu/${id}`, { method: 'DELETE' });
      await get().loadMyMenu();
    } catch (err) {
      get().showToast(errorMessage(err, 'Could not remove this item'));
    }
  },

  loadCookOrders: async () => {
    set({ cookOrdersLoading: true });
    try {
      const orders = await apiFetch<ApiOrder[]>('/cooks/me/orders');
      set({ cookOrders: orders, cookOrdersLoading: false });
    } catch (err) {
      set({ cookOrdersLoading: false });
      get().showToast(errorMessage(err, 'Could not load your orders'));
    }
  },

  /** Shared by both the customer (cancel) and cook (advance status) sides — same endpoint, role-aware transition rules enforced server-side either way. */
  updateOrderStatus: async (orderId, status, actingAsCook) => {
    try {
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
      if (actingAsCook) await get().loadCookOrders();
      else await get().loadOrders();
      return { ok: true, message: 'Order updated' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not update this order') };
    }
  },

  loadChatThread: async (cookId) => {
    set({ chatThreadLoading: true, chatThreadCookId: cookId });
    try {
      const thread = await apiFetch<ApiMessage[]>(`/cooks/${cookId}/messages`);
      set({ chatThread: thread, chatThreadLoading: false });
    } catch (err) {
      set({ chatThreadLoading: false });
      get().showToast(errorMessage(err, 'Could not load this conversation'));
    }
  },

  sendChatMessage: async (cookId, body) => {
    try {
      await apiFetch(`/cooks/${cookId}/messages`, { method: 'POST', body: { body } });
      await get().loadChatThread(cookId);
      return { ok: true, message: 'Message sent' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not send your message') };
    }
  },

  loadCookConversations: async () => {
    set({ cookConversationsLoading: true });
    try {
      const conversations = await apiFetch<ApiConversationSummary[]>('/cooks/me/conversations');
      set({ cookConversations: conversations, cookConversationsLoading: false });
    } catch (err) {
      set({ cookConversationsLoading: false });
      get().showToast(errorMessage(err, 'Could not load your conversations'));
    }
  },

  loadCookThread: async (customerId) => {
    set({ cookThreadLoading: true, activeConversationCustomerId: customerId });
    try {
      const thread = await apiFetch<ApiMessage[]>(`/cooks/me/conversations/${customerId}/messages`);
      set({ cookThread: thread, cookThreadLoading: false });
      await get().loadCookConversations(); // refreshes the unread badge now that opening this thread marked it read
    } catch (err) {
      set({ cookThreadLoading: false });
      get().showToast(errorMessage(err, 'Could not load this conversation'));
    }
  },

  sendCookMessage: async (customerId, body) => {
    try {
      await apiFetch(`/cooks/me/conversations/${customerId}/messages`, { method: 'POST', body: { body } });
      await get().loadCookThread(customerId);
      return { ok: true, message: 'Message sent' };
    } catch (err) {
      return { ok: false, message: errorMessage(err, 'Could not send your message') };
    }
  },

  sendAssistantMessage: async (text) => {
    const history = [...get().assistantMessages, { role: 'user' as const, text }];
    set({ assistantMessages: history, assistantLoading: true });
    try {
      const res = await apiFetch<ApiAssistantChatResponse>('/assistant/chat', {
        method: 'POST',
        auth: false,
        body: { messages: history },
      });
      set({ assistantMessages: [...history, { role: 'assistant', text: res.reply }], assistantLoading: false });
      return { ok: true, message: 'Sent' };
    } catch (err) {
      set({ assistantLoading: false });
      return { ok: false, message: errorMessage(err, 'Could not reach the assistant') };
    }
  },
}));

export function addReview(cookId: string, text: string) {
  const { reviewDraft, reviews } = useAppStore.getState();
  const next: Review = { cookId, name: 'Asha R.', stars: reviewDraft.stars, text, photoName: reviewDraft.photoName };
  const updated = [next, ...reviews];
  saveReviews(updated);
  useAppStore.setState({ reviews: updated });
}
