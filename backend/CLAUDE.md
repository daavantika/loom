# CLAUDE.md — backend

Guidance for working in `backend/`. See the root `CLAUDE.md` for repo-wide context and `README.md` here for setup. Current scope is the cook onboarding → admin verification loop (`../specs/phase-1-foundations`) — no menu, orders, payments, or customer-facing endpoints exist yet.

## Commands

Single-test invocations (not covered in `README.md`):

```bash
npx jest path/to/file.spec.ts               # single unit test file
npx jest -t "test name"                     # single test by name
npx jest --config jest-e2e.config.js --runInBand path/to/file.e2e-spec.ts   # single e2e test file
```

## Architecture

- **Two physical databases** (`../specs/phase-1.5-two-database-split`): `userDb` (`USER_DATABASE_URL`) holds cooks/customers and all cook/customer-facing transactional data; `adminDb` (`ADMIN_DATABASE_URL`) holds admin accounts, verification records, and moderation cases — set up as two separate TypeORM connections (`name: 'userDb'` / `'adminDb'`) in `app.module.ts`. **No FK across the two** — `verification_records.cook_id` is an unenforced UUID, not a foreign key, since `cook_profiles` lives in the other database. A cook's verified status is *never* cached on `cook_profiles.status` (which only ever holds `DRAFT`/`PENDING_VERIFICATION`) — it's computed at read time by merging a `userDb` profile read with an `adminDb` verification-status read. Admin approve/reject writes touch only `adminDb`, as a single-DB transaction — never a cross-DB write in one logical operation. Keep this pattern for any new cross-DB read/write rather than reaching for a cross-database join or FK.
- **Migrations only**: `synchronize: false` always — write a migration for any schema change, never rely on auto-sync. Two databases now means two independent migration histories (see `src/user-db/data-source.ts` / `src/admin-db/data-source.ts`) — run/revert against the right one.
- **`src/common`**: payout details (`CryptoService`, AES-256-GCM) are never returned in plaintext by any API response.
- **Domain event pattern**: `VerificationModule` emits events (`VerificationSubmitted`/`Approved`/`Rejected`) via `@nestjs/event-emitter`; `ModerationModule` listens rather than being called directly. Follow this pattern for new cross-module side effects instead of injecting modules directly into each other.
