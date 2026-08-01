# Phase 16 Spec — Frontend Hosting (Cloudflare Pages)

## Goal
Get `../../frontend` (the React app — `phase-6-react-migration`, wired to the real backend since `phase-9`/`phase-9.5`) built and reachable on real HTTPS, talking to the live backend (`loom-backend` on Render), instead of only ever having run locally.

Out of scope: custom domain (default Cloudflare `*.pages.dev` URL is enough for now — a custom domain becomes relevant once `phase-4-median-packaging` needs a stable domain to wrap), and the rest of `phase-2-website-productionization`'s checklist (Lighthouse scores, accessibility pass, SEO metadata audit, error/empty-state audit, image-fallback behavior) — that spec targeted the pre-migration vanilla site and was never re-run against `frontend/`; it stays a separate, open item.

## Prerequisite — Cloudflare account access
Creating the Cloudflare Pages project, connecting the GitHub repo, and setting the production environment variable are dashboard actions only the account owner can do — this phase ships the repo-side config (below); the live deploy itself is a manual step (see `plan.md`).

## Requirements

### Build determinism
- `frontend/.node-version` pins the build's Node version — `frontend/package.json` has no `engines` field and Cloudflare Pages' `NODE_VERSION` build env var has documented cases of being ignored, so a committed version file is the reliable mechanism.

### Environment configuration
- The only environment-specific setting is `VITE_API_URL` (`src/lib/api.ts`, `src/lib/upload.ts`) — the backend's base URL. It's a Vite build-time constant (baked into the static bundle, not read at runtime), so it must be set as a Cloudflare Pages project environment variable, not just documented in `.env.example`.

### SPA routing
- `react-router-dom` v7 browser routing (`AppRoutes.tsx`) means direct loads of non-root paths (`/explore`, `/cook`, `/admin`, `/sell/register`, etc.) must resolve to `index.html`, not 404. Cloudflare Pages does this automatically whenever there's no top-level `404.html` in the build output — true here, so no `_redirects` file is needed.

### CORS
- No backend change needed: the frontend only ever sends a Bearer token (`Authorization` header), never cookies/credentials, so the backend's existing unrestricted `app.enableCors()` already permits requests from the deployed frontend's origin.

## Acceptance criteria ("done")
1. The Cloudflare Pages project builds successfully from `frontend/` on a push to `main` (build command `npm run build`, output directory `dist`).
2. The deployed site's Home view loads with no console errors at the assigned `*.pages.dev` URL.
3. Loading a non-root route (e.g. `/explore`) directly — not via in-app navigation — renders correctly instead of 404ing.
4. A real API call (e.g. login, or catalog load) from the deployed site actually reaches `https://loom-backend-7uqb.onrender.com`, confirmed via the browser Network tab — proves `VITE_API_URL` was picked up at build time, not silently defaulting to `localhost:3000`.
5. If the live backend has no verified cooks yet, the app still renders via its existing mock-fallback behavior (`phase-9`) rather than a blank screen or crash.
