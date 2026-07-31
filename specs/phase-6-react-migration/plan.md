# Phase 6 Plan — Technical Approach

## Stack
- **Vite + React + TypeScript** (`npm create vite@latest frontend -- --template react-ts`), strict mode on in `tsconfig.json` to match `backend/tsconfig.json`'s conventions.
- **Zustand** for state — chosen over Redux/Context for this size of app: no boilerplate, a single store file maps almost directly from the existing flat `state` object, and it doesn't require wrapping the tree in providers for every slice.
- **React Router** (`react-router-dom`) — real routes replace `state.view`. Route map: `/` (home), `/explore`, `/cart`, `/orders`, `/profile`, `/cook`, `/admin`. Modals stay as store-driven overlays (not routes) since they're transient and don't need their own URLs, matching current UX (deep-linking into a specific modal is out of scope for this phase).
- No CSS framework swap — `styles.css` is imported once globally in `main.tsx`; class names stay identical to avoid a parallel visual-regression pass.

## Structure
```
frontend/
  src/
    main.tsx                # ReactDOM root, imports styles.css, wraps App in BrowserRouter
    App.tsx                 # app-shell chrome: topbar, <Outlet/>, bottom nav, assistant button, modal layer, toast
    store/
      appStore.ts            # Zustand store: cart, filters, drafts, followed, reviews, seller store, planDraft, adminTab, cookTab, role
      persistence.ts          # localStorage read/write helpers (seller store, reviews) — same keys as the vanilla version so existing localStorage data isn't orphaned
    data/
      kitchens.ts             # static kitchens/dishes/foodImages data, unchanged from app.js
    lib/
      currency.ts, dish.ts     # currency(), findDish(), quantityOf(), dishInCart() ported as pure functions
    components/
      Modal.tsx               # generic modal shell + a registry of modal "kinds" driven by store state
      QtyControl.tsx           # the +/stepper component — single source of truth, used everywhere a dish can be added
      ...shared small components (Chip, SectionHead, EmptyState, CookCard, KitchenRow, DishRow, etc.)
    views/
      Home.tsx, Explore.tsx, Cart.tsx, Orders.tsx, Profile.tsx, Cook.tsx, Admin.tsx
    modals/
      CookProfileModal.tsx, FiltersModal.tsx, ChatModal.tsx, AssistantModal.tsx, CheckoutModal.tsx,
      TrackingModal.tsx, PlanModal.tsx, PlanCookPickerModal.tsx, SellerOnboardingModal.tsx, ReviewModal.tsx,
      ReviewListModal.tsx, PayoutLedgerModal.tsx, PriceAssistantModal.tsx, InventoryModal.tsx, LocationModal.tsx,
      StoriesModal.tsx, FestivalFoodsModal.tsx, CateringModal.tsx, TodaySpecialsModal.tsx
  index.html                 # carries over all Phase 2/3 head content (meta, favicons, OG tags) verbatim
  public/                    # favicon.ico/svg, assets/icons, assets/og-image.png, assets/placeholder.png, robots.txt, sitemap.xml
```

## Migration approach
1. Scaffold the Vite project, install `zustand` + `react-router-dom`, set `tsconfig.json` to strict.
2. Port static assets and `styles.css` first (zero-risk, no logic) — confirms the build pipeline works end to end before any component work starts.
3. Build the Zustand store next, with the exact same shape as `state` in `app.js`, so every subsequent component maps 1:1 to existing logic instead of requiring re-derivation of business rules.
4. Build the app shell (topbar/bottom-nav/modal-layer/toast) and router skeleton — this is the scaffolding every view mounts into.
5. Port views in the same order the original app prioritizes them: Home → Explore → Cart → Orders → Profile, then Cook dashboard, then Admin desk — each with its modals ported alongside it (e.g. Home brings the cook-profile modal, filters modal, plan modal + cook picker, stories/festival/catering/today's-specials modals).
6. `QtyControl` is built once as a real React component (not the outerHTML-patching hack from the vanilla version) and reused everywhere — this is the component that directly proves the migration's value, since keeping multiple simultaneous instances of the same dish in sync is now automatic (shared Zustand state + React re-render) instead of a manual `refreshQtyControl()` DOM patch.

## Verification steps
1. `tsc --noEmit` clean, `npm run build` clean.
2. `npm run dev`, serve locally, walk every view/modal per the vanilla version's tested flow list.
3. Re-run the jsdom-driven interaction checks used to verify the vanilla app (special-card/story-card clicks, quantity-stepper lifecycle, admin-tab switching, cart-badge sync) against the React build to confirm no behavioral regression.
4. Manual click-through once a browser tool is available (still a gap noted in earlier phases — flagged again here, not resolved by this migration).
