# Phase 4 Spec — Median.co App Packaging

## Goal
Wrap the Phase 2/3 website in Median.co and produce installable, testable Android and iOS builds that feel like a native app, not a browser tab — using the site's HTTPS URL as the source, no separate app codebase to maintain.

Out of scope: public app-store listing/review (Phase 5).

## Requirements

### Median.co project setup
- Median account + app project pointed at the production HTTPS domain from Phase 2.
- App identity: name "LOOM", icon (reuse the Phase 3 512×512 maskable icon), splash screen (background `#fffaf6`, centered wordmark/icon), bundle/package identifiers reserved (`com.loom.app` or the user's chosen reverse-domain id — confirm before builds, hard to change later on Apple's side).

### Native-shell behavior
- Status bar style matches `theme-color` (`#fffaf6`, dark text).
- Pull-to-refresh: disabled or scoped so it doesn't fight the app's own scroll views (evaluate against the Home/Explore feeds).
- Android hardware back button: maps to in-app navigation history (back through modals/views), only exits the app from the Home tab at the navigation root.
- External-link handling: Unsplash image URLs and any `<a>` pointing off-domain must NOT hijack the whole in-app webview — configure Median's external URL rules so only the app's own domain loads in-app; everything else either opens in the system browser or is suppressed (images loading as `<img>` src is unaffected by this rule, only top-level navigations are).
- Deep linking (optional for this phase, note as deferred if not needed yet): configure if the user wants push notifications or share links to open specific in-app views.

### Permissions
- Audit whether any current or near-term feature needs device permissions (camera for review photos, location for delivery-radius/address). If yes, enable the corresponding Median capability and add the required Play Store / Info.plist usage-description strings. If the app doesn't use a capability yet (current review photo field in `app.js` is a filename string, not a real file picker), leave it disabled — don't request permissions the app doesn't use.

## Acceptance criteria ("done")
1. A Median test build installs on a physical Android device (or emulator) and launches to the Home tab with correct icon/splash/status-bar styling.
2. A Median TestFlight/ad-hoc build installs on a physical iPhone (or Simulator) with the same visual correctness.
3. Every flow from the Phase 2 acceptance criteria (browse, cook profile, cart, checkout mock, order history, seller onboarding, reviews) works identically inside the wrapped app as it does in a mobile browser.
4. Android hardware back button never exits the app unexpectedly from a non-root view.
5. No unexpected system-browser handoffs during normal use (only genuinely external links, if any are added later, should leave the app).
6. No requested device permission lacks a corresponding in-app feature that uses it.
