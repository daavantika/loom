# Phase 9 Plan — Technical Approach

## Backend touch (minimal)
`backend/src/main.ts`: add `app.enableCors()` before `app.listen()`. No other backend changes — this phase consumes Phases 1/7/8's existing API surface as-is.

## New frontend files
- `frontend/src/lib/api.ts` — `apiFetch<T>(path, options)`: base URL from `import.meta.env.VITE_API_URL` (default `http://localhost:3000`), attaches `Authorization: Bearer <token>` from `lib/auth.ts` when present, JSON in/out, throws `ApiError { status, message }` on non-2xx so callers can show real backend error text.
- `frontend/src/lib/auth.ts` — `getToken()`/`setSession()`/`clearSession()` over a single `localStorage` key (`loom-auth`) storing `{ accessToken, userId, email, role }` — mirrors the backend's `/auth/login` response shape exactly, no transformation needed.
- `frontend/src/data/api-types.ts` — types mirroring backend response shapes: `ApiCookProfile`, `ApiMenuItem`, `ApiCustomerProfile`, `ApiCustomerAddress`, `ApiOrder`, `ApiOrderItem`, `ApiOrderStatusEvent`.
- `frontend/src/lib/catalog.ts` — `fetchCatalog(): Promise<Kitchen[]>` (calls `GET /cooks?verifiedOnly=true`, then `GET /cooks/:id/menu` per cook, adapts into existing `Kitchen`/`Dish` shape via `adaptCookToKitchen`/`adaptMenuItemToDish`). N+1 fetches is an accepted prototype-scale tradeoff — flag for a future bulk endpoint if catalog size grows.
- `frontend/src/modals/AuthModal.tsx` — login/register toggle form. New `ModalState` union member `{ kind: 'auth'; mode: 'login' | 'register' }`, registered in `ModalLayer.tsx`.
- `frontend/.env.example` — `VITE_API_URL=http://localhost:3000`.

## `appStore.ts` changes
New state: `auth: { userId; email; role } | null` (hydrated from `lib/auth.ts` on store creation), `catalogKitchens: Kitchen[]`, `catalogLoaded: boolean`, `orders: ApiOrder[]`, `ordersLoading: boolean`, `favoriteCookIds: Set<string>` (replaces the purely-local semantics of `followed`, same field name/shape kept for minimal call-site diff).

New/changed actions:
- `login(email, password)` / `register(email, password)` / `logout()` — call the API client, call `setSession()`/`clearSession()`, update `auth`.
- `loadCatalog()` — calls `lib/catalog.ts`'s `fetchCatalog()`, sets `catalogKitchens`/`catalogLoaded` on success; on failure, leaves `catalogLoaded: false` (mock fallback stays active) and shows a toast. **Guarded to not auto-fire when `import.meta.env.MODE === 'test'`** (Vitest sets this), so the existing smoke test suite doesn't make a real network attempt to `localhost:3000` on every run.
- `kitchens()` derived method: `catalogLoaded && catalogKitchens.length ? catalogKitchens : baseKitchens`, still prepending the local mock seller-store synthetic kitchen when `store` is set (unchanged behavior, out-of-scope cook-onboarding flow untouched).
- `placeOrder()` — becomes async: groups cart by `kitchenId`, guards against non-real kitchen ids (mock fallback / `seller-store` — id not present in `catalogKitchens`) with a clear toast, resolves/creates a backend address via `ensureAddress()`, calls `POST /orders` per cook-group (today's cart UI only ever has one cook's items reach checkout in practice, but the loop naturally supports a multi-cook cart by placing one order per cook), clears cart and pushes to `orders` state on success, surfaces `ApiError.message` via toast on failure (min-order-value, unverified cook, etc.) instead of always "confirmed."
- `fetchOrders()` — `GET /orders/mine`, sets `orders`/`ordersLoading`. Called from `Orders.tsx`'s mount effect, not globally.
- `toggleFollow(cookId)` — becomes async: `PUT`/`DELETE /customers/me/favorites/:cookId`, updates `favoriteCookIds` optimistically then reconciles; callers (`CookProfileModal`) are unaffected since they don't await it.
- `loadFavorites()` — `GET /customers/me/favorites`, called from `FavouritesModal`'s mount effect.
- `loadProfile()` / `updateDisplayName(name)` — `GET`/`PATCH /customers/me`, called from `Profile.tsx`/`AccountModal.tsx`.

