# Phase 10 Plan — Technical Approach

## Migrations
- `migrations/user-db/1700000000011-CookProfilesPhone.ts` — `ALTER TABLE cook_profiles ADD COLUMN "phone" text` (nullable — existing rows have none).
- `migrations/user-db/1700000000012-OrdersPayments.ts` — add `payment_method` (text, default `'COD'`, `CHECK IN ('COD','ONLINE')`), `razorpay_order_id`, `razorpay_payment_id` (nullable text), `platform_fee_paise`, `cook_payout_paise` (nullable integer, `CHECK >= 0`); drop the existing unnamed `payment_status` check (Postgres auto-names single-column unnamed checks `<table>_<column>_check`, so `orders_payment_status_check`) and recreate it widened to `('COD','PENDING','PAID','FAILED')`.
- `migrations/admin-db/1700000000004-VerificationRazorpayAccount.ts` — add `razorpay_account_id` (nullable text) and `razorpay_account_status` (nullable text, `CHECK IN ('PENDING','CREATED','FAILED')`) to `verification_records`.

Same raw-SQL-via-`queryRunner.query` pattern as every existing migration — no ORM sync.

## Entities
- `cook-profile.entity.ts`: `+ @Column({ nullable: true }) phone?: string`.
- `order.entity.ts`: `OrderPaymentStatus` → `'COD'|'PENDING'|'PAID'|'FAILED'`; `+ paymentMethod: 'COD'|'ONLINE'` (default `'COD'`), `+ razorpayOrderId?`, `+ razorpayPaymentId?`, `+ platformFeePaise?`, `+ cookPayoutPaise?` (all nullable).
- `verification-record.entity.ts`: `+ razorpayAccountId?: string`, `+ razorpayAccountStatus?: 'PENDING'|'CREATED'|'FAILED'`.

## New `src/payments/` module

