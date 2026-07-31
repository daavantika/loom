# Phase 1 Spec — Foundations & Cook Onboarding/Verification

## Goal
Stand up the NestJS + PostgreSQL foundation and deliver the cook onboarding → verification loop end to end: a cook can sign up and submit onboarding details, an admin can review and approve/reject, and the cook's verified status is queryable.

## Entities

### `users`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| email | text, unique | |
| password_hash | text | bcrypt |
| role | text CHECK IN ('COOK','ADMIN','CUSTOMER') | |
| created_at | timestamptz | |

### `cook_profiles`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK→users, unique | |
| kitchen_name | text | |
| owner_name | text | |
| area | text | free-text Coimbatore locality |
| address_line | text | |
| lat, lng | numeric, nullable | |
| delivery_radius_km | numeric | |
| bio | text, nullable | |
| min_order_value_paise | integer, default 0 | enforced later by OrdersModule (Phase 3) |
| status | text CHECK IN ('DRAFT','PENDING_VERIFICATION','VERIFIED','REJECTED','SUSPENDED') | |
| verified_at | timestamptz, nullable | |
| created_at, updated_at | timestamptz | |

### `kitchen_photos`
id, cook_id FK, url, sort_order

### `verification_records`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| cook_id | uuid, FK | |
| type | text CHECK IN ('INITIAL','RENEWAL') | |
| fssai_number | text, nullable | |
| fssai_doc_url | text, nullable | |
| payout_details_encrypted | bytea | app-layer AES-256-GCM (CryptoService), never returned in plaintext by any API response |
| payout_method | text CHECK IN ('UPI','BANK') | |
| status | text CHECK IN ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','CHANGES_REQUESTED') | |
| reviewed_by | uuid, FK→users, nullable | |
| reviewed_at | timestamptz, nullable | |
| rejection_reason | text, nullable | |
| created_at | timestamptz | |

### `moderation_cases` (minimal — verification type only in this phase)
id, type ('VERIFICATION'), entity_type ('cook_profile'), entity_id, status ('OPEN'|'IN_REVIEW'|'RESOLVED'|'REJECTED'), assigned_admin_id nullable, resolution_notes nullable, opened_at, resolved_at nullable

## API

All mutating endpoints require `Authorization: Bearer <jwt>`. Roles enforced by a `RolesGuard`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | /auth/register | public | create a `users` row (role COOK or CUSTOMER only — ADMIN seeded manually) |
| POST | /auth/login | public | returns JWT |
| POST | /cooks/onboarding | COOK | create/update `cook_profiles` (DRAFT) + `kitchen_photos` |
| POST | /cooks/onboarding/submit | COOK | validates required fields present, creates a `verification_records` row (status SUBMITTED) + a `moderation_cases` row (OPEN), sets `cook_profiles.status = PENDING_VERIFICATION` |
| GET | /cooks/me | COOK | returns own profile + latest verification status |
| GET | /cooks/:id | public | public profile view (name, area, verified badge, rating placeholder — no verification internals) |
| GET | /admin/moderation/verifications | ADMIN | list OPEN/IN_REVIEW verification cases |
| POST | /admin/moderation/verifications/:caseId/approve | ADMIN | sets verification_record APPROVED, cook_profiles.status = VERIFIED + verified_at, moderation_case RESOLVED |
| POST | /admin/moderation/verifications/:caseId/reject | ADMIN | requires `reason`; sets verification_record REJECTED, cook_profiles.status = REJECTED, moderation_case REJECTED |

## Business rules
- `POST /cooks/onboarding/submit` fails with 400 if kitchen_name, owner_name, area, delivery_radius_km, at least 1 kitchen photo, or payout details are missing.
- A cook cannot submit a second verification while one is `SUBMITTED` or `IN_REVIEW` (409).
- Only `ADMIN` role can approve/reject (403 otherwise) — covered by a dedicated auth test.
- `payout_details_encrypted` is written via app-layer AES-256-GCM (`CryptoService`, key from `PAYOUT_DETAILS_ENCRYPTION_KEY`) and is never included in any JSON response, including admin views, in this phase (admin sees payout_method only, not the raw value) — decrypting for real disbursement is deferred to Phase 5.
- Rejecting sets `cook_profiles.status = REJECTED`; the cook can resubmit onboarding (new `verification_records` row, back to `PENDING_VERIFICATION`) — no separate "resubmit" endpoint needed, `submit` handles both first-time and resubmission.

## Acceptance criteria ("done")
1. A new user registers as COOK, logs in, gets a JWT.
2. That cook submits onboarding with all required fields → profile status `PENDING_VERIFICATION`, one moderation case `OPEN`.
3. An admin lists open verification cases, sees it, approves it → cook profile status `VERIFIED`, `verified_at` set, moderation case `RESOLVED`.
4. `GET /cooks/:id` for that cook shows a verified badge.
5. A non-admin calling the approve endpoint gets 403.
6. Submitting onboarding with a missing required field returns 400 and no verification record is created.
7. Submitting again while a verification is already `SUBMITTED` returns 409.
