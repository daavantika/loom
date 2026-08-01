# LOOM Frontend

React + TypeScript + Vite port of the LOOM prototype. Built phase by phase per [../specs](../specs) — see [../specs/phase-6-react-migration](../specs/phase-6-react-migration) for why this exists and how it's structured.

Wired to the real backend (`../backend`) as of [../specs/phase-9-frontend-core-loop](../specs/phase-9-frontend-core-loop) and [../specs/phase-9.5-cook-dashboard](../specs/phase-9.5-cook-dashboard) — auth, catalog, cart/checkout, orders/tracking, favorites, cook onboarding/dashboard, and file uploads all call the real API (`src/lib/api.ts`, `src/lib/upload.ts`). A few decorative/unwired screens still use mock data where noted in their phase specs. The one environment-specific setting is `VITE_API_URL` (see `.env.example`), the backend's base URL — required at build time since Vite bakes it into the static bundle.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev       # dev server with HMR
npm run build     # tsc -b && vite build -> dist/
npm run preview   # serve the production build locally
```

## Test

```bash
npm test          # vitest run — component-level interaction tests (React Testing Library)
```

## Structure

- `src/data` — static kitchens/dishes data and shared TypeScript types.
- `src/store` — a single Zustand store (`appStore.ts`) mirroring the vanilla app's flat state object, plus `hooks.ts` for derived values (kitchens list, active seller-store view) that must be memoized outside the Zustand selector to avoid render loops — see the comment in `hooks.ts` before adding a new derived selector.
- `src/lib` — pure helper functions (currency formatting, cart/kitchen lookups, `localStorage` persistence) plus the backend client: `api.ts` (`apiFetch`, base URL from `VITE_API_URL`), `auth.ts` (session storage), `upload.ts` (file uploads), `catalog.ts` (adapts backend cook/menu shapes into the frontend's `Kitchen`/`Dish` types).
- `src/components` — small shared UI pieces (`QtyControl` is the one piece that directly replaces the old app's manual DOM-patching hack for keeping "add to basket" controls in sync).
- `src/views` — one component per bottom-nav/dashboard screen (Home, Explore, Cart, Orders, Profile, Cook, Admin), routed via `react-router-dom` in `AppRoutes.tsx`.
- `src/modals` — one component per modal (cook profile, filters, checkout, seller onboarding, etc.), rendered through `components/ModalLayer.tsx` based on `store.modal` state.

## Deployment

Hosted on Cloudflare Pages — see [../specs/phase-16-frontend-hosting](../specs/phase-16-frontend-hosting) for the full setup. Summary:

- Build command: `npm run build` (build output directory: `dist`)
- Required env var: `VITE_API_URL` — the backend's base URL (e.g. `https://loom-backend-7uqb.onrender.com`). Baked in at build time, not read at runtime, so it must be set in Cloudflare Pages' project environment variables, not just a local `.env`.
- `.node-version` pins the build's Node version.
- SPA routing (`react-router-dom`) falls back to `index.html` automatically — Cloudflare Pages does this by default whenever there's no top-level `404.html`, which is the case here.
