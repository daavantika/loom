# Phase 14 Spec — Automatic Delivery Dispatch via Porter

## Goal
When a cook marks an order ready (`PREPARING → OUT_FOR_DELIVERY`), LOOM automatically books a Porter two-wheeler pickup from the cook's kitchen to the customer's delivery address, and reflects Porter's delivery status back onto the order — so a cook no longer has to arrange a rider by hand.

## Prerequisite — Porter Enterprise access

Porter does not publish a public API spec. Access requires a business agreement with Porter's Enterprise/API Integrations team (porter.in/api-integrations, help@porter.in, +91 80 4410 4410), not self-serve signup. Until real credentials and API docs exist, this phase ships as **scaffolding**: the module structure, database schema, event wiring, config gating, and webhook receiver are all real and tested, but `PorterClientService`'s actual request/response shapes, auth headers, and webhook signature scheme are placeholders marked `TODO` in code, to be filled in once Porter's real contract is available. See `plan.md` for exactly what's deferred.

## Entities (user DB — delivery bookings never need to cross into the admin DB)

### `delivery_bookings`
| field | type | notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK→orders (cascade) | one row per `OUT_FOR_DELIVERY` transition |
| status | text CHECK IN ('PENDING','SKIPPED','BOOKED','RIDER_ASSIGNED','PICKED_UP','DELIVERED','FAILED','CANCELLED'), default 'PENDING' | `SKIPPED`/`FAILED`/stuck `PENDING` all mean "no active Porter booking — cook must arrange delivery manually" |
| porter_order_id | text, nullable, unique when set | Porter's own booking id; how the webhook finds the right row |
| pickup_lat, pickup_lng | numeric, nullable | snapshot of `cook_profiles.lat/lng` at booking time |
| drop_lat, drop_lng | numeric, nullable | snapshot of `orders.delivery_lat/delivery_lng` (already itself a snapshot of the customer's address at order time) |
| rider_name, rider_phone | text, nullable | populated from Porter's webhook once a rider is assigned |
| tracking_url | text, nullable | populated from Porter's booking response, if provided |
| failure_reason | text, nullable | human-readable reason for `SKIPPED`/`FAILED` |
| created_at, updated_at | timestamptz | |

## Trigger

Booking is attempted exactly once per order, at the cook's `PREPARING → OUT_FOR_DELIVERY` transition (`OrdersService.updateStatus`) — not at order placement, since food isn't ready for pickup until then. This is a best-effort side effect via the existing domain-event pattern (`ORDER_READY_FOR_PICKUP`, `@nestjs/event-emitter`) — a Porter outage must never block a cook from marking food ready, and the HTTP response for the status update only completes once the dispatch attempt (success or failure) has been recorded.

## Business rules
- Both pickup coordinates (`CookProfile.lat/lng`) and drop coordinates (`Order.deliveryLat/deliveryLng`) are nullable today (never required at cook onboarding or address creation). If either is missing, or `PORTER_API_KEY` is unset, the booking is recorded `SKIPPED` and no Porter call is made — the order itself is unaffected.
- A Porter API failure records the booking `FAILED` with `failure_reason` and is logged — never surfaces as a failed status update.
- Porter's delivery-status webhook (`POST /delivery/webhook`) is public, signature-verified, and idempotent: an unknown `porter_order_id` or an already-terminal booking (`DELIVERED`/`CANCELLED`) is a safe no-op, mirroring `PaymentsController.webhook`.
- A `DELIVERED` webhook callback also drives `orders.status → DELIVERED` via a new internal `OrdersService.markDeliveredFromWebhook` path — idempotent (only fires from `OUT_FOR_DELIVERY`), bypassing the human-caller role check since Porter can't authenticate as a LOOM user, and recorded in `order_status_events` against the cook's own user id.
- A cook can still mark `OUT_FOR_DELIVERY → DELIVERED` by hand (existing Phase 8 behavior, unchanged) — Porter's webhook is a second, idempotent path to the same end state, not a replacement.

## Acceptance criteria ("done" for this phase as scaffolding)
1. A cook marking an order `OUT_FOR_DELIVERY` creates exactly one `delivery_bookings` row.
2. With `PORTER_API_KEY` unset (today's real deployment state) or missing coordinates, the row is `SKIPPED` and the order status update still succeeds normally.
3. `POST /delivery/webhook` 400s on a missing or invalid signature, and never trusts an unverified body — mirrors `POST /payments/webhook`.
4. A `DELIVERED` webhook callback for a known `porter_order_id` flips both the booking and the order to `DELIVERED`, recorded in `order_status_events`; replaying the same callback is a safe no-op.

## Deferred to a follow-up once real Porter credentials/docs exist
- `PorterClientService`'s actual endpoint URL, request/response payload shape, and auth header format.
- Porter's real webhook signature scheme (header name, algorithm) and real delivery-status enum values.
- Any frontend surfacing of rider name/phone/tracking link on order detail screens.
- A true end-to-end pass against a real Porter sandbox booking and receiving a real webhook callback.
