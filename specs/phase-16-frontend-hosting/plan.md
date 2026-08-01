# Phase 16 Plan — Technical Approach

## Host choice
Cloudflare Pages — free, no credit card, and what `phase-2-website-productionization/plan.md` already recommended before the React migration. (A Render Static Site was also considered, since the backend already lives on Render — also free/card-free with equivalent SPA-rewrite and build-env-var support — but the user chose to keep the original Cloudflare Pages recommendation.)

## Repo-side changes
- `frontend/.node-version` — single line, `22`, matching the backend's `engines.node: "22.x"` pin.
- No application code changes — `npm run build` (`tsc -b && vite build`) already succeeds cleanly (exit 0, no warnings), and `VITE_API_URL` (`src/lib/api.ts:3`, `src/lib/upload.ts:3`) is already the single correct env knob, just unset in any deployed environment until Cloudflare's project settings supply it.
- No `_redirects` file — confirmed against Cloudflare's own docs that the default no-`404.html` SPA fallback applies automatically, and `frontend/public/` has no `404.html`.

## Manual setup (Cloudflare dashboard, account-owner-only)
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → `daavantika/loom`, branch `main`.
2. Build settings: **Root directory** `frontend`, **Build command** `npm run build`, **Build output directory** `dist`.
3. **Environment variables** (Production, and Preview if preview deploys should also hit the real backend): `VITE_API_URL` = `https://loom-backend-7uqb.onrender.com`.
4. Save — first build runs immediately; every subsequent push to `main` auto-deploys, matching the backend Render service's `autoDeployTrigger: commit` behavior.
5. Cloudflare assigns a `*.pages.dev` URL — sufficient for this phase; a custom domain is deferred to whenever `phase-4-median-packaging` needs one.

## Verification steps
1. `cd frontend && npm run build` — confirm still exit 0 (already verified clean before this phase; re-verify after `.node-version` is added, since it shouldn't change build behavior locally).
2. After the Cloudflare Pages project is live: open the `*.pages.dev` URL, confirm Home renders with no console errors.
3. Load `/explore` directly via URL bar (not in-app nav) — confirms the automatic SPA fallback, not a 404.
4. Open the Network tab, perform an action that calls the backend (login attempt, or just letting `loadCatalog()` fire on mount) — confirm the request target is `https://loom-backend-7uqb.onrender.com`, not `localhost:3000`.
5. Confirm the Cloudflare build log shows Node 22 in use (from `.node-version`), not a default older version.
