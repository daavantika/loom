# LOOM Frontend

React + TypeScript + Vite port of the LOOM prototype. Built phase by phase per [../specs](../specs) — see [../specs/phase-6-react-migration](../specs/phase-6-react-migration) for why this exists and how it's structured.

Still on mock data / `localStorage` only — same as the vanilla version it replaces. Backend integration is a separate, later phase.

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
- `src/lib` — pure helper functions (currency formatting, cart/kitchen lookups, localStorage persistence).
- `src/components` — small shared UI pieces (`QtyControl` is the one piece that directly replaces the old app's manual DOM-patching hack for keeping "add to basket" controls in sync).
- `src/views` — one component per bottom-nav/dashboard screen (Home, Explore, Cart, Orders, Profile, Cook, Admin), routed via `react-router-dom` in `AppRoutes.tsx`.
- `src/modals` — one component per modal (cook profile, filters, checkout, seller onboarding, etc.), rendered through `components/ModalLayer.tsx` based on `store.modal` state.
