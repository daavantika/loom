# Phase 6 Spec — React Migration

## Goal
Replace the hand-rolled vanilla-JS SPA (`index.html`/`app.js`/`styles.css` — string-templated views, manual `innerHTML` re-renders, hand-patched DOM for live widgets like the quantity stepper) with a React + TypeScript app, so continued feature growth doesn't keep hitting the class of bug that manual DOM syncing produces (stale controls inside modals, delegation gaps like the special-card/story-card click bug fixed earlier). This is a pure frontend-architecture change — no behavior, visual design, or backend-integration scope changes; every flow verified in the vanilla app must still work identically after migration.

## Why now
Confirmed with the user this app will keep growing feature-wise. The vanilla `app.js` is already past the size where bugs like "the tab didn't actually switch content" and "the modal control went stale" recur structurally, not from one-off mistakes — a component framework with real diffing eliminates that bug class by design.

## Scope
- New `frontend/` directory (mirrors the existing `backend/` convention) containing a Vite + React + TypeScript app.
- Every current view (Home, Explore, Cart, Orders, Profile, Cook dashboard, Admin desk) and every current modal (cook profile, filters, chat, assistant, checkout, tracking, plan builder + cook picker, seller onboarding, reviews, payout ledger, pricing assistant, inventory, location, stories, festival foods, catering, today's specials) ported with identical behavior and visual output.
- State management: a typed Zustand store mirroring the existing flat `state` object 1:1 (cart, filters, drafts, followed cooks, etc.), including the existing `localStorage` persistence for the seller store and reviews.
- Real client-side routing (React Router) replacing the `state.view` string-switch, so browser history is real — this directly resolves the gap flagged in the Phase 4 (Median packaging) plan, where the app "doesn't use the History API" and Median's Android back-button hook has nothing real to walk.
- All existing CSS (`styles.css`, including dark-mode and `.force-dark` overrides) reused as global styles — no visual redesign as part of this migration.
- Existing Phase 2/3 work (meta tags, favicons, manifest-readiness, image fallback, accessibility fixes, contrast fixes) carried into the new `index.html`/build output unchanged.

## Out of scope
- Any new features. This is a like-for-like port.
- Backend integration (still deferred per the existing roadmap).
- Redesign of visuals, copy, or information architecture.
- Server-side rendering — not needed; this remains a client-rendered app wrapped in a native shell (Median.co) later, so SSR buys nothing here.

## Acceptance criteria ("done")
1. `npm run build` (Vite) and `tsc --noEmit` both succeed with zero errors, TypeScript strict mode on (matching the backend's `tsconfig.json` convention).
2. Every view and modal listed in Scope renders and its interactive elements (buttons, forms, steppers, tabs) work identically to the vanilla version.
3. The quantity stepper (`+` → `− qty +` → back to `+`) stays in sync across every location a dish appears simultaneously (home scroller, cook profile modal, specials modal) — the exact bug class this migration exists to prevent.
4. Admin desk tabs (Needs review / Hygiene / Orders) and cook dashboard tabs (Overview/Orders/Menu/Customers/More) switch real content per tab.
5. Special-card and story-card clicks on Home open their respective modals (regression check on the delegation-selector bug fixed in the vanilla version).
6. Browser back/forward buttons navigate between views correctly (new capability the vanilla version never had).
7. No visual regression — same fonts, colors, spacing, dark-mode behavior as the current deployed site.
