# Phase 14 Plan — Technical Approach

## Migration
- `migrations/user-db/1700000000014-DeliveryBookings.ts` — creates `delivery_bookings` per spec.md's schema table, plus `idx_delivery_bookings_order_id` and a partial unique index `idx_delivery_bookings_porter_order_id` (unique only where `porter_order_id IS NOT NULL`, since most rows never get one). Same raw-SQL-via-`queryRunner.query` pattern as every existing migration.

## Entity
- `src/delivery/delivery-booking.entity.ts` — `DeliveryBooking`, `DeliveryBookingStatus` union type, per spec.md's schema table. Added to `src/user-db/data-source.ts`'s `entities` array alongside the other userDb entities.

## New `src/delivery/` module

**`porter-client.service.ts`** — thin `fetch`-based wrapper (no SDK — matches `GeminiClientService`'s convention for REST APIs without an official Node SDK):
- `isConfigured(): boolean` — true iff `PORTER_API_KEY` is set.
- `createPickup({ orderId, pickupLat, pickupLng, pickupAddress?, dropLat, dropLng, dropAddress? }): Promise<{ porterOrderId, trackingUrl? }>` — throws a clear "not configured" error if called without a key, matching `RazorpayClientService.requireClient()`. Endpoint URL/payload/response-parsing are marked `TODO` placeholders pending Porter's real API docs.
- `verifyWebhookSignature(rawBody: string, signature: string): boolean` — HMAC-SHA256 over the raw body via `PORTER_WEBHOOK_SECRET`, timing-safe compare (same hand-rolled `crypto` style as `RazorpayClientService`, not a vendor SDK helper). Marked `TODO` to confirm against Porter's real signature scheme.

**`delivery.events.ts`**:
```ts
export const ORDER_READY_FOR_PICKUP = 'order.ready_for_pickup';
export interface OrderReadyForPickupEvent {
  orderId: string; cookId: string; actorUserId: string;
  dropLat?: number; dropLng?: number; dropAddressLine: string;
}
```
Drop coordinates are embedded directly from the already-loaded `Order` at emit time (same reasoning as `VerificationApprovedEvent` in `verification.events.ts`) — no re-query by the listener.

**`delivery.service.ts`**:
- `@OnEvent(ORDER_READY_FOR_PICKUP) handleOrderReadyForPickup(event)` — looks up pickup coordinates via `CooksService.getPublicProfile(event.cookId)`, creates a `delivery_bookings` row, and:
  - `SKIPPED` if either pickup or drop coordinates are missing, or Porter isn't configured (no API call made).
  - `BOOKED` (with `porterOrderId`/`trackingUrl`) on a successful `porter.createPickup(...)` call.
  - `FAILED` (with `failureReason`) if the Porter call throws — caught internally, logged, never rethrown. Mirrors `PaymentsService.handleVerificationApproved`'s best-effort semantics.
- `handleWebhookStatusUpdate({ porterOrderId, status, riderName?, riderPhone? })` — looks up the booking by `porterOrderId`; unknown id or already-terminal status (`DELIVERED`/`CANCELLED`) is a no-op. Otherwise updates the booking's status/rider fields, and on `DELIVERED` calls `OrdersService.markDeliveredFromWebhook(booking.orderId)`.

**`delivery.controller.ts`**:
- `POST /delivery/webhook` — public (no `JwtAuthGuard`), `@HttpCode(200)`. Reads `req.rawBody` (already enabled globally via `main.ts`'s `{ rawBody: true }`) + `x-porter-signature` header; 400s on missing/invalid signature. Maps a placeholder `PORTER_STATUS_MAP` (`order_assigned`→`RIDER_ASSIGNED`, `order_picked_up`→`PICKED_UP`, `order_completed`→`DELIVERED`, `order_cancelled`→`CANCELLED` — marked `TODO` to confirm against Porter's real enum) and delegates to `DeliveryService.handleWebhookStatusUpdate`. Always 200s past signature verification, mirroring `PaymentsController.webhook`.

**`delivery.module.ts`**: imports `TypeOrmModule.forFeature([DeliveryBooking], 'userDb')`, `CooksModule` (pickup coordinates), `OrdersModule` (exports `OrdersService`, needed for `markDeliveredFromWebhook`); registered in `app.module.ts`.

## Existing modules touched

- `orders/order-status-event... ` — unchanged; no schema change needed on `orders` itself (drop coordinates are already `Order.deliveryLat/deliveryLng` from Phase 8).
- `orders.service.ts`:
  - Constructor gains `private readonly events: EventEmitter2` (global provider from `EventEmitterModule.forRoot()`, same injection pattern as `VerificationService` — no new module import needed for this).
  - `updateStatus()`: the DB transaction is unchanged; after it commits, if `dto.status === 'OUT_FOR_DELIVERY'`, `await this.events.emitAsync(ORDER_READY_FOR_PICKUP, {...})`. `emitAsync` (not `emit`) so the response only returns once `DeliveryService`'s handler has finished — deterministic for tests and avoids a client seeing "success" before dispatch even starts — while still never failing the status update itself, since every failure path inside the handler is caught and recorded on the booking, not rethrown.
  - `+ markDeliveredFromWebhook(orderId): Promise<void>` — idempotent (no-op unless `order.status === 'OUT_FOR_DELIVERY'`), loads the cook's `userId` via `CooksService.getPublicProfile` to record `order_status_events.actor_user_id` (not nullable, FK→users — there's no "system" user, so the cook whose delivery this is stands in, since this is exactly the transition they'd otherwise make by hand), same transaction shape as the existing status-update path.
- `.env.example`: `+ PORTER_API_KEY=`, `+ PORTER_CLIENT_ID=`, `+ PORTER_WEBHOOK_SECRET=` (all blank, following the existing "absent key → feature safely disabled" convention already used for `RAZORPAY_*`/`GEMINI_API_KEY`). **Not** added to `.env.test` — deliberately, so e2e tests keep exercising the unconfigured path, matching how `.env.test` has no Razorpay/Gemini keys either.

## Verification steps
1. `cd backend && npx tsc --noEmit && npm test` — new `porter-client.service.spec.ts` (`isConfigured()`, unconfigured-guard, webhook signature verification), new `delivery.service.spec.ts` (missing-coordinates skip, unconfigured skip, booked/failed paths, idempotent webhook handling), extended `orders.service.spec.ts` (`emitAsync` called only on `OUT_FOR_DELIVERY`, `markDeliveredFromWebhook`'s idempotency and happy path).
2. `npm run migration:run:user` (or the combined `migration:run`) against the local PGlite test instance.
3. `npm run test:e2e` — extended `ordering.e2e-spec.ts` asserts a `SKIPPED` `delivery_bookings` row exists once an order reaches `OUT_FOR_DELIVERY` in the test env (no `PORTER_API_KEY`, no cook coordinates on file — either alone would cause `SKIPPED`).
4. Deferred, once the user has real Porter Enterprise credentials and API docs: fill in `porter-client.service.ts`'s `TODO`s, set `PORTER_API_KEY`/`PORTER_CLIENT_ID`/`PORTER_WEBHOOK_SECRET` locally, place a real test order, mark it `OUT_FOR_DELIVERY` as the cook, confirm a booking appears in Porter's dashboard, and simulate/receive a real webhook callback to confirm the order flips to `DELIVERED`.