**`razorpay-client.service.ts`** — wraps the `razorpay` npm package (new dependency) and Node's built-in `crypto` (matches `CryptoService`'s existing style — no second crypto/HMAC library):
- `isConfigured(): boolean` — true iff `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are both set.
- `createOrder({ amountPaise, receipt, transfers }): Promise<{ id, amount }>` — thin call to `razorpay.orders.create(...)`.
- `createLinkedAccount({ email, phone, legalBusinessName, businessType }): Promise<{ id, status }>` — `razorpay.accounts.create(...)` (or the SDK's current equivalent — confirmed via Razorpay's docs that `email`, `phone`, `legal_business_name`, `business_type`, and a `profile` object are required; the exact `profile` sub-fields will be read off the SDK's own request typing at implementation time and adjusted against real sandbox error messages once keys exist, since that page wasn't fully available to fetch).
- `verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature): boolean` — HMAC-SHA256 over `${razorpayOrderId}|${razorpayPaymentId}` using the key secret, timing-safe compare.
- `verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean` — HMAC-SHA256 over the raw body using `RAZORPAY_WEBHOOK_SECRET`.

**`payments.service.ts`**:
- `getPublicConfig()` → `{ enabled: razorpayClient.isConfigured(), keyId: enabled ? env.RAZORPAY_KEY_ID : null }`.
- `createOrderForCheckout(order: Order, cookRazorpayAccountId: string)` → `platformFeePaise = Math.round(order.subtotalPaise * commissionPct / 100)` (`PLATFORM_COMMISSION_PCT` env, default `5`), `cookPayoutPaise = order.totalPaise - platformFeePaise`, calls `razorpayClient.createOrder` with `transfers: [{ account: cookRazorpayAccountId, amount: cookPayoutPaise, currency: 'INR', on_hold: false }]`; returns `{ razorpayOrderId, amountPaise, keyId, platformFeePaise, cookPayoutPaise }`.
- `verifyClientPayment(razorpayOrderId, razorpayPaymentId, signature)` / `verifyWebhookSignature(rawBody, signature)` — pass-throughs.
- `@OnEvent(VERIFICATION_APPROVED) async handleVerificationApproved(event: VerificationApprovedEvent)`:
  ```
  if (!razorpayClient.isConfigured()) return;
  try {
    const payoutDetails = crypto.decrypt(event.payoutDetailsEncrypted);
    const contact = await cooks.getOwnerContact(event.cookId);
    const account = await razorpayClient.createLinkedAccount({
      email: contact.email, phone: event.phone,
      legalBusinessName: contact.ownerName ?? contact.kitchenName ?? 'LOOM Kitchen',
      businessType: 'individual',
    });
    await verification.attachRazorpayAccount(event.verificationId, account.id, 'CREATED');
  } catch (err) {
    await verification.attachRazorpayAccount(event.verificationId, null, 'FAILED').catch(() => {});
    // log and swallow — a Razorpay failure must never surface as a failed cook approval
  }
  ```
  This is the first real caller of `CryptoService.decrypt` anywhere in the codebase (it's been write-only since Phase 1) — plaintext payout details exist only in this in-memory call, sent directly to Razorpay over HTTPS, never logged or persisted.

**`payments.controller.ts`**:
- `GET /payments/config` — public, `payments.getPublicConfig()`.
- `POST /payments/webhook` — public. Reads `req.rawBody` (see `main.ts` change below) + `x-razorpay-signature` header; 400s on bad/missing signature; otherwise parses the JSON body, switches on `event` (`payment.captured` / `payment.failed`), looks up the order by `razorpayOrderId`, flips `paymentStatus` if still `PENDING` (idempotent — already-`PAID`/`FAILED` orders are left alone so webhook retries are harmless), always returns `200` for anything past signature verification so Razorpay doesn't retry-storm on our own downstream issues.

**`dto/verify-payment.dto.ts`**: `razorpayPaymentId: string`, `razorpaySignature: string` (both `@IsString()`).

`PaymentsModule` imports `CooksModule` + `VerificationModule` (both already export the services needed, no new import cycle), exports `PaymentsService` for `OrdersModule`.

## `main.ts`
`NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })` — Express's default JSON body parser consumes the raw bytes before any controller sees them; Nest's `rawBody` option preserves `req.rawBody` alongside the parsed body specifically so a webhook handler can HMAC-verify the exact bytes Razorpay signed.

## Existing modules touched

- `verification.events.ts`: `VerificationApprovedEvent` gains `payoutMethod: 'UPI'|'BANK'`, `payoutDetailsEncrypted: Buffer`, `phone?: string`.
- `verification.service.ts`:
  - `approve()`: the emitted event now includes the three new fields, read directly off the already-loaded `record` — **no extra query**. This matters: `approve()` is sometimes called with a `manager` from inside `ModerationService`'s adminDB transaction, and `EventEmitter2.emit()` invokes listeners synchronously but doesn't await them — a listener that tried to re-`SELECT` the record by id afterward could run before the transaction commits and see nothing (or stale data) under read-committed isolation. Embedding the data sidesteps that race entirely instead of working around it.
  - `+ getRazorpayAccountForCook(cookId): Promise<string | null>` — mirrors `getStatusForCook`'s "latest record for this cook" lookup, returns `razorpayAccountId` (only meaningful when `razorpayAccountStatus === 'CREATED'`).
  - `+ attachRazorpayAccount(verificationId, accountId: string | null, status: 'CREATED'|'FAILED'): Promise<void>` — plain single-row `UPDATE`, no transaction (runs long after the original approval transaction already committed, so there's nothing to coordinate with).
- `cooks.service.ts`: `+ getOwnerContact(cookId): Promise<{ email: string; phone?: string; kitchenName?: string; ownerName?: string }>` — same-DB (`userDb`) join of `cook_profiles` → `users`, trivial, no cross-DB concerns since both tables live together.
- `cooks.controller.ts` / `dto/save-onboarding.dto.ts`: `+ phone?: string` on the same onboarding-save step as kitchen name/area (not the verification-submit step — it's profile/contact data, not verification data).
- `orders/dto/create-order.dto.ts`: `+ paymentMethod?: 'COD'|'ONLINE'` (`@IsOptional() @IsIn(['COD','ONLINE'])`), defaults to `'COD'` in the service when omitted.
- `orders.service.ts`'s `create()`:
  ```
  const method = dto.paymentMethod ?? 'COD';
  let razorpay: { orderId: string; amountPaise: number; keyId: string } | null = null;
  let platformFeePaise: number | undefined;
  let cookPayoutPaise: number | undefined;
  const orderId = randomUUID(); // generated up front so it can be the Razorpay receipt AND the row's own id

  if (method === 'ONLINE') {
    const accountId = await this.verification.getRazorpayAccountForCook(cookProfile.id);
    if (!accountId) throw new BadRequestException('Online payments are not set up for this kitchen yet');
    const result = await this.payments.createOrderForCheckout({ subtotalPaise, totalPaise }, accountId); // BEFORE opening the DB transaction — no external I/O inside a DB transaction
    razorpay = { orderId: result.razorpayOrderId, amountPaise: totalPaise, keyId: result.keyId };
    platformFeePaise = result.platformFeePaise;
    cookPayoutPaise = result.cookPayoutPaise;
  }

  return this.dataSource.transaction(async (manager) => {
    // ...existing item/order/event creation, but orderRepo.create({ id: orderId, paymentMethod: method,
    // paymentStatus: method === 'ONLINE' ? 'PENDING' : 'COD', razorpayOrderId: razorpay?.orderId,
    // platformFeePaise, cookPayoutPaise, ... })
  }).then((order) => (razorpay ? { ...order, razorpay } : order));
  ```
  `+ verifyPayment(userId, orderId, dto)`: loads the order, `resolvePerspective(order, userId)` must be `'CUSTOMER'` (reuses the existing method — no new ownership logic), asserts `paymentMethod === 'ONLINE'` and `paymentStatus === 'PENDING'`, calls `payments.verifyClientPayment(...)`; `true` → set `paymentStatus = 'PAID'`, `razorpayPaymentId`, save; `false` → throw `BadRequestException` (does **not** touch `paymentStatus` — see spec.md on why only the webhook may mark `FAILED`).
- `orders.controller.ts`: `+ POST orders/:id/verify-payment` (`@Roles('CUSTOMER','COOK')`, same ownership-not-role pattern as every other order route — the service enforces "must actually be the customer").
- `orders.module.ts`: imports `PaymentsModule`.

## Frontend

- `data/api-types.ts`: `ApiOrder.paymentStatus` becomes `'COD'|'PENDING'|'PAID'|'FAILED'` (was a loose `string`), `+ paymentMethod`, `+ razorpayOrderId?`; new `ApiRazorpayCheckout { orderId, amountPaise, keyId }`, `ApiCreateOrderResponse = ApiOrder & { razorpay?: ApiRazorpayCheckout }`; `ApiMyCookProfile`/onboarding-facing types gain `phone?`.
- `store/appStore.ts`:
  - `+ paymentsConfig: { enabled: boolean; keyId: string | null } | null`, `+ loadPaymentsConfig()` (called once, e.g. alongside catalog load).
  - `placeOrder(paymentMethod: 'COD' | 'ONLINE')`: same per-kitchen-group `POST /orders` loop as today, now sending `paymentMethod` in the body. For `'ONLINE'` responses (which include `razorpay`), dynamically inject `https://checkout.razorpay.com/v1/checkout.js` once (module-level guarded loader, not re-injected per call), then for each created order `new window.Razorpay({ key: razorpay.keyId, order_id: razorpay.orderId, amount: razorpay.amountPaise, handler: (resp) => apiFetch(`/orders/${order.id}/verify-payment`, { method:'POST', body: { razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature } }) }).open()`, awaited sequentially before moving to the next kitchen's order.
