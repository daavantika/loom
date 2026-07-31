# Phase 1.5 Spec — Two-Database Split

## Goal
Retrofit the Phase 1 backend from a single PostgreSQL database into two: a **user DB** (cooks + customers, and all future cook/customer-facing transactional data) and an **admin DB** (admin accounts, verification review, moderation). No product-facing behavior changes — a cook can still onboard, submit for verification, and get approved by an admin, and `GET /cooks/:id` still shows a verified badge. What changes is where the data lives and how verification status is computed.

## Motivation
The product needs cook/customer data and admin/moderation data to live in physically separate databases (owner decision, not a technical requirement of the domain). Moderation and verification data — the thing an admin acts on — stays entirely inside the admin DB; it is never cached or duplicated back into the user DB.

## Entities

### User DB
- `users` — unchanged shape, but `role` CHECK narrows to `('COOK','CUSTOMER')` (admins no longer live here).
- `cook_profiles` — unchanged shape, **except**: `status` CHECK narrows to `('DRAFT','PENDING_VERIFICATION')` only (it no longer holds `VERIFIED`/`REJECTED`/`SUSPENDED` — those are derived from the admin DB at read time, see below), and `verified_at` is dropped (superseded by `verification_records.reviewed_at` on the admin side).
- `kitchen_photos` — unchanged.

### Admin DB
- `admin_users` (new) — id, email (unique), password_hash, role CHECK IN ('ADMIN'), created_at. Structurally like `users` today, but a distinct table or admins only.
- `verification_records` — unchanged shape, except `cook_id` is now an **unenforced** UUID (no FK — cook_profiles lives in the other DB) and `reviewed_by` now references `admin_users.id` instead of `users.id`.
- `moderation_cases` — unchanged shape, except `assigned_admin_id` now references `admin_users.id`.

## API
No endpoint signatures change. Internal behavior changes:
- `POST /auth/login` — tries the user DB first, falls back to the admin DB on a miss.
- `POST /auth/register` — unchanged; already user-DB-only (`role` restricted to `COOK`/`CUSTOMER`).
- `GET /cooks/:id` — `verified` is now computed by merging a user-DB profile read with an admin-DB verification-status read, instead of reading `cook_profiles.status` alone.
- `POST /cooks/onboarding/submit` — "already verified" / "is this a resubmission" checks now query the admin DB's verification status instead of the local `cook_profiles.status` column.
- `POST /admin/moderation/verifications/:caseId/approve|reject` — writes **only** to the admin DB (`verification_records`, `moderation_cases`). No longer touches `cook_profiles` at all.

## Business rules
- `cook_profiles.status` is only ever `DRAFT` or `PENDING_VERIFICATION` going forward — it is a pure onboarding-progress field, not a verification-outcome field.
- "Verified" for a given cook is defined as: the latest `verification_records` row for that `cook_id` (admin DB) has `status = 'APPROVED'`.
- Admin approve/reject actions are a single-DB (admin DB) transaction — no cross-DB write ever happens in one logical operation.
- Email uniqueness is enforced per-table (user DB, admin DB independently) — not globally across both. Admins are only ever provisioned via `scripts/seed-admin.ts`, never self-registered, so this is treated as an operational rule rather than an enforced constraint.

## Acceptance criteria ("done")
1. Both PGlite dev instances (user + admin) start independently; migrations run cleanly on each from empty.
2. A cook registers, logs in, and submits onboarding — all against the user DB only.
3. `npm run seed:admin` inserts into `admin_users` in the admin DB (verified via direct query).
4. An admin logs in (via the same `/auth/login` endpoint) and approves the cook's verification — this write touches only the admin DB.
5. `GET /cooks/:id` returns `verified: true` after approval, proving the cross-DB merge read works.
6. Inspecting `cook_profiles.status` for that cook directly in the user DB shows it is still `PENDING_VERIFICATION` (or `DRAFT`) — never `VERIFIED` — proving the cached-status write was removed, not relocated.
7. All existing Phase 1 e2e acceptance criteria (403 for non-admin approve, 400 for missing fields, 409 for duplicate submission) still pass unchanged.
