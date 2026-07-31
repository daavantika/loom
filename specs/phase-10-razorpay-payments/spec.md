# Phase 10 Spec — Razorpay Payments (Online Checkout + Marketplace Split)

## Goal
Replace the hardcoded-COD-only order flow with a real online payment option (card, UPI, wallet, net banking via Razorpay's hosted checkout), plus an automatic marketplace split: 5% platform commission retained per online order, the remaining 95% transferred straight to the cook's own linked Razorpay account via Razorpay Route. COD stays exactly as it is today — untouched, fee-free — since cash never passes through a gateway we could split.

## New backend capability: online payments (`src/payments/`)

### `GET /payments/config`
Public. `{ enabled: boolean, keyId: string | null }` — lets the frontend know whether to offer "Pay online" at all. `enabled` is false whenever `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` aren't configured.

### `POST /orders` (extended)
Body gains optional `paymentMethod: 'COD' | 'ONLINE'` (default `'COD'` — fully backward compatible). For `ONLINE`:
- 400s cleanly if payments aren't configured, or if the target cook has no working Razorpay linked account yet.
- Otherwise creates a Razorpay order (5% of the order subtotal held back as platform commission, the other 95% set as a Route transfer to the cook's linked account) alongside the usual LOOM order row (`paymentStatus: 'PENDING'`), and returns `{ ...order, razorpay: { orderId, amountPaise, keyId } }`.

### `POST /orders/:id/verify-payment`
Customer-only (ownership-checked, same `resolvePerspective` pattern as the rest of `OrdersService`). Body `{ razorpayPaymentId, razorpaySignature }`. Verifies the signature and marks the order `PAID` on success. Never marks it `FAILED` — a bad signature here could just be a closed/interrupted checkout, not proof of an actual failure; the webhook is the only thing allowed to record `FAILED`.

### `POST /payments/webhook`
Public, Razorpay-signature-verified (HMAC over the raw request body), idempotent. The authority on payment state: `payment.captured` → `PAID`, `payment.failed` → `FAILED`. Always 200s so Razorpay doesn't retry-storm on our own downstream errors — only a bad signature is rejected outright.

## Enhanced flow: cook payout linkage

When admin approves a kitchen (`VERIFICATION_APPROVED` event — the same domain-event hook `ModerationModule` already uses, per `backend/CLAUDE.md`'s established pattern), a listener in the payments module automatically registers that cook as a Razorpay Route **linked account**, using their already-collected (and already-encrypted) payout details plus a new required `phone` field on their kitchen profile. This is best-effort and silent: if Razorpay isn't configured yet, or the call fails, the cook's approval is entirely unaffected — only their ability to receive online-order payouts is deferred until it's retried/fixed.

A linked account existing (`razorpay_account_status: 'CREATED'`) is **not** the same as being able to receive live money — Razorpay requires the account holder to complete Razorpay's own hosted KYC step before real payouts settle. That's on Razorpay and the cook, not something this app can automate or bypass.

## Frontend surfaces

- **`CheckoutModal`**: real "Cash on delivery" / "Pay online" choice (replacing the previous decorative selector whose value was never actually sent anywhere), online option hidden when `GET /payments/config` reports disabled.
- **Checkout with "Pay online"**: opens Razorpay's hosted Checkout.js modal per kitchen in the cart (sequential for multi-kitchen carts — one Razorpay popup per kitchen, matching the existing one-LOOM-order-per-kitchen model), then calls `POST /orders/:id/verify-payment` from the success handler.
- **`Orders.tsx`**: now surfaces `paymentStatus` next to order status (previously fetched but never shown).
- **`SellerRegistration.tsx`**: new phone-number field alongside kitchen name/owner name/area, needed for Razorpay linked-account creation.

## Business rules
- COD orders are completely unaffected by this phase — no commission, no Razorpay fields populated, unchanged transitions/behavior.
- The 5% commission comes out of the cook's payout, not an extra charge to the customer — the customer's total is identical to what COD would have charged for the same cart.
- One Razorpay order maps to exactly one LOOM order (one kitchen) — no batched multi-kitchen payment in this phase.
- Client-reported payment success is UX-only; only the signature-verified webhook can mark an order definitively `PAID` or `FAILED`.

## Acceptance criteria ("done")
1. With no Razorpay keys configured (the default until the user supplies them), COD checkout works exactly as it did before this phase, and "Pay online" is hidden/disabled in the UI.
2. A cook's kitchen approval still succeeds with zero Razorpay side effects when payments aren't configured — no error surfaces to the admin or the cook.
3. Once keys are configured (follow-up, out of scope for this implementation pass): a newly-approved cook gets a Razorpay linked account; a customer can pay online for that cook's food; the payment splits 95/5 automatically; the order flips to `PAID` via the webhook; the cook's dashboard reflects it.
4. `POST /orders` with `paymentMethod: 'ONLINE'` 400s cleanly (never 500s) whenever payments aren't configured or the specific cook has no linked account.
5. The webhook endpoint rejects any request with an invalid/missing signature and never trusts an unverified payload.