- `modals/CheckoutModal.tsx`: `PAYMENT_OPTIONS` becomes a real two-item choice (`'COD'`/`'ONLINE'` internally, "Cash on delivery"/"Pay online" as labels); the online option is disabled/hidden when `paymentsConfig?.enabled` is falsy; `submit()` now actually passes the selected method into `placeOrder(selected)` (today it's read into local state and never used — a real, if minor, existing bug this phase also fixes).
- `views/Orders.tsx`: render `order.paymentStatus` next to `order.status`.
- `views/SellerRegistration.tsx`: `+` a "Phone number" field in the same section as kitchen name/owner name/area, included in the `POST /cooks/onboarding` body.

## Verification steps
1. `cd backend && npm run build && npm test` — new `razorpay-client.service.spec.ts` (signature-verification math, `isConfigured()`), `payments.service.spec.ts` (commission math; the `VERIFICATION_APPROVED` listener's decrypt → create-linked-account → attach path, and its silent-failure path, both against a mocked `RazorpayClientService`), extended `orders.service.spec.ts` (COD path byte-for-byte unchanged; `ONLINE` 400s with no keys configured and with no linked account; `verifyPayment`'s signature-pass/fail branches).
2. `npm run migration:run:user` / `:admin` against the local PGlite dev/test instances.
3. `npm run test:e2e` — extend `ordering.e2e-spec.ts` (COD fully unaffected) and add coverage confirming `paymentMethod: 'ONLINE'` 400s cleanly in the test env (no keys there either) and the webhook 400s on a bad signature.
4. `cd frontend && npx tsc -b && npm run build && npm test` — extend `orders-flow.test.tsx`'s mocked-fetch pattern with a case selecting "Pay online" vs "Cash on delivery" in `CheckoutModal` and asserting the right `paymentMethod` reaches the mocked `POST /orders` call.
5. Manual pass with the running dev servers (no keys yet): confirm COD checkout is unchanged in the browser, confirm "Pay online" doesn't appear (or is disabled) since `GET /payments/config` reports `enabled: false`.
6. Deferred, once the user supplies real Razorpay test-mode keys: a genuine end-to-end pass — cook approval creates a real linked account, a customer completes a real test-mode card/UPI payment, the webhook fires and flips the order to `PAID`.
