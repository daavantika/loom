# Phase 8 Spec — Cart Submission, Ordering & Fulfillment

## Goal
Let a customer place a real order against real menu data (Phase 7) and a cook manage it end to end. This is the phase that converts LOOM from a browsing prototype into a functioning marketplace.

## Design note: no persisted cart
The cart stays client-side (as it already is, per the frontend's Zustand store) — there is no `cart` table. A cart only becomes durable data when submitted as an order (`POST /orders`), which materializes it into `orders` + `order_items` in one call. This avoids a server-cart-sync problem for no real benefit at this stage.

## Entities (all user DB — orders never need to cross into the admin DB)

### `orders`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| customer_id | uuid, FK→customer_profiles (cascade) | |
| cook_id | uuid, FK→cook_profiles (cascade) | one order = one cook; a cart spanning multiple cooks needs multiple orders |
| delivery_address_label, delivery_address_line, delivery_area, delivery_lat, delivery_lng | snapshot of the chosen `customer_addresses` row at order time | not FK'd to the address — the address can be edited/deleted later without corrupting order history |
| status | text CHECK IN ('PLACED','ACCEPTED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'), default 'PLACED' | |
| subtotal_paise, delivery_fee_paise, total_paise | integer | `delivery_fee_paise` is always 0 in this phase — no fee-calculation logic exists yet |
| payment_status | text CHECK IN ('COD','PENDING'), default 'COD' | placeholder; Phase 10 replaces this with real payment collection |
| created_at, updated_at | timestamptz | |

### `order_items`
id, order_id FK→orders (cascade), menu_item_id FK→menu_items (nullable, ON DELETE SET NULL — order history survives a deleted menu item), name + price_paise (snapshot at order time, independent of later menu edits), quantity (> 0), line_total_paise.

### `order_status_events`
id, order_id FK→orders (cascade), status, actor_user_id FK→users, note nullable, created_at. Append-only audit trail — also what powers order tracking.

## API

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | /orders | CUSTOMER | place an order against one cook's active menu items |
| GET | /orders/mine | CUSTOMER | list own orders, newest first |
| GET | /cooks/me/orders | COOK | list orders placed against the caller's kitchen |
| GET | /orders/:id | CUSTOMER or COOK | order detail + item list + status history; 404 (not 403) if the caller is neither the customer nor the cook on this order |
| PATCH | /orders/:id/status | CUSTOMER or COOK | status transition (see business rules); 404 if not a party to the order, 400 if the transition isn't allowed from the current status for that role |

## Business rules
- `POST /orders` validates, in order: the cook exists and is currently verified (a live admin-DB read, same pattern as Phase 7's catalog `verifiedOnly` filter) → the chosen address belongs to the calling customer → every requested `menuItemId` belongs to that cook and is `active` → the computed subtotal is >= `cook_profiles.min_order_value_paise`. Any failure is a 400 (or 404 for a nonexistent cook/address/menu item) with no order created.
- Order line items snapshot `name`/`price_paise` from the menu item at order time — later menu edits (price changes, renames, deactivation) never retroactively change an existing order.
- Status transitions are role-gated:
  - Cook: `PLACED→ACCEPTED→PREPARING→OUT_FOR_DELIVERY→DELIVERED`, plus `PLACED→CANCELLED` and `ACCEPTED→CANCELLED`.
  - Customer: only `PLACED→CANCELLED` (once a cook has accepted, the customer can no longer unilaterally cancel).
  - Any other transition (skipping a step, cancelling after `PREPARING`, a customer trying to advance the cook's steps) is a 400.
- Every successful transition appends one `order_status_events` row (`actor_user_id` = the caller's `users.id`) and updates `orders.status` — both in the same transaction.
- `GET`/`PATCH` on an order the caller has no relationship to returns 404, not 403 — existence of another party's order is not revealed.

## Acceptance criteria ("done")
1. A customer places an order against a verified cook's active menu items, total meeting `min_order_value_paise` → 201, order `status = PLACED`, correct `subtotal_paise`/`total_paise`.
2. The same request against an unverified cook → 400, no order row created.
3. A request whose subtotal is below `min_order_value_paise` → 400.
4. A request including a menu item belonging to a different cook, or an inactive item → 400.
5. The cook lists `GET /cooks/me/orders` and sees the new order; the customer independently sees it via `GET /orders/mine`.
6. The cook walks the order through `ACCEPTED→PREPARING→OUT_FOR_DELIVERY→DELIVERED`; `GET /orders/:id` shows all five status events (including the initial `PLACED`) in order.
7. The cook attempting to jump `PLACED→PREPARING` directly gets 400.
8. The customer can cancel while `PLACED`; once the cook has moved it to `ACCEPTED`, the customer's cancel attempt gets 400.
9. A third-party user (neither the customer nor the cook on the order) gets 404 on both `GET /orders/:id` and `PATCH /orders/:id/status`.
