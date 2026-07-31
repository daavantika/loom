# Phase 1 Plan — Technical Approach

## Scaffolding
- `backend/` directory at repo root, NestJS CLI project (`@nestjs/cli`), TypeScript strict mode.
- ORM: **TypeORM** (chosen over Prisma for this phase — first-class NestJS integration via `@nestjs/typeorm`, migration files are plain SQL-adjacent and easy to review; revisit only if a future phase needs Prisma's type-safe query builder badly enough to justify the switch).
- Postgres via `DATABASE_URL` for real deployments. This sandbox has no Docker or local Postgres install, so `scripts/dev-db.ts` serves an embedded PGlite instance over the real Postgres wire protocol on 127.0.0.1:5544 (5545 for the e2e test DB) — a dev-only convenience, not part of the production path. Connection via `.env` (`DATABASE_URL`), `.env.example` committed, `.env` gitignored.
- UUID primary keys use `gen_random_uuid()`, built into Postgres core since v13 — no extension required.

## Modules
- `CommonModule`: `TimeService` (all business-time math pinned to `Asia/Kolkata` via `date-fns-tz`), `Money` helpers (paise integer arithmetic), `CryptoService` doing app-layer AES-256-GCM for payout details (chosen over the Postgres `pgcrypto` extension so it behaves identically on any Postgres-wire-compatible backend, including the embedded PGlite server used for local dev in this sandbox).
- `AuthModule`: `passport-jwt` strategy, `RolesGuard` reading a `@Roles()` decorator, bcrypt password hashing.
- `CooksModule`: `CookProfile`, `KitchenPhoto` entities + service/controller for onboarding CRUD and public profile read.
- `VerificationModule`: `VerificationRecord` entity, submit/approve/reject logic, emits `VerificationSubmitted` / `VerificationApproved` / `VerificationRejected` events (consumed by `ModerationModule`; future Phase 7 `NotificationsModule` will also subscribe).
- `ModerationModule` (minimal): `ModerationCase` entity, listens for `VerificationSubmitted` to open a case, exposes the admin list/approve/reject endpoints (approve/reject actually delegates the state change to `VerificationModule` via an injected service method, keeping the transition logic in one place).

## Migrations
One migration per entity group, in order: `001_users`, `002_cook_profiles`, `003_kitchen_photos`, `004_verification_records`, `005_moderation_cases`. Run via `npm run migration:run`.

## Auth
JWT signed with an `.env`-provided secret, 24h expiry for this phase (refresh tokens out of scope until a real mobile client needs them). `RolesGuard` + `@Roles('ADMIN')` on admin routes; an e2e test asserts 403 for a COOK-role token.

## Verification steps
1. `npm run start:dev` boots without error against local Postgres.
2. `npm run migration:run` applies all 6 migrations cleanly on an empty DB.
3. `npm test` (unit) and `npm run test:e2e` (integration, against a real test DB) both pass.
4. Manually walk the acceptance criteria in spec.md via the auto-generated Swagger UI at `/api`.
