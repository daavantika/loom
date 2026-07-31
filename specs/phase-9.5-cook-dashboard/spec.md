# Phase 9.5 Spec — Cook Onboarding, Verification & Kitchen Management

## Goal
Complete the three-sided loop Phase 9 deferred: a real registration page for anyone wanting to sell, a real admin dashboard to review and approve/reject applications, and a real kitchen dashboard for approved cooks to list menu items with uploaded photos. Data isolation (every cook/admin/customer only ever sees their own data) is already enforced server-side from Phases 7/8 — this phase gives real UI to backend paths that already had it, plus one genuinely new backend capability: file upload.

## New backend capability: file uploads
No upload/storage endpoint exists anywhere yet. Add one, local-disk-backed for now (swappable for cloud storage later without changing the client contract).

### `POST /uploads/files`
| | |
|---|---|
| Auth | Any authenticated user (`JwtAuthGuard` only — no role restriction, generic utility) |
| Body | `multipart/form-data`, field `file` |
| Accepted types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Max size | 5MB |
| Response | `{ url: string }` — an **absolute** URL (kitchen-photo/menu-photo/FSSAI-doc fields validate with `@IsUrl()`, which rejects relative paths) |
| Storage | `backend/uploads/<uuid>.<ext>` on local disk, gitignored; served back at `<host>/uploads/<uuid>.<ext>` via `NestExpressApplication.useStaticAssets()` (built into `@nestjs/platform-express` — simpler than the separate `@nestjs/serve-static` package, which targets SPA/Fastify hosting we don't need here) |

Rejects non-whitelisted mimetypes and oversized files with 400.

## Enhanced endpoints

### `GET /cooks/me` (COOK)
Now merges the caller's own live verification status (same cross-DB read `GET /cooks/:id` already uses): response gains `verified: boolean`, `verificationStatus: 'NONE'|'PENDING'|'VERIFIED'|'REJECTED'`, `rejectionReason?: string`. Additive — existing fields unchanged.

### `GET /admin/moderation/verifications` (ADMIN)
Now returns each case enriched with the referenced verification record and cook profile, not just a bare case row:
```
{ id, type, status, openedAt, ...,
  verification: { fssaiNumber, fssaiDocUrl, payoutMethod, type, createdAt },
  cook: { id, kitchenName, ownerName, area, photos, deliveryRadiusKm, bio } }
```
`payoutDetailsEncrypted` is never included (unchanged policy from Phase 1). Top-level case fields (`id`, `status`, etc.) are unchanged so existing consumers of `case.id` are unaffected.

## Frontend surfaces

- **`/sell/register`** (new route, replaces `SellerOnboardingModal`): full onboarding form — kitchen name, owner name, area, address line, delivery radius, bio, minimum order value, kitchen photos (multi-upload), FSSAI number + document upload, payout method + details. Submits via `POST /cooks/onboarding` then `POST /cooks/onboarding/submit` as one action. Pre-fills from `GET /cooks/me` for `DRAFT`/`REJECTED` cooks.
- **Profile "Start selling" button**: branches on the cook's real status — none → "Start selling food"; `DRAFT` → "Continue registration"; `PENDING_VERIFICATION` → "Application under review" (disabled); `REJECTED` → "Resubmit" (shows reason); `VERIFIED` → "Go to kitchen".
- **`/admin`**: role-gated (redirects non-admins). "Needs review" tab shows real applications with real kitchen data and photos; real approve/reject. "Hygiene"/"Orders" tabs show an honest "not available yet" state (no backend feature exists for those case types).
- **`/cook`**: gated to `VERIFIED` cooks only. Menu tab: real CRUD (`/cooks/me/menu`) including photo upload. Orders tab: real list (`/cooks/me/orders`) with real status-transition actions (`PATCH /orders/:id/status`). Overview/Customers/More tabs stay mock (out of scope — need aggregation/reviews features that don't exist yet).
- **Cleanup**: the old local-only mock "seller store" (`appStore.store`/`sellerDraft`/`publishStore`, `SellerOnboardingModal`, the synthetic "seller-store" kitchen in `lib/kitchens.ts`) is removed — real registration supersedes it, and its fake non-UUID ids were a latent checkout-breaking bug if ever reached.

## Business rules
- A cook profile only ever holds `DRAFT`/`PENDING_VERIFICATION` (unchanged from Phase 1.5) — "verified"/"rejected" are always a live merge from the admin DB, never cached, including in this cook-facing status view.
- Resubmission after rejection reuses the existing `submit` endpoint's resubmission handling (marks the new verification record `RENEWAL`) — no separate resubmit endpoint.
- Uploaded files are never trusted by original name or claimed mimetype beyond the server-side whitelist check.
- A cook only ever sees/edits their own menu items and orders; an admin only ever sees moderation-queue data, never another cook's live menu or a customer's cart — all pre-existing ownership checks, exercised (not reintroduced) by this phase's new UI.

## Acceptance criteria ("done")
1. A logged-in customer with no kitchen sees "Start selling food", fills the real registration form including an uploaded kitchen photo, and submits — `cook_profiles.status` becomes `PENDING_VERIFICATION`.
2. An admin logs in, lands on (or navigates to) `/admin`, sees the real application with the real kitchen name, area, and photo, and approves it.
3. The cook, viewing their profile again, now sees "Go to kitchen" instead of a pending/start message.
4. On `/cook`, the cook adds a menu item with an uploaded photo; it appears (only for that cook) via `GET /cooks/me/menu`.
5. A customer sees that dish on Explore/the cook's public profile and can order it.
6. The cook sees the resulting order on their real Orders tab and can advance its status through the same transitions already enforced by the API.
7. A second, unrelated cook's `/cook` dashboard never shows the first cook's menu items or orders (404 if attempted directly).
8. A non-admin hitting the enriched moderation endpoint gets 403; an unauthenticated upload attempt gets 401; an oversized or wrong-mimetype upload gets 400.
