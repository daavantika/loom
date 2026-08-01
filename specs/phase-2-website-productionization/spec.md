# Phase 2 Spec — Website Productionization

> **Superseded for hosting.** This spec targeted the pre-migration vanilla prototype at the repo root. `phase-6-react-migration` replaced it with `../../frontend`, and `phase-16-frontend-hosting` covers getting that React app hosted. This spec's other requirements (Lighthouse scores, accessibility pass, SEO metadata, error/empty-state audit, image-fallback behavior) were never re-verified against `../../frontend` and remain open — a future phase should re-run this checklist against the React app if/when needed.

## Goal
Take the existing static prototype (`index.html`, `app.js`, `styles.css`) — currently mock-data/localStorage only, no backend calls — and harden it into a real, publicly hosted website on a custom HTTPS domain. This is the site Median.co will wrap in Phase 4, so it must stand on its own as a finished product first.

Out of scope: wiring to the NestJS backend (deferred — frontend stays on mock data/localStorage for this track), native app packaging (Phase 4), app store submission (Phase 5).

## Requirements

### Document metadata & discoverability
- `<title>` per view is out of scope (SPA, single title acceptable) but must have: meta `description`, canonical `og:title`/`og:description`/`og:image` (1200×630), `favicon.ico` + `favicon.svg`, `robots.txt`, `sitemap.xml` (single-URL is fine for an SPA).
- Existing `theme-color` meta stays; add a matching `msapplication-TileColor` if targeting Windows tiles is desired (optional, skip unless requested).

### Asset reliability
- All `foodImages` in `app.js` currently hotlink `images.unsplash.com` — no self-hosted fallback. Decide: keep hotlinking (accept Unsplash as a runtime dependency, add `loading="lazy"` and a fixed `?w=`/`?q=` already present) or download and self-host under `/assets`. Either way, add an `onerror` fallback (placeholder image) so a broken image never breaks layout.
- Google Fonts `preconnect` already present — keep.

### Error & empty states
- Audit `app.js` render functions for cases with no defensive UI today: empty cart, empty search results, empty order history, empty reviews list, seller store with zero items. Each must render a real empty state (not a blank `<main>`).
- No uncaught exceptions in the browser console across every nav tab (Home, Explore, Basket, Orders, You) and every modal (cook profile, chat, checkout, seller onboarding, review).

### Accessibility
- Existing `aria-label`s on nav/topbar buttons are a good baseline — extend the same pattern to modal close buttons, chip/filter toggles, and star-rating controls.
- Color contrast check against `styles.css` (light + the existing dark-mode block) meets WCAG AA for body text and buttons.
- All interactive elements reachable and operable by keyboard (tab order, Enter/Space activation, Escape closes modals).

### Hosting
- Deployed to a static host behind HTTPS on a real domain (Netlify, Vercel, Cloudflare Pages, or GitHub Pages — pick one in `plan.md`). Median.co requires a stable public HTTPS URL, so this must be live (not `localhost`) before Phase 4 starts.
- Cache headers reasonable for static assets (host default is acceptable).

## Acceptance criteria ("done")
1. Site is reachable at a real HTTPS domain, no mixed-content warnings.
2. Lighthouse (mobile, incognito) scores ≥ 90 Performance, ≥ 95 Accessibility, ≥ 95 Best Practices, ≥ 90 SEO.
3. Walking every nav tab and every modal flow produces zero console errors/warnings in Chrome and Safari (desktop + mobile device emulation).
4. Empty cart, empty search, empty orders, and empty reviews each show a designed empty state, not a blank area.
5. A broken/blocked image (simulate by killing network to `images.unsplash.com`) shows a fallback placeholder, not a broken-image icon.
6. Keyboard-only pass: every button/link/modal is reachable and operable without a mouse.
7. `robots.txt` and `sitemap.xml` resolve at the domain root; `og:image` renders correctly in a social-share debugger (e.g., Facebook Sharing Debugger or Twitter Card Validator).
