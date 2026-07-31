# Phase 5 Spec — App Store Submission & Launch

## Goal
Get the Phase 4 Median build listed and approved on the Google Play Store and Apple App Store.

## Key risk to plan around
Apple's App Review Guideline 4.2 ("Minimum Functionality") is the most common rejection reason for webview-wrapped apps like a Median build — Apple can reject an app that is "just a website in a wrapper" with no native-feeling value beyond what Safari already gives. This must be planned for, not discovered at review time. Mitigations to include before first submission (pick at least one, ideally two):
- Push notifications (order updates, new-kitchen alerts) — Median supports this via an integration (e.g., OneSignal); genuinely useful and clearly "native," not achievable the same way in a plain browser tab.
- Native share sheet on cook/dish pages (Median plugin) instead of a web share fallback.
- Home-screen widget or app-badge count for cart/orders (platform-dependent, evaluate feasibility inside Median's plugin list).
- At minimum: confirm the app is not a 1:1 mirror of a page that ranks well in mobile Safari with no differentiation — Apple reviewers do check.
Google Play does not enforce an equivalent policy as strictly, but still expects the app to function fully offline-tolerant per the Phase 3 PWA work and to pass the standard content/permissions review.

## Requirements

### Legal/compliance prerequisites
- Privacy policy page (public URL) — required by both stores even though this prototype currently stores everything in `localStorage` with no server-side personal data collection. State that plainly in the policy; update it the moment backend integration (a future, separate track) starts collecting real user data.
- Terms of use (recommended, not always required — include if the app will process real orders/payments in a later phase).
- Apple Developer Program enrollment (individual or org) and a Google Play Developer account, both under whatever legal entity will own the listings.

### Store listing assets
- App name, subtitle/short description, full description, keywords (Apple), category, content rating questionnaire (Play) / age rating (Apple).
- Screenshots at each required device size for both stores (Median can often auto-generate device-framed screenshots from the live app — verify before hand-producing a full matrix).
- App icon at each store's required export sizes (derived from the same Phase 3 source icon).

### Submission
- Play Store: complete the Data Safety form accurately based on what the app actually collects (currently: nothing sent off-device — all state is `localStorage`); submit the AAB from Phase 4 to the internal testing track first, then production.
- Apple: submit the Phase 4 build via App Store Connect / TestFlight, fill in the App Privacy ("nutrition label") section matching the same "no data collected" reality, submit for review with the 4.2 mitigations from above already in place.

## Acceptance criteria ("done")
1. Privacy policy is live at a public URL and linked from both store listings.
2. Play Store listing is live and installable by the public (or explicitly still in internal/closed testing if that's the deliberate stopping point for this phase).
3. Apple App Store listing passes review and is live (or, if rejected, the specific guideline cited is logged here with the remediation applied before resubmission).
4. Data Safety (Play) and App Privacy (Apple) disclosures accurately reflect what the app actually collects — audited against `app.js`'s actual `localStorage` usage, not assumed.
5. At least one of the 4.2-mitigation features (push notifications, native share, etc.) identified above is live in the submitted build, not just planned.
