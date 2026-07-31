# Phase 3 Spec — PWA Readiness

## Goal
Make the Phase 2 website installable and app-like in its own right — a web app manifest, service worker, and iOS/Android home-screen metadata — before it gets wrapped by Median.co in Phase 4. This both improves the wrapped-app experience (native-feeling splash/icon/status-bar behavior) and gives a standalone "Add to Home Screen" path that works even without an app-store install.

Out of scope: any Median.co or Capacitor configuration (Phase 4), true offline data sync (this prototype has no backend to sync with — offline scope here is limited to the static app shell).

## Requirements

### Web app manifest
- `manifest.json` with `name`, `short_name` ("LOOM"), `start_url`, `display: standalone`, `background_color`/`theme_color` matching the existing `#fffaf6` topbar, and a full icon set (192×192, 512×512, maskable variant).
- `index.html` links the manifest and sets `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style`, and `apple-touch-icon` links (iOS ignores `manifest.json` icons).

### Service worker
- Caches the static app shell (`index.html`, `app.js`, `styles.css`, font files, icons) on install; serves from cache with a network-falling-back-to-cache strategy so a repeat visit with flaky connectivity still loads the shell.
- A dedicated offline fallback view (simple "you're offline" state) if a navigation request fails and isn't cached.
- Versioned cache name tied to a `CACHE_VERSION` constant, old caches purged on `activate`, so shipping a new deploy doesn't strand users on stale assets indefinitely.

### iOS home-screen polish
- Splash screen images for common iOS device sizes (or the `apple-mobile-web-app` meta-only approach if generating the full splash matrix is deferred — acceptable to note as a known gap).
- Safe-area handling: `viewport-fit=cover` is already set — verify `env(safe-area-inset-*)` is respected in `styles.css` for the topbar and bottom nav so content doesn't sit under the iPhone notch/home indicator.

## Acceptance criteria ("done")
1. Chrome DevTools → Application → Manifest shows no errors, all required fields present, installability check passes.
2. "Add to Home Screen" on an actual or simulated iOS device produces the correct icon, name, and a standalone (no browser chrome) launch.
3. "Install app" on Android Chrome produces the correct icon/name and a standalone launch.
4. Airplane mode + reload of a previously visited URL still renders the app shell (not a browser offline error page).
5. Lighthouse PWA category score is 100 (or every failing audit is explicitly accepted as a known gap in this doc, e.g. full splash-screen matrix).
6. Topbar and bottom nav are not obscured by the iPhone notch or home indicator when installed standalone.
