# Phase 9 Spec — Frontend Integration: Customer Core Loop

## Goal
Wire the existing React frontend to the real backend (Phases 1/1.5/7/8) for the customer-facing core loop: **register/login → browse real cooks → add to cart → check out → place a real order → track it**, plus real favorites and a real (minimal) profile. No new backend entities.

## Scope decision (confirmed with user)
The frontend is more mock than assumed: there's no login UI at all, `Orders.tsx` and most of `Cook.tsx`'s dashboard tabs are 100% hardcoded JSX unconnected to any store field, and `CheckoutModal` never creates an order object. Wiring the *entire* app in one phase would mean rewriting most of the app's surface simultaneously.

**In scope**: auth (login/register), `Explore`/`Home`'s kitchen browsing, `CookProfileModal`, `Cart`, `CheckoutModal`, `Orders`, `TrackingModal`, `FavouritesModal`, `Profile`/`AccountModal` identity.

**Out of scope (fast-follow phase)**: `SellerOnboardingModal` (needs a real KYC-grade form — photos, FSSAI, payout details — to match the real onboarding endpoint), `Cook.tsx`'s dashboard tabs (Overview/Orders/Customers are hardcoded mock UI), `Admin.tsx`, subscription plans (`PlanModal`/`PlanCookPickerModal` — no backend feature yet), reviews (`ReviewModal`/`ReviewListModal`/`MyReviewsModal` — no backend feature yet, Phase 11), and decorative discovery screens (`StoriesModal`, `TodaySpecialsModal`, `FestivalFoodsModal`, `CateringModal`, `ChatModal`) — these keep working exactly as they do today, untouched.

## Key design decisions

1. **`useKitchens()` stays the single data source, now real-backed with a mock fallback.** Rather than adding a parallel hook (which would split `CookProfileModal` into two incompatible modes depending on caller), the store's kitchen list becomes: real fetched catalog if loaded, else the existing mock `baseKitchens` — literally "kitchens.ts reduced to a dev-fallback," per the original roadmap language. This means `Home.tsx`, `Explore.tsx`, `CookProfileModal.tsx`, `FavouritesModal.tsx`, `Cart.tsx`, `QtyControl`, `addDish`/`findDish` all keep working with **zero shape changes** — only the data source underneath changes. `todaysSpecials()` (Home's decorative "today's specials" picker) automatically starts reflecting real dishes once real data loads, no bespoke work needed.

2. **Adapter functions, not new component logic.** `GET /cooks` (Phase 7) + `GET /cooks/:id/menu` per cook are fetched once on app mount and adapted into the existing `Kitchen`/`Dish` shape (`lib/catalog.ts`): `cook.id`→`Kitchen.id`, `kitchenName`→`name`, `ownerName`→`cook`, `minOrderValuePaise`→(kept for order validation, not displayed), `pricePaise`→`price` (rupees, ÷100). Fields with no backend equivalent yet (`rating`, `reviews`, `cuisine`, `distance`, `time`) get honest placeholders (e.g. `'—'`, `'New kitchen'`), never fabricated numbers. Category chip filtering in `Explore.tsx` (`Tamil`/`Bakery`/... matched against a fake `cuisine` string) is simplified to plain text-search over name/bio/dish names, since there's no real cuisine taxonomy.

3. **Cart items double as order-line inputs for free.** Because adapted `Dish.id` *is* the real `menu_items.id` and `CartItem.kitchenId` *is* the real `cook_profiles.id`, `POST /orders`'s `{ cookId, items: [{menuItemId, quantity}] }` body can be built directly from existing cart state — no cart restructuring needed. A guard prevents checkout against non-real (mock-fallback or locally-published mock seller-store) kitchen ids, showing a clear toast instead of a confusing 400/404 from the backend.

4. **Addresses**: `LocationModal`'s existing free-text `address` field is preserved as-is (no UI redesign this phase). At checkout, if the customer has no saved backend address yet, one is auto-created from that free-text value (`POST /customers/me/addresses`) and reused thereafter.

5. **Auth**: one new `AuthModal` (login/register toggle, register always as `CUSTOMER` — no role picker, since cook-side isn't wired yet). Token + user info persisted to `localStorage`. Checkout, `/orders`, and favorites all require a token; if missing, `AuthModal` opens instead (with an explanatory toast) rather than the app silently failing.

6. **CORS**: the backend has no CORS policy configured today, which will block the Vite dev server (different origin) from calling it — `app.enableCors()` is added to `backend/src/main.ts` as necessary infrastructure glue, not a new feature.

## What changes for the user, screen by screen

- **Auth**: new "Log in / Sign up" entry point (Profile screen when logged out). Real JWT session, persisted across reloads.
- **Explore / Home**: kitchen list is real (once loaded), verified-only. Category chips become text-search shortcuts. Individual kitchen menus (`CookProfileModal`) are real, per-cook.
- **Cart**: unchanged UI; checkout now requires login.
- **Checkout**: real order created server-side (`POST /orders`) with real subtotal/min-order-value validation; failures (below minimum, unverified cook, no longer available) surface as real error messages instead of always succeeding.
- **Orders**: real list (`GET /orders/mine`), replacing the two hardcoded fake cards; empty state when there are none yet.
- **Tracking**: real status + status history (`GET /orders/:id`) instead of always-the-same hardcoded steps.
- **Favourites**: real backend-backed follow/unfollow (`GET`/`PUT`/`DELETE /customers/me/favorites`), replacing the in-memory-only `Set`.
- **Profile / Account**: real identity (email, and `displayName` once set) instead of hardcoded "Asha R."; minimal real-editable display name (`PATCH /customers/me`).

## Acceptance criteria ("done")
1. A new visitor can register, log in, and the session persists across a page reload.
2. `Explore` shows real, verified cooks fetched from the backend (with mock `baseKitchens` as the fallback if the backend is unreachable — verify by stopping the backend and confirming the app still renders, not blank).
3. Opening a real cook's profile shows their real menu; adding a dish to cart and checking out creates a real order (`POST /orders`), visible immediately via `GET /orders/mine` on the Orders screen.
4. Attempting checkout while logged out opens the auth modal instead of failing silently.
5. Attempting to check out with a cart total below the cook's minimum order value shows the real backend error message, not a fake "Order confirmed" toast.
6. Favoriting a cook in `CookProfileModal` persists across a reload (backend-backed, not just in-memory).
7. `TrackingModal` for a real order shows that order's real, current status.
8. All of `Home`, `Cook` dashboard, `Admin`, `SellerOnboardingModal`, subscription plans, reviews, and decorative discovery modals continue to work exactly as before (unchanged, still on mock data) — confirmed via the existing `App.smoke.test.tsx` suite still passing.
