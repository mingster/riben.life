# Store admin subscription (subscribe route)

Business logic and status for the store operator subscription checkout flow (platform billing via Stripe).

## Routes and files

| Piece | Path |
|--------|------|
| Subscribe page (RSC) | `page.tsx` |
| Client UI + Stripe | `components/store-subscribe-client.tsx` |
| Prepare checkout | `POST /api/storeAdmin/[storeId]/subscribe` → `@/lib/subscription/prepare-store-subscription` |
| Subscription + Elements (current) | `POST /api/payment/stripe/create-store-subscription-checkout` — `subscriptions.create` with `payment_behavior: default_incomplete`, returns the **first invoice** `client_secret`. **Idempotency:** `subpay-{subscriptionPaymentId}-first` while the row has no `pending_stripe_subscription_id` (parallel mounts share one Stripe object); after that, `subpay-{id}-g{n}` when creating a replacement. Reuse path for an existing **incomplete** subscription uses `checkoutAttributes`. |
| Legacy standalone PI | `POST /api/payment/stripe/create-payment-intent` (older flow; still supported in **confirm** for PIs with **no** invoice) |
| After Stripe redirect | `stripe/confirmed/page.tsx` → `@/actions/storeAdmin/subscription/stripe/confirm-payment` |
| Switch to free | `POST /api/storeAdmin/[storeId]/unsubscribe` |

## Domain: store level vs “current plan” in the UI

**Persisted tier** is `Store.level` (`StoreLevel` in `@/types/enum`):

- `Free` = 1
- `Pro` = 2
- `Multi` = 3

**What the subscribe page treats as “current plan”** combines level and expiration (`store-subscribe-client.tsx` → `currentPlanKey`). The UI shows **Free** unless **both** are true:

1. `storeLevel` is Pro or Multi, and
2. `subscriptionExpirationMs` (from `StoreSubscription.expiration`) is **in the future**.

If expiration is past or missing while level is still Pro/Multi, the UI shows **Free** as current until data is consistent again.

## `StoreSubscription` status (`SubscriptionStatus`)

| Value | Meaning in this flow |
|--------|----------------------|
| `Inactive` (0) | Set in **prepare** when the user starts checkout (row upserted before payment succeeds). |
| `Active` (1) | Set in **confirm** after a successful PaymentIntent (and best-effort Stripe subscription creation). |
| `Cancelled` (20) | Set in **unsubscribe** when moving to Free (Stripe schedule/subscription cancelled when `subscriptionId` exists). |

`billingProvider` is set to `"stripe"` on prepare. `subscriptionId` holds the Stripe subscription identifier after successful confirmation (used again on unsubscribe).

## Page load (`page.tsx`)

1. **Auth**: no session → redirect to sign-in with `callbackUrl` back to subscribe.
2. **Authorization**: `checkStoreStaffAccess(storeId)`.
3. **Platform product**: `platformSettings.stripeProductId` must be non-empty; otherwise an error card (missing product config).
4. **Stripe prices**: list active prices for that product; `groupSubscriptionPrices` buckets them by `metadata.store_tier` (`pro` \| `multi`) and recurring interval (`month` \| `year`). Legacy `platformSettings.stripePriceId` can fill **Pro monthly** when metadata is missing.
5. **Data passed to client**: serialized grouped prices, `store.level`, `storeSubscription.expiration` (ms), optional Stripe product name.

## Client (`store-subscribe-client.tsx`)

