# Cursor-style store subscription pricing (plan)

## UX (reference: [Cursor pricing](https://cursor.com/pricing))

- Billing toggle **Monthly | Yearly**; three cards **Free**, **Pro**, **Multi-store**; CTAs; yearly ~10% savings messaging vs monthly×12 where both prices exist.
- Resolve tiers from **Stripe Prices** under `platformSettings.stripeProductId` using `metadata.store_tier` (`pro` | `multi`) and `recurring.interval` (`month` | `year`).
- Backend: `prepareStoreSubscription` + subscribe API accept `stripePriceId`; `confirm-payment` sets `StoreLevel` from persisted target; optional `targetStoreLevel` on `SubscriptionPayment` (migration) or structured `note`.

*(Full implementation todos match prior plan: resolver util, prepare/API, confirm, subscribe UI, i18n, docs.)*

---

## Install script: sync Stripe + PayPal product / prices

### Current state

- [`web/bin/install.ts`](web/bin/install.ts): populates countries/currencies/locales; **`checkPlatformSettings`** only **retrieves** `stripeProductId` if set—**does not create** products or prices.
- PayPal in-app: [`web/src/lib/payment/paypal/`](web/src/lib/payment/paypal/) supports **Orders API** (checkout), not subscription catalog sync today.

### Goals

1. **Stripe (primary for store subscription checkout)**
   - Idempotent **sync** that ensures:
     - One **Product** (reuse existing `stripeProductId` if valid, else create and persist).
     - **Four recurring Prices** (Pro monthly, Pro yearly, Multi monthly, Multi yearly) with:
       - `recurring.interval` / `interval_count` as needed.
       - **Metadata** e.g. `store_tier=pro|multi` (and optionally `riben.life_sync=v1` for idempotency).
     - Currency/amounts from a **single source of truth** (see below).
   - After sync, **update `PlatformSettings`** (`stripeProductId`, and legacy `stripePriceId` if still used as fallback—e.g. default Pro monthly).
   - Safe re-run: lookup existing prices by metadata + product before creating duplicates.

2. **PayPal (parallel catalog for ops / future subscription-by-PayPal)**
   - Use PayPal **Products** + **Billing Plans** (Subscriptions API) REST endpoints with existing OAuth ([`getPayPalAccessToken`](web/src/lib/payment/paypal/paypal-oauth.ts) pattern).
   - Create or update plans mirroring the same four logical tiers/intervals; persist **PayPal plan IDs** (e.g. in `platformSettings.settings` JSON or dedicated optional columns) so admin and future UI can reference them.
   - **Note:** Today store subscription payment flow is Stripe-centric; PayPal sync is **catalog alignment** unless product later adds PayPal subscription checkout. Document that clearly.

### Source of truth for amounts

- **Preferred:** small JSON fixture under `web/public/install/` or `web/bin/data/` (e.g. `subscription-catalog.json`) defining currency, monthly major-unit amounts for Pro/Multi, and **yearly rule** (explicit yearly price **or** computed with ~10% discount from monthly×12—match product decision).
- Install/sync script reads fixture → creates/updates Stripe Prices and PayPal plans accordingly.

### CLI surface

- **Option A:** extend [`install.ts`](web/bin/install.ts) with flags, e.g. `--sync-billing`, `--sync-billing-only` (skip locale/country seeding).
- **Option B:** new script [`web/bin/sync-billing-catalog.ts`](web/bin/sync-billing-catalog.ts) and npm/bun script `install:sync-billing` for CI and local ops.

Recommend **Option B** for clarity + `--check` mode that prints current Stripe/PayPal IDs without mutating.

### Env / secrets

- Stripe: existing `STRIPE_SECRET_KEY` (already used by `install.ts` stripe import).
- PayPal: platform credentials already expected for OAuth (`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` or store-specific vars per [`getPayPalCredentialsByStore`](web/src/lib/payment/paypal/get-paypal-credentials-by-store.ts)); document which env the sync script uses (platform-only recommended for catalog).

### Documentation

- Short section in [`web/doc/`](web/doc/) (one topic): required Stripe metadata, fixture format, PayPal plan mapping, and how to run `bun run bin/sync-billing-catalog.ts`.

### Additional todos (install track)

- Add `sync-billing-catalog` script + fixture for tier amounts and currency.
- Implement Stripe product/price upsert + PlatformSettings update.
- Implement PayPal product + billing plan upsert + persist plan IDs.
- Wire `install --check` (or sync `--check`) to print Stripe + PayPal catalog status.
- Update root [`web/bin/install.ts`](web/bin/install.ts) header comment and optional post-install hint to run billing sync when Stripe/PayPal keys are present.

---

## Execution order suggestion

1. Fixture + Stripe sync + DB persistence (unblocks pricing UI).
2. PayPal catalog sync (can follow in same PR or immediately after).
3. Subscribe page UI + `prepare`/`confirm` changes from main plan.
