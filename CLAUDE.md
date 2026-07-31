# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LOOM is a mobile-first marketplace for discovering home cooks, bakers, tiffin providers and caterers in Coimbatore — see `README.md` for the full picture. Three parts: `frontend/` (active app), `backend/` (API), and the legacy `index.html`/`app.js`/`styles.css` prototype at the repo root, kept for reference during the migration — not the thing to edit for new features.

## Spec-driven workflow

This project is built phase by phase. Before making non-trivial changes, check `specs/README.md` for the roadmap and the relevant `specs/phase-N-*/spec.md` + `plan.md`. Treat a phase as done only when its acceptance criteria are met. When starting new phased work, add a `specs/phase-N-*/{spec.md,plan.md}` pair following the existing phases' format and link it from `specs/README.md`.

## Backend and frontend specifics

See `backend/CLAUDE.md` when working in `backend/`, and `frontend/CLAUDE.md` when working in `frontend/` — each covers that package's setup commands and non-obvious architecture/gotchas.
