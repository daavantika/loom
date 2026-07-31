# Phase 8 Plan — Technical Approach

## Module
New `OrdersModule` (`Order`, `OrderItem`, `OrderStatusEvent` entities, all `'userDb'`; `OrdersService`; `OrdersController`). Imports `CustomersModule` (for `CustomersService.getOrCreateProfile` + a new public `getOwnedAddress`), `CooksModule` (for `CooksService.getMyProfile`/`getPublicProfile`), and `MenuModule` directly (for a new `MenuService.getOrderableItems`) — no new cross-module patterns beyond what Phase 7 already established.

## Reused/new service methods
- `CustomersService.getOwnedAddress(userId, addressId)`: currently private (`getOwnedAddress`, used internally by update/delete). Made public so `OrdersService` can validate+snapshot the chosen address without duplicating the ownership-check logic.
- `MenuService.getOrderableItems(cookId, menuItemIds)`: new — fetches items by id, throws `BadRequestException` listing any id that's missing, belongs to a different cook, or is inactive. One query (`WHERE id IN (...) AND cook_id = ... AND active = true`), then a set-difference check against the requested ids.
- `CooksService.getPublicProfile` (existing, Phase 1/7) is reused as-is for the "cook exists and is verified" check plus reading `minOrderValuePaise`.

## Order creation flow (`OrdersService.create`)
1. `customer = await customers.getOrCreateProfile(userId)`.
2. `{ profile: cook, verification } = await cooks.getPublicProfile(dto.cookId)`; 400 if `!verification.verified`.
3. `address = await customers.getOwnedAddress(userId, dto.addressId)` (404 if not the caller's).
4. `items = await menu.getOrderableItems(dto.cookId, dto.items.map(i => i.menuItemId))`.
5. Compute `subtotalPaise = sum(item.pricePaise * requestedQty)`; 400 if `< cook.minOrderValuePaise`.
6. Single `userDb` transaction: insert `orders` (status `PLACED`, `deliveryFeePaise: 0`, snapshot address fields), insert `order_items` rows (snapshotting `name`/`pricePaise` from the fetched menu items), insert one `order_status_events` row (`status: 'PLACED'`, `actorUserId: userId`). Return the created order with items.

## Status transitions (`OrdersService.updateStatus`)
A small transition table, keyed by caller role, mapping current status → allowed next statuses (see spec.md's business rules). `updateStatus(userId, role, orderId, dto)`:
1. Load the order; 404 if the order doesn't exist.
2. Ownership check: `role === 'COOK'` requires `order.cookId === callersCookProfileId`; `role === 'CUSTOMER'` requires `order.customerId === callersCustomerProfileId`. Either mismatch → 404 (not 403 — don't reveal the order exists to a non-party).
3. Look up `allowed = TRANSITIONS[role][order.status]`; 400 if `dto.status` isn't in that list.
4. Transaction: update `orders.status`, insert one `order_status_events` row (`actorUserId: userId`, `note: dto.note`).

## Ownership resolution
Both `getById` and `updateStatus` need "does this user own this order, as customer or as cook" — implemented by resolving the caller's `CustomerProfile`/`CookProfile` id (whichever the JWT role indicates) once per request and comparing, rather than a cross-DB or joined lookup — everything here is userDb-local.

## Migrations
`migrations/user-db/`: `1700000000008-Orders.ts`, `1700000000009-OrderItems.ts`, `1700000000010-OrderStatusEvents.ts`, continuing existing numbering. Add the three new entities to `src/user-db/data-source.ts`'s entity array.

## Verification steps
1. `npm run build` compiles cleanly.
2. `npm test` — new `OrdersService` unit tests (subtotal computation, min-order-value rejection, unverified-cook rejection, cross-cook item rejection, transition table for both roles, 404-not-403 ownership) alongside existing suites.
3. `npm run migration:run:user` applies the three new migrations cleanly on top of Phase 7 state.
4. `npm run test:e2e` — new `ordering.e2e-spec.ts` walking the Phase 8 acceptance criteria end to end (place order, list both sides, full status walk, invalid-skip rejection, customer cancel window, third-party 404), reusing the existing PGlite test-DB pattern.
5. Manual curl walkthrough: place an order, watch it move through statuses, confirm a skipped transition and an unverified-cook order both fail as expected.