- **Money / display**: Grouped prices use **`SerializedSubscriptionPriceSlot.unitAmount` in internal minor** (major×100), not raw Stripe `unit_amount`. Format with **`formatInternalMinorForDisplay`** only. Do not pass those values through `internalMinorToStripeUnit` or `formatStripeUnitAmountForDisplay` for display — that double-converts and causes wrong amounts (especially confusing internal minor with Stripe units or JPY-style whole majors). See `web/doc/STRIPE_STORE_SUBSCRIPTION_METADATA.md`.
- **Billing period**: `month` vs `year` toggles which Stripe price id is used for checkout.
- **Yearly without a real yearly Stripe price**: UI may show an **estimated** annual total (defaults in `@/lib/subscription/resolve-product-prices`), but **`checkout` is undefined** → subscribe button shows “yearly not configured” / unavailable; **no** POST to prepare.
- **Subscribe**: `POST .../subscribe` with `{ stripePriceId }`. On success, mounts checkout with `subscriptionPaymentId`, amount, currency, etc.
- **Payment**: `POST /api/payment/stripe/create-store-subscription-checkout` with `{ storeId, subscriptionPaymentId }` (in-flight dedupe per payment id). Stripe Elements receives the **invoice** client secret — **one** `confirmPayment` pays the first invoice and activates the subscription (aligned with [Stripe: Build subscriptions with Elements](https://docs.stripe.com/payments/advanced/build-subscriptions)).
- **Free**: confirm dialog → `POST .../unsubscribe` → toast, navigate to store dashboard.

## Prepare (`prepareStoreSubscription`)

1. **Gateway**: must be Stripe (`SubscriptionBillingNotSupportedError` otherwise).
2. **User → Stripe customer**: load user; if `stripeCustomerId` missing or deleted, create Stripe customer and save on user.
3. **`StoreSubscription` upsert**: `status: Inactive`, `billingProvider: "stripe"`. **`expiration` is not reset on prepare** — it stays as-is until confirm or webhooks extend it (avoids wiping a valid period during checkout).
4. **Price validation**: price must belong to `platformSettings.stripeProductId`, or match legacy `stripePriceId` when product id is not set.
5. **Tier**: `resolveTierForSubscriptionPrice` → `targetStoreLevel` from `metadata.store_tier` / legacy Pro price.
6. **`SubscriptionPayment`**: find latest **unpaid** row for this store + user; **reuse** only if amount, currency, `targetStoreLevel`, and `stripePriceId` match; else **create** a new unpaid row.
7. Response includes `subscriptionPayment`, `stripeCustomerId`, `amount` (major units), `currency`, `interval`, `productName`, `targetStoreLevel`.

## Confirmation (`confirm-payment.ts` + `stripe/confirmed/page.tsx`)

**Confirmed page branches:**

1. No `subscriptionPaymentId` → invalid state UI.
2. Payment row missing or wrong `storeId` → `notFound()`.
3. `isPaid` → success card.
4. `redirect_status === "failed"` → failure UI.
5. `redirect_status === "succeeded"` with `payment_intent` + client secret → run `confirmSubscriptionPayment`.
6. Otherwise → loading spinner (e.g. intermediate redirect state).

**On successful PaymentIntent:**

- Idempotent: if already `isPaid`, return true.
- Verify PI status `succeeded`.
- **Invoice-linked PI (current checkout)**: retrieve the PI with `expand: ['invoice','invoice.subscription']`, resolve the Stripe **Subscription** from the invoice (or, if needed, list invoices on `pending_stripe_subscription_id` until `payment_intent` matches). **Do not** call `createStoreBillingSubscription`. If `pending_stripe_subscription_id` is set but resolution still fails, the action **throws** instead of creating a second subscription (avoids double charge). Expect `active` or `trialing`; then update DB from that subscription’s period end.
- **Legacy standalone PI** (no subscription invoice): resolve default payment method; **if missing**, still marks payment paid, sets store `level`, extends expiration with interval fallback, but **skips** creating the Stripe subscription (logged; manual follow-up).
- **Legacy happy path**: `createStoreBillingSubscription` (`subscriptions.create` with `trial_end: now`), then same DB updates as invoice path.

## Platform Stripe webhooks (`platform-stripe-webhooks.ts`)

For subscriptions with `metadata.store_id` (store billing), `syncPlatformStoreSubscriptionFromStripe` **ignores** non-terminal updates while status is not **`active`** or **`trialing`** (e.g. `incomplete` during `default_incomplete` checkout). After the first invoice is paid, Stripe moves the subscription to `active` and webhooks can sync period end and entitlement.

## Unsubscribe (Free)

1. If `storeSubscription.subscriptionId` exists, treat it as a **subscription schedule** id: retrieve schedule, cancel schedule, cancel nested subscription if present.
2. Update `StoreSubscription`: `subscriptionId: null`, `status: Cancelled`, note with user id.
3. Set `store.level` to **Free**.

## Status cheat sheet

| User-visible state | Driven by |
|--------------------|-----------|
| “Current plan: Free” | UI: not (Pro/Multi with future expiration). DB may still show old level until unsubscribe or successful upgrade. |
| Checkout prepared, not paid | `SubscriptionPayment.isPaid = false`, `StoreSubscription` typically **Inactive**. |
| Paid / entitled | `SubscriptionPayment.isPaid`, `Store.level` = Pro/Multi, `StoreSubscription.status` **Active**, `expiration` extended. |
| Cancelled / Free | `Store.level` = Free, `StoreSubscription` **Cancelled**, Stripe schedule cancelled when applicable. |
