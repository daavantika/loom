# Phase 1.5 Plan — Technical Approach

## Connections
Two named TypeORM connections registered in `app.module.ts`: `userDb` (`USER_DATABASE_URL`) and `adminDb` (`ADMIN_DATABASE_URL`). No default/unnamed connection — every `TypeOrmModule.forFeature()` call names its connection explicitly, so a forgotten binding fails at boot rather than silently hitting the wrong DB.

## Migrations
`src/data-source.ts` splits into `src/user-db/data-source.ts` and `src/admin-db/data-source.ts`, each with an explicit entity array (not a glob, now that entities are split into two groups under one `src/` tree) and its own migration folder glob. `migrations/` splits into `migrations/user-db/` and `migrations/admin-db/`, each with an independent history (TypeORM tracks applied migrations per-DataSource, so this is native behavior). `package.json` gets `migration:run:user`/`:admin` (+ a combined `migration:run` running both) and matching `:revert` scripts — there is no `--connection` flag on the TypeORM CLI, so two scripts is unavoidable, not a stylistic choice.

Since there's no real deployed data yet (local PGlite only), migrations are rewritten clean rather than as ALTER/backfill scripts: `admin-db` gets a new `AdminUsers` migration plus rewritten `VerificationRecords` (drop the `cook_id` FK, retarget `reviewed_by` at `admin_users`) and `ModerationCases` (retarget `assigned_admin_id` at `admin_users`); `user-db` keeps `Users`/`CookProfiles`/`KitchenPhotos` with narrowed CHECK constraints.

## Dev DB (PGlite)
Two separate PGlite instances, not one instance with multiple databases (the installed PGlite version has no multi-database support, and two instances matches production topology). `scripts/dev-db.ts` takes a `--name user|admin` flag:

| | dev port | dev data dir | test port | test data dir |
|---|---|---|---|---|
| user | 5544 | `.pgdata-dev-user` | 5545 | `.pgdata-test-user` |
| admin | 5546 | `.pgdata-dev-admin` | 5547 | `.pgdata-test-admin` |

## `AdminUser` entity
A distinct entity/table, not the `User` class bound to a second connection — role constraints and future shape (2FA, audit fields) are expected to diverge, and there's no shared-migration benefit since migrations are already per-DataSource. `UserRole` type moves from `users/user.entity.ts` to `auth/role.ts` since it now describes both tables and isn't a DB binding.

`POST /auth/login` stays one endpoint: `AuthService.login` tries `UsersService.findByEmail` (userDb), falls back to `AdminUsersService.findByEmail` (adminDb) on a miss, bcrypt-compares whichever hit. A second `/admin/auth/login` endpoint is deliberately avoided — its mere existence would leak which emails are admin accounts.

## Cross-DB pattern
- **Read**: `VerificationService.getStatusForCook(cookId)` (new method, adminDb) wraps the existing `findLatestForCook`, returns `{ verified: boolean; status; verifiedAt?; rejectionReason? }`. `CooksService` (userDb) calls it directly — `VerificationModule` is already imported by `CooksModule`, no new wiring.
- **Write**: no DB-level FK across the boundary (already true today — `verification_records.cook_id` is a plain UUID column with no TypeORM relation). No `assertExists` helper is needed yet in this phase since every call site already holds a validated in-hand row; the convention is documented in the roadmap for future phases that accept a raw cross-DB id from a request body.

`cook_profiles.status` stops being written as `VERIFIED`/`REJECTED`: delete `CooksService`'s two `@OnEvent('verification.approved'|'verification.rejected')` handlers. `submitVerification`'s guards and `getPublicProfile`'s `verified` computation switch to `await this.verification.getStatusForCook(...)`. `ModerationService.approveVerification`/`rejectVerification` continue to only touch `verification_records` + `moderation_cases` (already true — the cross-DB effect being removed lived in `CooksService`, not `ModerationService`), wrapped in a single adminDb transaction as a correctness improvement while this code is being touched anyway.

## Verification steps
1. `npm run db:dev:user` / `npm run db:dev:admin` (two terminals) both boot cleanly.
2. `npm run migration:run:user` and `npm run migration:run:admin` each apply cleanly on an empty DB.
3. `npm run seed:admin -- admin@loom.test <password>` inserts into `admin_users`; confirm via direct query.
4. `npm test` passes, including updated `cooks.service.spec.ts` (mocks `getStatusForCook` instead of setting `profile.status`) and a new `getStatusForCook` test in `verification.service.spec.ts`.
5. `npm run test:e2e` passes against both PGlite test instances (5545/5547), with `test/onboarding.e2e-spec.ts` cleanup/seeding split across `getDataSourceToken('userDb')`/`('adminDb')`.
6. Manual walkthrough via Swagger (`/api`): register cook → onboard → submit → seed+login admin → approve → `GET /cooks/:id` shows `verified: true`; direct DB check confirms `cook_profiles.status` never became `VERIFIED`.
