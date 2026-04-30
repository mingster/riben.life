# Plan: Service Staff Products (Hour-Block Purchases)

**Status:** Planned
**Related:** [TODO-RSVP-REVIEW-unfinished-logic.md](../TODO-RSVP-REVIEW-unfinished-logic.md) §1

## Approach

Reuse the existing credit system. When a customer purchases a service package product (e.g., "Tennis Lesson 10 classes"), the paid amount is credited to their `CustomerCredit` account. They then pay for individual RSVPs using that balance.

No new ledger models or hour-tracking logic needed. The credit top-up purchase flow (`isCreditTopUp = true` on `ProductAttribute`) and credit payment at checkout (`credit-plugin.ts`, `deduce-customer-credit.ts`) already handle both sides.

---

## What Already Exists

- `CustomerCredit` — per-user balance per store
- `CustomerCreditLedger` — transaction history
- `ProductAttribute.isCreditTopUp` — marks a product as a credit top-up; purchase credits the buyer's account
- `credit-plugin.ts` — payment plugin for paying with account balance
- `deduce-customer-credit.ts` — deducts credit when RSVP is confirmed
- `refill-credit-points` / `refill-account-balance` storefront pages — customer-facing credit purchase UI
- Admin product form already supports `isCreditTopUp`

---

## What Is Missing

### Phase 1: Admin — Create Service Package Products

Admin already can create a product with `isCreditTopUp = true`. The only gap is discoverability and convention.

1. Confirm that creating a product with `isCreditTopUp = true` and a price (e.g., 5000 TWD) correctly credits the customer after payment. Trace the webhook/confirm-order path.
2. If the credit-on-purchase path is already wired, no schema or action changes are needed.
3. Document the convention: service package products use `isCreditTopUp = true`, no shipping, stock = unlimited.

**Verify:** Admin creates "Tennis Lesson 10 classes" product (price 5000, `isCreditTopUp = true`). Customer purchases it. `CustomerCredit.point` increases by 5000.

### Phase 2: Storefront — Surface Service Package Products

Currently `refill-account-balance` is a generic top-up page. Service package products may not be visible there.

1. Check whether `isCreditTopUp` products appear in the storefront product listing or the refill page.
2. If not, add them to `s/[storeId]/refill-account-balance` (or a new `staff-packages` page) so customers can find and purchase them.

**Verify:** Customer navigates to the store and can find and purchase a service package.

### Phase 3: RSVP — Credit Payment

1. Confirm that the credit payment option is available when a customer creates a reservation (slot picker / checkout step).
2. Confirm that `deduce-customer-credit.ts` is called correctly and the balance decreases after RSVP confirmation.
3. Confirm cancellation restores the credit (check `process-rsvp-refund-credit-point.ts`).

**Verify:** Customer with 5000 credit balance creates a 500 TWD reservation using credit. Balance becomes 4500. Cancel restores to 5000.

---

## Out of Scope

- Linking a product to a specific service staff member (not needed; balance is store-wide)
- Hour tracking (replaced by money balance)
- Import parser integration (can be a follow-up if needed)

---

## TODO Checklist

### Phase 1: Admin + Credit Top-Up Wiring

- [x] Trace credit-on-purchase flow end-to-end for `isCreditTopUp = true` products.
  - [x] Confirm webhook / order-confirm path that updates `CustomerCredit`.
    - `mark-order-as-paid` -> `isCreditRefillOrder` -> `processCreditTopUpAfterPaymentAction`
  - [x] Confirm expected `CustomerCreditLedger` entries are created.
    - `processCreditTopUpAfterPaymentAction` calls `processCreditTopUp` which writes `CustomerCreditLedger`.
- [x] Validate admin convention for service package products.
  - [x] `isCreditTopUp = true`
  - [x] No shipping required (operational convention)
  - [x] Stock treated as unlimited for package products (operational convention)
- [x] Run verification scenario:
  - [x] Create test product: "Tennis Lesson 10 classes" (price 5000, `isCreditTopUp = true`)
  - [x] Purchase as customer
  - [x] Verify `CustomerCredit.point` increases by 5000

### Phase 1 Implementation Notes (Completed)

- Updated order-type detection so credit processing is not limited to the special system product.
- `isCreditRefillOrder` now returns true when any `OrderItemView.productId` has `ProductAttribute.isCreditTopUp = true`.
- This enables normal admin-created service package products (with `isCreditTopUp = true`) to credit customer balance after payment confirmation.

### Phase 2: Storefront Discoverability

- [ ] Audit storefront visibility for `isCreditTopUp` products.
  - [ ] Check normal storefront product listing visibility
  - [ ] Check `s/[storeId]/refill-account-balance` visibility
- [ ] Implement discoverability if missing.
  - [ ] Option A: surface in `refill-account-balance`
  - [ ] Option B: add dedicated `staff-packages` page
- [ ] Run verification scenario:
  - [ ] Customer can find service package product
  - [ ] Customer can complete purchase flow successfully

### Phase 3: RSVP Credit Spend + Refund

- [ ] Confirm credit payment option appears in RSVP checkout flow.
- [ ] Confirm deduction logic runs on reservation confirm.
  - [ ] Verify `deduce-customer-credit.ts` invocation and amount
- [ ] Confirm cancellation refund logic.
  - [ ] Verify `process-rsvp-refund-credit-point.ts` restores balance
  - [ ] Verify no duplicate refund on repeated cancellation attempts
- [ ] Run verification scenario:
  - [ ] Start with balance 5000
  - [ ] Make RSVP payment of 500 with credit -> balance 4500
  - [ ] Cancel reservation -> balance restored to 5000

### Documentation + Operational Notes

- [ ] Add admin/operator guideline for creating service package products.
- [ ] Add customer-facing note for where to buy and use service package credit.
- [ ] Record known limitation: balance is store-wide (not tied to a specific staff member).
