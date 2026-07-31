# Phase 9.5 Plan — Technical Approach

## Backend

### Uploads module (`src/uploads/`)
`uploads.constants.ts` (just `UPLOADS_DIR`, in its own file — see gotcha below) + `uploads.module.ts` + `uploads.controller.ts`. `POST /uploads/files` uses `@UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: UPLOADS_DIR, filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter }))`. `fileFilter` rejects anything outside the mimetype whitelist with a 400 (via `cb(new BadRequestException(...), false)`); oversized files get mapped by Nest's own multer-error handling to 413, not 400 — a deliberate, more-correct deviation from the spec's original "gets 400" phrasing. Handler builds the absolute URL from `req.protocol`/`req.get('host')` + the static-served path, returns `{ url }`.

Static serving uses `NestExpressApplication.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' })` in `main.ts` (and equivalently in any e2e test that exercises uploads) — **not** the separate `@nestjs/serve-static` package, which was tried first and pulled in but produced routes mounted at `/` instead of `/uploads` (its `ExpressLoader` wiring didn't behave as documented in this setup); `useStaticAssets` is simpler, built into `@nestjs/platform-express` already, and just worked. `backend/.gitignore` gains `uploads/`. New dep: `multer` (+ `@types/multer` dev) only.

**Gotcha hit during implementation**: `UPLOADS_DIR` must **not** live in `uploads.module.ts` if `uploads.controller.ts` imports it from there — `uploads.module.ts` imports `UploadsController` (to register it) and `uploads.controller.ts` needs the constant for its `FileInterceptor` decorator config, so the two files importing each other is a real circular dependency. CommonJS's circular-import resolution returned `uploads.module.ts`'s **partial** exports to the controller — `UPLOADS_DIR` was still `undefined` at the point the decorator evaluated, so multer silently fell back to the OS temp directory instead of erroring. Fix: `UPLOADS_DIR` lives in its own `uploads.constants.ts`, imported independently by both files, breaking the cycle.

### `GET /cooks/me` enrichment
`CooksController.getMe` currently returns `this.cooks.getMyProfile(userId)` directly. Change to call a new `CooksService.getMyProfileWithStatus(userId)` that loads the profile (existing `getMyProfile`) then merges `verification.getStatusForCook(profile.id)` (`VerificationService`, already injected into `CooksService`) — same pattern as `getPublicProfile`. Controller returns the flattened merge (profile fields + `verified`/`verificationStatus`/`rejectionReason`).

### Enriched admin verification listing
- `CooksService.findProfilesByIds(cookIds: string[]): Promise<CookProfile[]>` — one `find({ where: { id: In(cookIds) } })`, no verification merge (admin already holds the verification record for these cases).
- `ModerationModule` imports `CooksModule` (exports `CooksService` already — confirmed no import cycle: `CooksModule` imports `VerificationModule`/`MenuModule` only).
- `ModerationService.listOpenVerificationCases()` becomes `async`: fetch the open cases (existing query), batch-fetch their `VerificationRecord`s by id (`In(cases.map(c => c.entityId))`), batch-fetch the corresponding `CookProfile`s via `findProfilesByIds`, then zip into `{ ...case, verification, cook }` per row. `ModerationController.listVerifications` needs no change (still just calls the service method) beyond awaiting the now-async result correctly (already awaited via Nest's return-value handling).

## Frontend

### `PhotoUpload` component (`src/components/PhotoUpload.tsx`)
Takes `onUploaded: (url: string) => void` (+ optional `label`). Renders a file input, on change calls a new `lib/upload.ts`'s `uploadFile(file): Promise<string>` (does its own `fetch` with `FormData`, not through `apiFetch` since that assumes JSON — still attaches the `Authorization` header via `lib/auth.ts`'s `getToken()`), shows a small loading/error state, calls `onUploaded` with the returned URL on success.

### `/sell/register` (`src/views/SellerRegistration.tsx`)
New route added to `AppRoutes.tsx`. On mount, calls `GET /cooks/me` (via a new `loadCookStatus()` store action — see below) to pre-fill if a `DRAFT`/`REJECTED` profile exists; 404 means a blank form. Local component state for all fields (not store state — this is a one-shot form, not shared app state). Kitchen photos: array of uploaded URLs via repeated `PhotoUpload`. FSSAI doc: single `PhotoUpload`. On submit: `POST /cooks/onboarding` with all fields, then `POST /cooks/onboarding/submit` with `{ fssaiNumber, fssaiDocUrl, payoutMethod, payoutDetails }`; on success, `loadCookStatus()` again and navigate to `/profile` with a toast; on failure (either call), show the real backend error via toast and stay on the form.

### `appStore.ts` additions
- `cookProfile: (ApiCookProfile & { verified, verificationStatus, rejectionReason? }) | null`, `cookProfileChecked: boolean` (distinguishes "haven't checked yet" from "checked, no profile" — avoids a flash of the wrong button state).
- `loadCookStatus()`: `GET /cooks/me`; 404 → `{ cookProfile: null, cookProfileChecked: true }` (not an error toast — "no kitchen yet" is an expected state); other failures → toast.

### `Profile.tsx`
Calls `loadCookStatus()` on mount (when `auth` present). Replaces the `store ? ... : ...` ternary with a branch over `cookProfile?.verificationStatus` (see spec.md's five states) — each branch sets its own button label/destination/disabled state.

### `Admin.tsx`
Add a guard at the top: `useEffect(() => { if (auth && auth.role !== 'ADMIN') navigate('/'); }, ...)` — also handles the not-logged-in case (redirect, since there's nothing to show). "Needs review" tab: `loadModerationCases()` new store action (`GET /admin/moderation/verifications`) on mount; render the enriched case data; Approve button calls `POST /admin/moderation/verifications/:caseId/approve` then reloads the list; Reject opens a small reason prompt then calls the reject endpoint. "Hygiene"/"Orders" tabs replaced with `EmptyState` ("Not available yet — no backend support for this case type").

`AuthModal.tsx`: after a successful `login` (not `register` — admins are never self-registered), check `useAppStore.getState().auth?.role === 'ADMIN'` and `navigate('/admin')` instead of just closing.

### `Cook.tsx`
Add a guard: redirect to `/profile` (with an explanatory toast) unless `cookProfile?.verificationStatus === 'VERIFIED'`. Greeting uses `cookProfile.kitchenName`/`ownerName` instead of `store.name`/`store.owner`. `CookMenu` rewritten against new store actions `loadMyMenu()`/`createMenuItem()`/`updateMenuItem()`/`deleteMenuItem()` (`/cooks/me/menu` CRUD) with a `PhotoUpload` in the add-item form. `CookOrders` rewritten against `loadCookOrders()` (`GET /cooks/me/orders`) and reuses `updateOrderStatus()` (a small generalization of the customer-side status-update call already added in Phase 8/9, since the transition table is role-aware server-side regardless of caller). Overview/Customers/More untouched (still take `store`/`activeStoreView` — see cleanup note below on what stays).

### Cleanup
Remove from `appStore.ts`: `store`, `sellerDraft`, `primeSellerDraft`, `updateSellerDraft`, `setSellerDraftItems`, `addSellerDraftRow`, `publishStore`, `toggleStoreItem`. Delete `SellerOnboardingModal.tsx`, its `ModalState` union member, and its `ModalLayer.tsx` case. Simplify `lib/kitchens.ts`'s `buildKitchens` to drop the `store`/seller-kitchen branch entirely (always returns `base`) — `useKitchens()` simplifies to match. Remove `persistence.ts`'s now-unused `loadSellerStore`/`saveSellerStore`. Remove `SellerStore`/`SellerMenuItem` from `data/types.ts`.

Since `Overview`/`Customers`/`More` tabs in `Cook.tsx` still reference `store`/`activeStoreView` for decorative text (`store.name`, `store.items[0]`), and the mock `store` field is being removed, those three tabs get their decorative reads swapped to `cookProfile` (`kitchenName` instead of `store.name`; drop the `store.items[0]`-based low-stock-dish callout, replacing with a generic placeholder) rather than keeping the mock machinery alive just for them — cheap, and removes the last consumer of the mock store shape.

## Verification steps
1. `cd backend && npm run build && npm test`.
2. `cd frontend && npx tsc -b && npm run build && npm test`.
3. New backend e2e (`test/uploads.e2e-spec.ts` or extended `test/onboarding.e2e-spec.ts`): upload a real small file, assert the returned URL is fetchable; assert a second cook gets 404 on the first cook's menu/order endpoints (re-confirming existing isolation through any touched code paths); assert non-admin gets 403 on the enriched listing; assert the enriched listing's `cook`/`verification` fields match the seeded data.
4. Manual walkthrough with both dev servers running: full loop as listed in spec.md's acceptance criteria, including opening `/cook` as a second, different verified cook and confirming the first cook's data never appears.
