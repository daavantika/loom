# Phase 7 Spec — Customer Parity & Public Catalog

## Goal
Bring customers to data-model parity with cooks (profile, addresses, favorites), and let cooks publish a real menu that's readable through a public catalog API. This is the first slice of real (non-mock) browsable data — it does not yet cover ordering (Phase 8).

## Entities (all user DB — see `../phase-1.5-two-database-split`)

### `customer_profiles`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK→users, unique | role must be CUSTOMER |
| display_name | text, nullable | |
| dietary_preference | text CHECK IN ('VEG','NON_VEG','EGG','VEGAN'), nullable | |
| spice_level | text CHECK IN ('MILD','MEDIUM','HOT'), nullable | |
| created_at, updated_at | timestamptz | |

### `customer_addresses`
id, customer_id FK→customer_profiles (cascade), label, address_line, area, lat/lng nullable, is_default boolean default false, created_at.

### `customer_favorites`
customer_id FK→customer_profiles (cascade), cook_id FK→cook_profiles (cascade), created_at. Composite PK (customer_id, cook_id) — favoriting twice is a no-op, not an error.

### `menu_items`
id, cook_id FK→cook_profiles (cascade), name, description nullable, price_paise integer (>= 0), image_url nullable, tags text[] default '{}', active boolean default true, created_at, updated_at.

## API

All mutating/self endpoints require `Authorization: Bearer <jwt>`, enforced by the existing `RolesGuard`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | /customers/me | CUSTOMER | get-or-create own profile (mirrors `GET /cooks/me` / onboarding-draft pattern) |
| PATCH | /customers/me | CUSTOMER | update display_name/dietary_preference/spice_level |
| GET | /customers/me/addresses | CUSTOMER | list own addresses |
| POST | /customers/me/addresses | CUSTOMER | add an address |
| PATCH | /customers/me/addresses/:id | CUSTOMER | update an address (404 if not owned) |
| DELETE | /customers/me/addresses/:id | CUSTOMER | remove an address (404 if not owned) |
| GET | /customers/me/favorites | CUSTOMER | list favorite cooks (public cook profile shape, verified badge included) |
| PUT | /customers/me/favorites/:cookId | CUSTOMER | favorite a cook (idempotent, 404 if cook doesn't exist) |
| DELETE | /customers/me/favorites/:cookId | CUSTOMER | unfavorite (idempotent — 204 whether or not it existed) |
| GET | /cooks/me/menu | COOK | list own menu items, including inactive |
| POST | /cooks/me/menu | COOK | create a menu item |
| PATCH | /cooks/me/menu/:id | COOK | update a menu item (404 if not owned) |
| DELETE | /cooks/me/menu/:id | COOK | remove a menu item (404 if not owned) |
| GET | /cooks/:id/menu | public | active menu items for a cook |
| GET | /cooks | public | search/list cooks — filters: `area`, `verifiedOnly` |

## Business rules
- `POST /customers/me/addresses` marking `isDefault: true` un-defaults any other address for that customer (only one default at a time).
- `menu_items.price_paise` must be >= 0; validated at the DTO layer.
- `GET /cooks:id/menu` only returns `active = true` items — a cook can 86 a dish without deleting its history (foundation for Phase 12 inventory).
- `GET /cooks` with `verifiedOnly=true` filters using a live admin-DB read (batch `VerificationService.getStatusForCook`-equivalent), not any cached column — consistent with the Phase 1.5 rule that verification status never lives in the user DB.
- Favoriting/unfavoriting a nonexistent cook: favorite returns 404; unfavorite is idempotent (204 either way, no existence check needed since deleting a nonexistent row is a no-op).

## Acceptance criteria ("done")
1. A customer registers, logs in, and `GET /customers/me` returns (creating on first call) an empty profile.
2. The customer adds two addresses, marks the second as default — the first is no longer default.
3. A verified cook (from Phase 1 flow) adds three menu items, one inactive.
4. `GET /cooks/:cookId/menu` (public, unauthenticated) returns only the two active items.
5. `GET /cooks?verifiedOnly=true` includes that cook; a second, unverified cook's profile does not appear.
6. The customer favorites the cook, `GET /customers/me/favorites` includes it with `verified: true`; unfavoriting removes it; unfavoriting again still returns 204.
7. A cook attempting to edit another cook's menu item gets 404, not another cook's data.
