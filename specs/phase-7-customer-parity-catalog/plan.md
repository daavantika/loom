# Phase 7 Plan — Technical Approach

## Modules
All new modules bind to `'userDb'` (no new admin-DB entities this phase):
- `CustomersModule` (`CustomerProfile`, `CustomerAddress`, `CustomerFavorite` entities; `CustomersService`, `CustomersController`) — mirrors the shape of `CooksModule`'s onboarding-draft pattern (`getOrCreateProfile` analogous to `getOrCreateDraft`).
- `MenuModule` (`MenuItem` entity; `MenuService`) — owned by cooks, exposed both under `/cooks/me/menu` (cook-authenticated CRUD, added to the existing `CooksController` rather than a new controller, since it's cook-owned data alongside onboarding) and `/cooks/:id/menu` + `/cooks` (public catalog reads).

`CustomersModule` and the menu pieces of `CooksModule` both need `VerificationService` for the same reason `CooksModule` already does (favorites list needs `verified` badges; `GET /cooks?verifiedOnly` needs a batch status read) — import `VerificationModule` the same way `CooksModule` already does.

## Batch verification-status read
`GET /cooks?verifiedOnly=true` and the favorites list (multiple cooks per request) would be N+1 if each called `getStatusForCook` individually. Add `VerificationService.getStatusForCooks(cookIds: string[]): Promise<Map<string, CookVerificationStatus>>` — one query (`WHERE cook_id IN (...)`, latest per cook_id via a window function or a JS group-by since row counts are small at this stage) instead of N. `getStatusForCook` becomes a one-element wrapper around it, or vice versa — implement the batch version first and have the single version call it, avoiding duplicated logic.

## Address default handling
`CustomerAddressesService.create`/`update`, when `isDefault: true` is set, run inside a small transaction: unset `is_default` on the customer's other addresses, then set it on this one. Same DB (userDb), single transaction — no cross-DB concern here.

## Migrations
`migrations/user-db/`: `1700000000004-CustomerProfiles.ts`, `1700000000005-CustomerAddresses.ts`, `1700000000006-CustomerFavorites.ts`, `1700000000007-MenuItems.ts` — continuing the existing per-folder numbering.

## Reuse
- `CustomersService.getOrCreateProfile` mirrors `CooksService.getOrCreateDraft` exactly (find-by-user_id-or-create).
- Cook public-profile shape (id, kitchenName, ownerName, area, bio, deliveryRadiusKm, minOrderValuePaise, verified, photos) from `CooksController.getPublicProfile` is reused as the shape returned in the favorites list and `GET /cooks` — extract a small `CooksService.toPublicShape(profile, verification)` helper so it isn't duplicated across three call sites (existing `GET /cooks/:id`, new `GET /cooks`, new favorites list).
- `Money`/paise convention (`common/money.ts`) reused for `menu_items.price_paise`, consistent with `cook_profiles.min_order_value_paise`.

## Verification steps
1. `npm run build` compiles cleanly.
2. `npm test` — new unit tests for `CustomersService` (address default-unsetting, get-or-create) and `MenuService` (ownership checks) pass alongside existing suites.
3. `npm run migration:run:user` applies the four new migrations cleanly on top of Phase 1/1.5 state.
4. `npm run test:e2e` — extend `test/` with a `catalog.e2e-spec.ts` walking the Phase 7 acceptance criteria (customer profile, addresses, cook menu, public catalog filtering, favorites), reusing the same PGlite test DB pattern as `onboarding.e2e-spec.ts`.
5. Manual walkthrough via curl/Swagger: verified cook adds menu items, unauthenticated `GET /cooks/:id/menu` returns only active ones, `GET /cooks?verifiedOnly=true` correctly excludes an unverified cook.
