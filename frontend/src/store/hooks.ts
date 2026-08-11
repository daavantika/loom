import { useAppStore } from './appStore';

/**
 * Selectors passed to useAppStore run inside React's useSyncExternalStore snapshot
 * comparison — returning a freshly-computed array/object from a plain selector
 * (e.g. `useAppStore(s => s.kitchens())`) means every snapshot check sees a "new"
 * value even when nothing changed, which can spiral into an infinite render loop.
 * `catalogKitchens` itself is already a stable array reference (only replaced on
 * a real catalog reload), so selecting it directly is safe — no derivation needed.
 * Real data only: no mock fallback. Screens must handle an empty array (catalog
 * not loaded yet, or genuinely zero verified cooks) with a real empty state.
 */
export function useKitchens() {
  return useAppStore((s) => s.catalogKitchens);
}
