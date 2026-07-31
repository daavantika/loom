# Phase 4 Plan — Technical Approach

## Setup
- This phase is configuration, not code — done in the Median.co dashboard, not this repo. The repo's only obligation is: stay deployed and stable at the production URL used as Median's source, and expose the icon/splash assets already produced in Phase 3 for upload.
- Create the Median project, enter the production domain, upload the 512×512 maskable icon and a splash background matching `#fffaf6`.
- Reserve `com.loom.app` (or confirmed alternative) as the Android package name and iOS bundle id inside Median's app settings — decide this before the first build since changing it later effectively means a new app on both stores.

## Native-shell configuration (all inside Median dashboard)
- Status bar: set to match `theme-color`.
- Pull-to-refresh: test default behavior against Home/Explore scroll first; only disable if it visibly conflicts.
- Back-button behavior: Median's default (JS history-based) should already satisfy the requirement given this is a single-page app driving `state.view` — verify empirically rather than assuming, since the app doesn't use the browser History API (`app.js` renders view swaps by mutating `state.view` and re-rendering, not `history.pushState`). If back-button behavior is wrong because there's no real history stack, add minimal `history.pushState`/`popstate` wiring to `app.js` so Median's back-button hook has something real to walk.
- External URL rules: allowlist the production domain only for in-app top-level navigation; everything else falls through to the system browser (Median's default "open external links externally" setting).
- Permissions: leave camera/location/push capabilities off unless a concrete feature needs them per the spec's permission audit.

## Builds
- Generate an Android internal test build (APK or AAB) via Median, sideload or distribute via Play Console internal testing track.
- Generate an iOS build via Median; distributing to a physical device requires an Apple Developer account (needed regardless for Phase 5) — use TestFlight internal testing once that account exists, or Median's ad-hoc/simulator build in the meantime.

## Verification steps
1. Install the Android build on a real device; walk every nav tab and modal from the Phase 2 spec's flow list.
2. Confirm hardware back button behavior at each nesting level (modal → view → Home → app exit only at root).
3. Install the iOS build (TestFlight or Simulator); repeat the same flow walk, check status bar/splash visuals.
4. Trigger any element that could navigate off-domain (currently none deliberately, but check image taps/long-press don't trigger a navigation); confirm it either stays in-app or explicitly hands off to the system browser as intended.
5. Confirm no permission prompts appear that don't correspond to an actual in-app feature.
