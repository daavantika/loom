# LOOM Cook Backend

NestJS + PostgreSQL backend for LOOM's marketplace. Built phase by phase per [../specs](../specs) — see [../specs/phase-1-foundations](../specs/phase-1-foundations) for the onboarding/verification domain spec, [../specs/phase-1.5-two-database-split](../specs/phase-1.5-two-database-split) for the two-database architecture, [../specs/phase-7-customer-parity-catalog](../specs/phase-7-customer-parity-catalog) for customer profiles/menu/public catalog, and [../specs/phase-8-ordering-fulfillment](../specs/phase-8-ordering-fulfillment) for cart submission and the order lifecycle.

## Setup

```bash
npm install
cp .env.example .env
```

### Databases

This project uses **two separate PostgreSQL databases**: a **user DB** (cooks + customers, and all cook/customer-facing data) and an **admin DB** (admin accounts, verification records, moderation cases) — see `../specs/phase-1.5-two-database-split` for why and how. Each targets standard PostgreSQL for any real deployment, via `USER_DATABASE_URL` and `ADMIN_DATABASE_URL` respectively.

In a sandbox without Docker or a local Postgres install, `scripts/dev-db.ts` serves two independent embedded [PGlite](https://pglite.dev) instances over the real Postgres wire protocol — a dev-only convenience, not a production dependency. Swap in real Postgres instances by pointing the two `*_DATABASE_URL` vars at them; nothing else changes.

```bash
# terminal 1 — user DB, 127.0.0.1:5544
npm run db:dev:user

# terminal 2 — admin DB, 127.0.0.1:5546
npm run db:dev:admin

# terminal 3
npm run migration:run          # runs both migration:run:user and migration:run:admin
npm run seed:admin -- admin@loom.test some-strong-password
npm run start:dev
```

API docs (Swagger) are served at `http://localhost:3000/api` once the app is running.

## Testing

```bash
npm test          # unit tests, no DB required

# e2e tests need both test DBs running (separate from dev, ports 5545/5547):
npm run db:test:user           # terminal 1
npm run db:test:admin          # terminal 2
USER_DATABASE_URL=postgres://loom:loom@127.0.0.1:5545/loom_test \
ADMIN_DATABASE_URL=postgres://loom:loom@127.0.0.1:5547/loom_admin_test \
  npm run migration:run        # terminal 3, once
npm run test:e2e               # terminal 3
```

## Structure

- `src/common` — cross-cutting: `TimeService` (all business time in Asia/Kolkata), `Money` helpers (integer paise), `CryptoService` (AES-256-GCM for payout details at rest).
- `src/auth` — JWT auth, `RolesGuard`/`@Roles()` for COOK/ADMIN/CUSTOMER authorization, `role.ts` (shared `UserRole` type spanning both DBs).
- `src/users`, `src/cooks`, `src/customers`, `src/menu`, `src/orders`, `src/verification`, `src/moderation` — user-DB/admin-DB domain modules (see split below). Later phases add `availability`, `inventory`, `bulk-orders`, `payouts`, `pricing`, `feedback`, `analytics`, `notifications` per the phased plan.
- `src/admin-users` — admin accounts (admin DB), distinct from `src/users` (cook/customer accounts, user DB).
- `src/user-db/data-source.ts`, `src/admin-db/data-source.ts` — TypeORM CLI data sources, one per database.
- `migrations/user-db/`, `migrations/admin-db/` — hand-written TypeORM migrations, one independent history per database (no `synchronize` in any environment).

### Two-database module map

| Module | DB |
|---|---|
| `users` (`User`: COOK/CUSTOMER) | user DB |
| `cooks` (`CookProfile`, `KitchenPhoto`) | user DB |
| `customers` (`CustomerProfile`, `CustomerAddress`, `CustomerFavorite`) | user DB |
| `menu` (`MenuItem`, cook-owned) | user DB |
| `orders` (`Order`, `OrderItem`, `OrderStatusEvent`) | user DB |
| `admin-users` (`AdminUser`) | admin DB |
| `verification` (`VerificationRecord`) | admin DB |
| `moderation` (`ModerationCase`) | admin DB |

There is no foreign key across the two databases — e.g. `verification_records.cook_id` is an unenforced UUID, not an FK, since `cook_profiles` lives in the other database. A cook's verified status is never cached on `cook_profiles` (which only ever holds `DRAFT`/`PENDING_VERIFICATION`); it's computed at read time by merging a user-DB profile read with an admin-DB verification-status read (`VerificationService.getStatusForCook` for one cook, `getStatusForCooks` for a batch — used by catalog search and the favorites list to avoid N+1). `cooks/cooks.service.ts`'s `toPublicCookProfile` is the one shared shape for "a cook as the public/customer sees it" — reused by `GET /cooks/:id`, `GET /cooks`, and the favorites list rather than duplicated per endpoint.

There is no `cart` table — the cart stays client-side and only becomes durable data when `POST /orders` materializes it into `orders` + `order_items` in one call, snapshotting each item's name/price so later menu edits never retroactively change an existing order. `orders/orders.service.ts`'s per-role transition table (`OrdersService.updateStatus`) is the single place order-status rules live; `GET`/`PATCH` on an order the caller isn't a party to returns 404, not 403, so a third party can't detect the order exists.
