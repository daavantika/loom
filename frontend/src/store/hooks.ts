import { useMemo } from 'react';
import { useAppStore } from './appStore';
import { baseKitchens } from '../data/kitchens';

/**
 * Selectors passed to useAppStore run inside React's useSyncExternalStore snapshot
 * comparison — returning a freshly-computed array/object from a plain selector
 * (e.g. `useAppStore(s => s.kitchens())`) means every snapshot check sees a "new"
 * value even when nothing changed, which can spiral into an infinite render loop.
 * This hook selects the stable underlying fields first, then derives with useMemo
 * outside the selector, which is where computation like this belongs.
 */
export function useKitchens() {
  const catalogKitchens = useAppStore((s) => s.catalogKitchens);
  const catalogLoaded = useAppStore((s) => s.catalogLoaded);
  return useMemo(
    () => (catalogLoaded && catalogKitchens.length > 0 ? catalogKitchens : baseKitchens),
    [catalogKitchens, catalogLoaded],
  );
}
