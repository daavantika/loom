# Phase 3 Plan — Technical Approach

## Manifest & icons
- Author `manifest.json` at repo root; source icons from the same brand mark used for favicons in Phase 2, exported at 192×192 and 512×512 plus one maskable 512×512 (safe-zone padding per the maskable icon spec).
- Add the manifest `<link rel="manifest">` and Apple meta tags to `index.html`'s `<head>`.

## Service worker
- Hand-write a small `sw.js` (no Workbox dependency needed at this scale — keeps the zero-build-tool approach from Phase 2 intact):
  - `install`: `caches.open(CACHE_VERSION).addAll([...shell files])`.
  - `activate`: delete any cache key that isn't the current `CACHE_VERSION`.
  - `fetch`: for navigation requests, network-first with cache fallback and a final offline-page fallback; for static assets, cache-first with network fallback.
- Register the service worker from `app.js` (or a small inline script in `index.html`) behind a `if ('serviceWorker' in navigator)` guard, registered after `load` to avoid delaying first paint.
- Bump `CACHE_VERSION` as part of the normal deploy process any time shell files change (document this one-line step in the top-level README so it isn't forgotten on future deploys).

## iOS polish
- Add `apple-touch-icon` links at the standard sizes (180×180 minimum covers modern devices; skip the full legacy matrix unless targeting old iOS).
- Splash screens: either generate the common device-size matrix with a tool (e.g., `pwa-asset-generator`) or explicitly defer and note it as a known gap per the spec's acceptance criterion 5 — default to deferring unless the user asks for pixel-perfect iOS splash screens, since Median.co supplies its own native splash screen in Phase 4 regardless.
- Add `env(safe-area-inset-top)`/`env(safe-area-inset-bottom)` padding to `.topbar` and `.bottom-nav` in `styles.css`.

## Verification steps
1. Chrome DevTools → Application tab: confirm Manifest and Service Worker panels show no errors; run the installability audit.
2. Deploy to the Phase 2 host, install on a real or simulated Android device via "Install app", confirm standalone launch.
3. Deploy and test "Add to Home Screen" on an actual iPhone (or iOS Simulator) — check icon, name, and standalone chrome.
4. Toggle airplane mode, reload a previously visited page, confirm the shell still renders (not the browser's native offline page).
5. Run Lighthouse PWA audit against the live deploy; resolve or explicitly document any gap.
6. Visually inspect topbar/bottom-nav on a notched device (or Simulator) in standalone mode for safe-area clipping.