## Screen-by-screen changes
- **`App.tsx`**: call `loadCatalog()` once on mount (`useEffect`, empty deps); avatar initial derived from `auth?.email` first letter (fallback to `'?'` when logged out, not `'A'`).
- **`Explore.tsx`**: `categoryMatch` replaced with a plain substring match against name/bio/dish-name/dish-tags (chips become search shortcuts, not a fake taxonomy filter). Rest unchanged (`useKitchens()` already returns real data once loaded).
- **`CookProfileModal.tsx`**: unchanged logic; `follow`/`unfollow` now round-trips to the backend under the hood via the changed `toggleFollow`.
- **`Cart.tsx`**: "Continue to payment" checks `auth`; if absent, opens `AuthModal` with a toast instead of the checkout modal.
- **`CheckoutModal.tsx`**: `placeOrder()` call becomes `await useAppStore.getState().placeOrder()`; loading state on the button while in flight; real error text shown via toast (not a hardcoded success message) on failure; on success, navigates to `/orders` as today.
- **`Orders.tsx`**: full rewrite — `useEffect` calls `fetchOrders()` on mount; renders `EmptyState` when `orders.length === 0`; maps real `ApiOrder[]` to cards (cook name resolved by cross-referencing `catalogKitchens` by `cookId`, falling back to `"Kitchen"` if not yet loaded), real status badge, "Track order" opens `TrackingModal` with `{ kind: 'tracking'; orderId }`.
- **`TrackingModal.tsx`**: accepts `orderId` prop (via the widened `ModalState`), fetches `GET /orders/:id` on mount, renders real status steps from `statusHistory` instead of the three hardcoded steps.
- **`FavouritesModal.tsx`**: `useEffect` calls `loadFavorites()` on mount; list becomes `kitchens().filter(k => favoriteCookIds.has(k.id))` (drops the "fall back to first 2 kitchens" cosmetic behavior — an empty real list should say so, per spec's "no more fabricated data" principle — `EmptyState` used instead).
- **`Profile.tsx`**: shows `auth?.email` (or a real `displayName` once loaded via `loadProfile()`) instead of hardcoded "Asha R."; "Log in / Sign up" button when logged out; "Log out" action when logged in. "Start selling"/"Open admin desk" sections untouched (still navigate into the unwired mock cook/admin experience, as today — out of scope).
- **`AccountModal.tsx`**: real email/join-date-unavailable copy; "Edit profile details" becomes a real minimal inline text input + save calling `updateDisplayName`.

## Guard against breaking existing tests
`App.smoke.test.tsx` currently asserts synchronous mock-data content (3 `.cook-card`s, "Meera" in the cook modal, hardcoded admin/cook-dashboard text). Because `loadCatalog()` is guarded off in test mode (see above) and `kitchens()` falls back to `baseKitchens` whenever `catalogLoaded` is false, none of these assertions change — the suite should pass unmodified. `Orders.tsx`'s rewrite isn't covered by the existing suite (no test currently visits `/orders` and asserts on its old hardcoded content), so no test update is needed there, but a new lightweight test is added for the auth+checkout+orders flow (see below).

## New tests
- `frontend/src/lib/catalog.test.ts` — unit tests for `adaptCookToKitchen`/`adaptMenuItemToDish` (paise→rupees conversion, placeholder fields, active-item filtering).
- A focused integration test (`frontend/src/orders-flow.test.tsx` or extending the smoke suite) mocking `global.fetch` to exercise: register → login persists across a simulated reload → catalog loads → add to cart → checkout requires login when logged out → checkout succeeds when logged in → order appears on `/orders`. Establishes the `waitFor`-around-fetch pattern this codebase doesn't have yet, for future phases to reuse.

## Verification steps
1. `cd backend && npm run build && npm test` still pass (CORS is the only backend change).
2. `cd frontend && npm run build` (tsc + vite build) compiles cleanly with the new files/types.
3. `cd frontend && npm test` — existing smoke suite still passes unmodified, plus new catalog-adapter and auth/checkout/orders-flow tests pass.
4. Manual end-to-end: run backend (`npm run start:dev` against seeded dev DBs) + frontend (`npm run dev`), register a customer in the UI, browse to a verified cook (created via curl/Swagger beforehand, matching the Phase 7/8 manual-walkthrough pattern), add a dish, check out, confirm the order appears on `/orders` and `TrackingModal` shows its real status.
5. Confirm graceful degradation: stop the backend, reload the frontend, confirm `Explore`/`Home` still render (mock fallback), and confirm the checkout guard shows a clear toast rather than a crash if attempted against fallback data.
