# LOOM — Spec-Driven Roadmap

Each phase lives in its own folder with a `spec.md` (what/why, acceptance criteria) and a `plan.md` (technical approach, verification steps). Work phase by phase, in order — don't start a phase whose prerequisites aren't done.

## Backend track
- [`phase-1-foundations`](./phase-1-foundations) — NestJS + Postgres foundation, cook onboarding → admin verification loop. *(implemented — see `../backend`)*
- [`phase-1.5-two-database-split`](./phase-1.5-two-database-split) — retrofit Phase 1 from one database into two: a user DB (cooks + customers) and an admin DB (admin accounts, verification, moderation). Infrastructure work between Phase 1 and Phase 7, not a feature phase itself. *(implemented)*
- [`phase-7-customer-parity-catalog`](./phase-7-customer-parity-catalog) — customer profiles/addresses/favorites, cook-owned menu items, public catalog search. *(implemented)*
- [`phase-8-ordering-fulfillment`](./phase-8-ordering-fulfillment) — cart submission, order creation against real menu data, cook-driven status lifecycle. *(implemented)*
- [`phase-9-frontend-core-loop`](./phase-9-frontend-core-loop) — wire the React frontend to the real backend for the customer core loop (auth, browse, cart, checkout, orders, tracking, favorites); cook-dashboard/admin wiring deferred to a fast-follow phase. *(implemented)*
- [`phase-9.5-cook-dashboard`](./phase-9.5-cook-dashboard) — real cook registration (with file uploads), real admin approval dashboard, real cook kitchen/menu/orders management. *(implemented)*
- [`phase-10-razorpay-payments`](./phase-10-razorpay-payments) — real online checkout (card/UPI/wallet/net banking) via Razorpay, with an automatic 5% platform commission split via Razorpay Route; cash-on-delivery is untouched. *(in progress — code complete, end-to-end verification against real Razorpay keys deferred until the user supplies them)*
- [`phase-11-cook-customer-chat`](./phase-11-cook-customer-chat) — real cook↔customer messaging (replacing the old fully-mocked ChatModal), including a new Messages tab on the cook dashboard. *(implemented)*
- [`phase-12-ai-assistant`](./phase-12-ai-assistant) — real AI assistant (Google Gemini) replacing the old fully-scripted AssistantModal, grounded in the live verified-kitchen catalog so it never recommends a kitchen/dish that doesn't actually exist. *(implemented)*
- [`phase-14-delivery-logistics`](./phase-14-delivery-logistics) — automatic Porter dispatch when a cook marks an order ready, with a webhook path back to delivery status. *(in progress — module/schema/event-wiring code complete and tested against the unconfigured path; the real Porter API contract, sandbox credentials, and true end-to-end verification are deferred until the user completes Porter Enterprise onboarding)*
- Later backend phases (13, 15+: reviews/plans/catering, inventory/pricing, notifications/analytics) are referenced in `../backend/README.md` but not yet spec'd.

## Website & app track
`phase-6-react-migration` superseded the static prototype with the React app in `../frontend`, and `phase-9`/`phase-9.5` (see Backend track above) wired it to the real backend — this track is not mock-data-only anymore.

- [`phase-2-website-productionization`](./phase-2-website-productionization) — turn the static prototype into a real, hosted, production-quality website on a custom HTTPS domain. *(superseded for hosting — see `phase-16-frontend-hosting`; its accessibility/Lighthouse/SEO/error-state requirements were never re-verified against `../frontend` and remain open.)*
- [`phase-3-pwa-readiness`](./phase-3-pwa-readiness) — installable PWA baseline (manifest, service worker, iOS/Android home-screen polish) ahead of native wrapping.
- [`phase-4-median-packaging`](./phase-4-median-packaging) — wrap the site in [Median.co](https://median.co) to produce testable Android/iOS builds.
- [`phase-5-app-store-launch`](./phase-5-app-store-launch) — privacy policy, store listings, Guideline 4.2 mitigation (push notifications), Play Store + App Store submission.
- [`phase-6-react-migration`](./phase-6-react-migration) — like-for-like port of the vanilla-JS app to React + TypeScript + Zustand + React Router, ahead of further feature growth. *(implemented — see `../frontend`; ran ahead of Phase 2/3 completion by explicit request. The Phase 2 static assets/meta tags/CSS — including its accessibility and contrast fixes — carried over directly since `frontend/` copied the already-fixed files, but Phase 2's live acceptance criteria (Lighthouse, real hosting) haven't been re-run against this build, and Phase 3 (PWA manifest/service worker) was never implemented against either codebase.)* Phases 4/5 (app packaging/launch) target this React build going forward.
- [`phase-16-frontend-hosting`](./phase-16-frontend-hosting) — deploy `../frontend` to Cloudflare Pages, wired to the live Render backend via `VITE_API_URL`. *(in progress — repo-side config complete; live deploy pending manual Cloudflare Pages project setup, which only the account owner can do)*

Each phase's `spec.md` states its acceptance criteria — treat a phase as done only when every criterion is met, not when the code merely "looks right."
