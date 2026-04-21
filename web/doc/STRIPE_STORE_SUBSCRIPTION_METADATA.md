# Stripe store subscription prices

**Status:** Active

## Overview

Store admin subscription checkout uses **one Stripe Product** (`platformSettings.stripeProductId`) with multiple **Prices**. Each recurring price must be distinguishable by **billing interval** and **store tier** so the app can show Pro vs Multi and monthly vs yearly.

## Stripe `unit_amount` vs app internal minor (do not mix these up)

| Representation | Meaning | Example (TWD) | Example (USD) |
| ---------------- | ------- | --------------- | ------------- |
| **Stripe `unit_amount`** | Smallest unit **per Stripe’s rules** for Prices / PaymentIntents | `33000` = **NT$330** (1/100 major, like USD cents) | `30000` = **$300.00** (cents) |
| **Internal minor** | Major display amount × 100, used across the app and in serialized API payloads to the subscribe client | `33000` = NT$330 | `30000` = $300.00 |

**Zero-decimal currencies** (`jpy`, `krw`, … — **not** `twd`) are listed in `web/src/lib/payment/stripe/stripe-money.ts` (`STRIPE_ZERO_DECIMAL_CURRENCIES`). For those, Stripe `unit_amount` is **whole majors** (e.g. `330` = ¥330). **TWD** uses the same **×100** integer scale as USD in Stripe; `330` as TWD `unit_amount` is **NT$3.30** in the Dashboard, not NT$330.

**Code conventions**

- Helpers live in `web/src/lib/payment/stripe/stripe-money.ts`: `stripeUnitToInternalMinor`, `internalMinorToStripeUnit`, `formatInternalMinorForDisplay`, `formatStripeUnitAmountForDisplay`.
- Serialized subscription price slots (`SerializedSubscriptionPriceSlot` from `resolve-product-prices`) expose **`unitAmount` as internal minor** (after converting from Stripe with `stripeUnitToInternalMinor`). Store admin subscribe UI should format prices with **`formatInternalMinorForDisplay`** only — do not treat that field as raw Stripe `unit_amount` (scale differs: TWD/USD subunits vs JPY whole majors).
- **`web/bin/install.ts`** creates Stripe Prices: monthly env defaults are **Stripe units** (currency-aware). Yearly defaults use `DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT` / `DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT` in **internal minor** and must be converted with `internalMinorToStripeUnit` before calling Stripe.

### Multi-currency Prices (`currency_options`)

Checkout uses **`resolveStripePriceBillingUnit`** with the **store default currency**. If the Price has `currency_options` but **no row** for that currency, the app **does not** fall back to the Price’s default `currency` + `unit_amount` (that would bill e.g. USD $3.30 while the store expects TWD). Add the store’s currency in Stripe or change the store default currency to match the Price.

## Required Price metadata

On each Stripe Price used for store subscriptions, set:

| Metadata key   | Values        | Purpose                                      |
| -------------- | ------------- | -------------------------------------------- |
| `store_tier`   | `pro`, `multi` | Maps checkout to `StoreLevel` (Pro=2, Multi=3) |

Stripe’s own `recurring.interval` must be `month` or `year` for each price.

## Legacy behavior

If `metadata.store_tier` is missing, the price id may still match `platformSettings.stripePriceId`; that price is treated as **Pro monthly** so older deployments keep working until prices are tagged.

## Yearly savings copy

The subscribe page compares **12 × monthly** minor-unit amount to the **yearly** price for the same tier and shows an approximate savings percentage when yearly billing is selected.
