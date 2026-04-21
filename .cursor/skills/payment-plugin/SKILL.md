---
name: payment-plugin
description: >-
  riben.life dual-mode payment plugins — shop one-time checkout (PaymentMethodPlugin)
  vs platform store subscription billing (SubscriptionBillingPlugin). Covers
  StripePlugin, registries, create-payment-intent, confirm-payment, webhooks,
  stripeUnitAmount, and SubscriptionBillingNotSupportedError. Use when adding or
  changing payment flows, Stripe PI/subscription logic, payment method plugins,
  store admin subscribe, or payment webhook dispatch.
---

# Payment plugin (riben.life)

All paths below are under the repo root; the Next.js app lives in **`web/`**.

## Two modes

| Mode | Use case | Primary API |
|------|-----------|-------------|
| **One-time payoff** | Shop orders (`payUrl` → catalog plugin) | `PaymentMethodPlugin` — `processPayment`, shop `payment_intent.*` webhooks |
| **Subscription payoff** | Store admin platform subscription (Elements + Stripe Subscription) | `SubscriptionBillingPlugin` — checkout PI, PM attach, `subscriptions.create`, platform billing webhooks |

**`StripePlugin`** implements **both** interfaces. Other gateways (`linepay`, `paypal`, `credit`, `cash`) implement only `PaymentMethodPlugin` for shop; subscription billing stubs throw **`SubscriptionBillingNotSupportedError`**.

## Do not

- Add subscription methods to **`PaymentMethodPlugin`** — keep shop plugins minimal.
- Call `stripe.paymentIntents.create` from API routes for shared checkout — use the plugin/registry path (see below).
- Internal amounts use **`majorUnitsToStripeUnit`** / **`internalMinorToStripeUnit`** from `web/src/lib/payment/stripe/stripe-money.ts`.

### Stripe `unit_amount` vs internal minor (subscribe / install)

- **Stripe Price `unit_amount`**: For **USD** and **TWD** this is **1/100 of a major unit** (e.g. `33000` = NT$330, `30000` = $300). For **zero-decimal** currencies (`jpy`, `krw`, … — see `STRIPE_ZERO_DECIMAL_CURRENCIES` in `stripe-money.ts`, **excluding twd**), it is **whole major units** (`330` = ¥330).
- **App internal minor**: Integer **major × 100** everywhere in checkout/subscription state. `SerializedSubscriptionPriceSlot.unitAmount` from `resolve-product-prices` is **internal minor** (converted from Stripe via `stripeUnitToInternalMinor`).
- **Store admin subscribe UI**: Format with **`formatInternalMinorForDisplay`** only. Do not treat serialized `unitAmount` as Stripe units or run it through `formatStripeUnitAmountForDisplay` / `internalMinorToStripeUnit` for display — that causes wrong totals (mixing internal minor with Stripe integers or JPY whole-major rules).
- **`web/bin/install.ts`**: Env defaults for Stripe `prices.create` must be **Stripe units** (currency-aware). Constants `DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT` / `DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT` are **internal minor**; convert with **`internalMinorToStripeUnit`** before Stripe API calls.
- **Doc**: `web/doc/STRIPE_STORE_SUBSCRIPTION_METADATA.md`.

## Core files

| Concern | Location |
|---------|-----------|
| Shop plugin interface | `web/src/lib/payment/plugins/types.ts` — `PaymentMethodPlugin` |
| Subscription billing interface + DTOs | `web/src/lib/payment/plugins/subscription-billing-types.ts` — `SubscriptionBillingPlugin`, `CreateCheckoutPaymentIntentInput`, etc. |
| Not-supported error | `web/src/lib/payment/plugins/subscription-billing-error.ts` |
| Subscription billing registry | `web/src/lib/payment/plugins/subscription-gateway-registry.ts` — `getPlatformSubscriptionBillingGateway()`, `getSubscriptionBillingPlugin(id)` |
| Shop plugin registry | `web/src/lib/payment/plugins/registry.ts` — `getPaymentPlugin(payUrl)` |
| Stripe implementation | `web/src/lib/payment/plugins/stripe-plugin.ts` — singleton `stripePlugin` |
| Public exports | `web/src/lib/payment/plugins/index.ts` |
| Narrative docs | `web/src/lib/payment/plugins/README.md` |

## Registries (when to use which)

- **`getPaymentPlugin(identifier)`** — shop checkout by payment method row `payUrl` (`stripe`, `linepay`, …).
- **`getPlatformSubscriptionBillingGateway()`** — platform subscription **policy**; reads **`PLATFORM_SUBSCRIPTION_BILLING_GATEWAY`** (default `stripe`). Used e.g. in **`prepareStoreSubscription`** to reject non-Stripe subscription billing early.
- **`getSubscriptionBillingPlugin("stripe")`** — explicit **`stripe`** subscription-billing implementation (same object as `stripePlugin`). Used by **`POST /api/payment/stripe/create-payment-intent`** so shop Elements PI creation does **not** depend on `PLATFORM_SUBSCRIPTION_BILLING_GATEWAY`.

## Flows

### Shop order (one-time)

1. Resolve plugin: `getPaymentPlugin(order.PaymentMethod?.payUrl)`.
2. `processPayment` — Stripe path uses **`stripeUnitAmount(currency, Number(order.orderTotal))`** on the intent amount.
3. Webhooks: **`dispatchStripeWebhookEvent`** → shop events → **`stripePlugin.handleShopPaymentIntentWebhook`** → `stripe-shop-webhooks.ts`.

### Store admin subscription

1. **`prepareStoreSubscription`** — ensures DB rows + Stripe customer; calls **`getPlatformSubscriptionBillingGateway()`**; if gateway id ≠ `stripe`, throws **`SubscriptionBillingNotSupportedError`**.
2. Client **`POST /api/payment/stripe/create-payment-intent`** — validates session/customer, then **`getSubscriptionBillingPlugin("stripe").createCheckoutPaymentIntent(...)`**.
3. **`confirm-payment`** (action) — Prisma orchestration; Stripe via **`stripePlugin`**: `retrievePaymentIntent`, `resolveDefaultPaymentMethodForSubscription`, `createStoreBillingSubscription`.

### Platform Stripe webhooks

- **`web/src/lib/payment/stripe/handle-stripe-webhook.ts`** — platform event types → **`stripePlugin.handlePlatformBillingWebhook`** → **`handlePlatformStripeWebhookEvent`** in `web/src/lib/payment/stripe/platform-stripe-webhooks.ts`.

## Adding a new shop payment method

1. Implement **`PaymentMethodPlugin`** in `web/src/lib/payment/plugins/`.
2. **`registerPaymentPlugin`** in `web/src/lib/payment/plugins/index.ts`.
3. Add a **`UnsupportedSubscriptionBillingPlugin`-style** stub to **`subscription-gateway-registry.ts`** (or reuse pattern) so **`getSubscriptionBillingPlugin("yourid")`** exists if you need a keyed entry; platform subscription remains Stripe-only unless you implement real subscription billing.

## Adding subscription billing for a non-Stripe gateway

Out of current scope: stubs should keep throwing **`SubscriptionBillingNotSupportedError`** with a clear message until a full implementation exists.

## Claude Code

**`.claude/skills/payment-plugin`** is a symlink to **`.cursor/skills/payment-plugin`** so Claude Code and Cursor load the same guidance.
