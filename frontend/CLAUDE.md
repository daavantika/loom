# CLAUDE.md — frontend

Guidance for working in `frontend/`. See the root `CLAUDE.md` for repo-wide context and `README.md` here for setup/run/test commands. No backend calls yet — reads/writes only `localStorage` (`src/lib/persistence.ts`), same keys the vanilla app used.

## Architecture

- **State — gotcha**: never return a freshly-computed array/object from a `useAppStore(selector)` call (e.g. `s.kitchens().find(...)`, `s.reviews.filter(...)`) — it breaks React's `useSyncExternalStore` snapshot comparison and can spiral into an infinite render loop. Select the stable underlying field, then derive with `useMemo` outside the selector — see `src/store/hooks.ts` (`useKitchens`, `useActiveStoreView`) for the pattern; use/extend those hooks rather than reintroducing the bug.
- **Routing**: real routes via `react-router-dom` (`src/AppRoutes.tsx`), not a state-driven view switch — deliberate, needed for the Median.co native-app-wrapper's Android back-button handling (`../specs/phase-4-median-packaging`).
- **Modals**: driven by `store.modal` (`src/data/modal.ts`); `components/ModalLayer.tsx` is the registry mapping `modal.kind` to the component in `src/modals/`. Add new modals by extending the union and the registry switch.
- **`QtyControl`** (`src/components/QtyControl.tsx`) is the single shared add/quantity-stepper control — reuse it rather than duplicating add-to-cart UI.
- **Testing — gotcha**: plain jsdom (not through Vitest) does not execute `<script type="module">` — component tests must go through Vitest/RTL (`npm test`), not a hand-rolled jsdom script-loading harness.
