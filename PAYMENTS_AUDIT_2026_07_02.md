# Payments & Billing Security Audit — V Welfare (PR #30 code)
**Date:** 2026-07-02
**Scope:** Stripe webhook, checkout session creation, promo codes, payment RLS, admin payment endpoints.
**Method:** Source + migration review of the merged PR #30 payment system. Fixes applied and build-verified.

---

## Findings & dispositions

| # | Severity | Component | Finding | Status |
|---|---|---|---|---|
| PAY-1 | **Critical** | `api/checkout/create-session` | **Client-controlled price.** The charge `amount` was taken from the request body and persisted as the amount to charge, with no server-side price lookup. A user could POST `amount: 0.01` for the `professional` tier; the webhook then grants `access_level: 'full'`. The promo `discount_value` was fetched but never applied. | **FIXED** |
| PAY-2 | **High (functional)** | `api/checkout/create-session` | **Checkout broken by RLS.** `payments` has RLS enabled with SELECT-only policies (no INSERT), and `promo_codes` is superadmin-only, but the route used the user-scoped client — so the payment insert and promo lookup are denied by RLS and checkout returns 500. | **FIXED** |
| PAY-3 | **High** | `api/webhooks/stripe` | **Non-atomic idempotency.** The handler read `stripe_webhook_events`, processed, then inserted. Concurrent redeliveries of the same event could both pass the read-check and both fulfil the order (double `package_purchase`, double promo increment). | **FIXED** |
| PAY-4 | Medium | promo `max_uses` | Cap is checked at checkout creation but incremented only at webhook fulfilment, so under concurrency the cap can be modestly exceeded. The increment itself is atomic (single `UPDATE … +1`), so the counter never corrupts — only the ceiling can be overshot. | **Accepted** (bounded business-loss, not a security issue) — documented for a future checkout-time reservation if tighter caps are needed. |
| PAY-5 | ✅ Pass | `lib/stripe/webhook.ts` | Signature verification is correct: HMAC-SHA256 over `${t}.${body}`, constant-time compare (`timingSafeEqual` with length guard), 300s timestamp tolerance for replay protection. Node runtime + raw body + `force-dynamic`. | No change |
| PAY-6 | ✅ Pass | payment RLS | `payments` / `package_purchases` are RLS-locked to `user_id = auth.uid()` (own, read-only) + superadmin read; `stripe_products/prices` superadmin-only; `promo_code_usage` own-read; `increment_promo_code_usage` pinned `search_path` + `service_role`-only execute. | No change |
| PAY-7 | ✅ Pass | admin payment/revenue endpoints | `/api/admin/payments`, `/stats`, `/revenue`, and all `/api/admin/promo-codes` verbs enforce `requireAdmin()` with role checks (promo mutations are superadmin-only) and audit-log. | No change |

---

## Fixes applied

### PAY-1 — server-authoritative pricing
`api/checkout/create-session/route.ts`:
- Added `TIER_PRICES_USD` (basic 9.99 / standard 24.99 / professional 49.99) — the client `amount` is now ignored.
- Added `applyDiscount()` computing the final price server-side from the validated promo (`percentage` / `fixed_amount` / `free`), clamped to ≥ 0.
- Stored amount is the server-computed value; metadata records `basePrice` + `finalAmount`.

### PAY-2 — correct client for RLS-locked writes
- The route now uses the **service-role client** for the promo lookup and the payment insert (auth is still verified on the user client first; amount is server-computed). This is the correct pattern — users must *not* have INSERT rights on `payments`, so loosening RLS would have been the wrong fix.

### PAY-3 — atomic claim-first idempotency
`api/webhooks/stripe/route.ts`:
- Insert the `stripe_webhook_events` row **first** (the `stripe_event_id UNIQUE` constraint is the atomic dedup point). Unique-violation (`23505`) → acknowledged duplicate.
- On processing failure, the claim is deleted so Stripe's retry reprocesses — preserving transient-failure retries while making concurrent duplicates safe.

---

## Verification
- `npx tsc --noEmit` → 0 errors.
- `next build` → compiles successfully; both routes build.
- `next lint` → 0 warnings.
- Note: Stripe is still mocked in `create-session` (no live keys). When live keys are wired, the real `PaymentIntent` amount must be created from the **server-computed** `amountCents`, never a client value — the fix keeps that value authoritative.

## Residual / follow-up
- PAY-4 promo cap tightening (checkout-time reservation) if strict caps are required.
- Live Stripe integration + end-to-end test with real signed events before taking real transactions.
