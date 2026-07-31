# LOOM

LOOM is a mobile-first interactive marketplace prototype for discovering trusted home cooks, bakers, tiffin providers and caterers in Coimbatore.

## Run locally

The active frontend is now [`frontend/`](./frontend) — a React + TypeScript + Vite app (see [`frontend/README.md`](./frontend/README.md)). Run `npm install && npm run dev` inside `frontend/`.

The original vanilla-JS prototype (`index.html`/`app.js`/`styles.css` at the repo root) is kept for reference during the migration — open `index.html` directly or serve the folder with any static file server, no build step required. It will be retired once the React version is confirmed to fully replace it.

## Included flows

- Customer discovery, filters, cook profiles, menu, favourites, chat, scheduled delivery, basket, payment confirmation, order history and reorders.
- Cook workspace with cutoff alerts, order calendar, preparation status, stock awareness, sales snapshot and payouts.
- Admin trust desk for verifications, food-quality reports and bulk-order exceptions.
- Responsive design, system-aware dark appearance, and interactive navigation.

## Roadmap

This project is built phase by phase, spec-driven — see [`specs/`](./specs) for the full roadmap (backend foundation, then turning this prototype into a production website and packaging it as an app via [Median.co](https://median.co)). Each phase folder has a `spec.md` (what/why) and `plan.md` (how), with explicit acceptance criteria.
