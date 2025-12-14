# Functional Requirements: Customer Credit System

**Date:** 2025-01-27
**Status:** Active
**Version:** 1.0

**Related Documents:**

- [Design: Customer Credit System](./DESIGN-CUSTOMER-CREDIT.md)
- [RSVP Functional Requirements](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)

---

## 1. Overview

The Customer Credit system enables customers to pre-purchase credit points that can be used for future purchases at a store. The system supports customer recharges, store operator recharges, bonus credit awards, credit usage for purchases, refunds, manual adjustments, and comprehensive transaction history tracking. The system integrates with the order management system and follows proper accounting standards for unearned revenue tracking.

**Key Features:**

- Customer self-service credit recharge through public interface
- Store operator manual credit recharge (paid and promotional)
- Automatic bonus credit calculation based on configurable rules
- Credit usage for purchases and orders
- Credit refunds for cancelled orders
- Manual credit adjustments by store operators
- Complete transaction history and audit trail
- Store-specific credit balances
- Credit expiration management
- Integration with StoreLedger for proper accounting

---

## 2. System Actors

### 2.1 Customer

- Registered users with accounts
- Can recharge credit through public interface
- Can use credit for purchases
- Can view credit balance and transaction history
- Must be authenticated for credit operations

### 2.2 Store Admin

- Store owners
- Full administrative access to credit system configuration
- Can manage credit bonus rules
- Can manually recharge customer credit
- Can adjust customer credit balances
- Can view all customer credit transactions

### 2.3 Store Staff

- Store employees with operational permissions
- Can manually recharge customer credit (paid and promotional)
- Can view customer credit balances and history
- Limited access to settings (as configured by Store Admin)

### 2.4 System Admin

- Platform administrators

---

## 2.5 Access Control Summary

### Store Staff Permissions (Operational Access)

Store Staff can:

- View customer credit balances
- View customer credit transaction history
- Manually recharge customer credit (paid and promotional)
- View credit bonus rules (but not create/manage)

Store Staff cannot:

- Configure credit system settings
- Create/manage credit bonus rules
- Adjust customer credit (manual adjustments)
- View credit analytics and reports

### Store Admin Permissions (Full Administrative Access)

Store Admins have all Store Staff permissions, plus:

- Configure all credit system settings
- Create and manage credit bonus rules
- Adjust customer credit balances
- View credit analytics and reports
- Configure Store Staff access permissions

---

## 3. Core Functional Requirements

### 3.1 Credit System Configuration

#### 3.1.1 Basic Settings

**FR-CREDIT-001:** Store admins must be able to enable/disable customer credit system:

- Toggle `useCustomerCredit` to turn system on/off
- When disabled, customers cannot recharge or use credit
- Existing credit balances remain accessible

**FR-CREDIT-002:** Store admins must be able to configure credit exchange rates:

- `creditExchangeRate`: 1 credit point = X dollars (e.g., 1 point = $1.00)
- `creditServiceExchangeRate`: 1 credit point = X minutes of service (optional, for service-based businesses)
- Exchange rates are used for display and conversion purposes

**FR-CREDIT-003:** Store admins must be able to configure purchase limits:

- `creditMinPurchase`: Minimum credit amount per recharge (default: 0)
- `creditMaxPurchase`: Maximum credit amount per recharge (default: 0, unlimited)
- Limits apply only to customer self-service recharges
- Store operator recharges are not subject to these limits

**FR-CREDIT-004:** Store admins must be able to configure credit expiration:

- `creditExpiration`: Number of days before credit expires (default: 365)
- Credit expiration is calculated from recharge date
- Expired credit cannot be used for purchases
- System should warn customers about expiring credit

#### 3.1.2 Credit Bonus Rules

**FR-CREDIT-005:** Store admins must be able to create and manage credit bonus rules:

- Create bonus rules with threshold and bonus amount
- Enable/disable bonus rules (`isActive` flag)
- Edit existing bonus rules
- Delete bonus rules
- View all bonus rules for the store

**FR-CREDIT-006:** Bonus rules must support threshold-based awards:

- `threshold`: Minimum top-up amount to trigger bonus
- `bonus`: Bonus credit amount awarded
- System selects highest matching rule when multiple rules apply
- Bonus is calculated automatically during recharge

**FR-CREDIT-007:** Bonus rules must be evaluated in order of threshold (highest first):

- When multiple rules match, the highest threshold rule is applied
- Only one bonus rule applies per recharge
- Bonus is added to the recharge amount

---

### 3.2 Customer Credit Recharge

#### 3.2.1 Customer Self-Service Recharge

**FR-CREDIT-008:** Customers must be able to recharge credit through the store's public interface:

- Navigate to store's credit recharge page (`/{storeId}/recharge`)
- Must be authenticated (logged in)
- Select recharge amount within configured limits
- Complete payment through standard payment methods (Stripe, LINE Pay, etc.)

**FR-CREDIT-009:** Customer recharge flow must follow these steps:

1. Customer selects recharge amount
2. System validates amount against `creditMinPurchase` and `creditMaxPurchase`
3. System creates `StoreOrder` for the recharge amount
4. Customer completes payment through payment gateway
5. Upon successful payment:
   - System calculates bonus (if applicable)
   - System updates `CustomerCredit` balance
   - System creates `CustomerCreditLedger` entries:
     - One `TOPUP` entry for the paid amount
     - One `BONUS` entry if bonus is awarded
   - System creates `StoreLedger` entry (type = 2, unearned revenue)
   - System links ledger entries to `StoreOrder` via `referenceId`

**FR-CREDIT-010:** Customer recharge must validate:

- Customer is authenticated
- Store has `useCustomerCredit` enabled
- Recharge amount is within min/max limits
- Payment is successfully processed
- Order is created and marked as paid

**FR-CREDIT-011:** Customer recharge must support standard payment methods:

- Stripe payment processing
- LINE Pay payment processing
- Other configured payment methods
- Payment webhook handling for confirmation

#### 3.2.2 Store Operator Recharge

**FR-CREDIT-012:** Store staff and Store admins must be able to manually recharge customer credit:

- Navigate to customer management page
- Select customer
- Enter recharge amount and optional note
- Choose recharge type: paid (in-person) or promotional (no payment)

**FR-CREDIT-013:** Store operator recharge must support two scenarios:

**Scenario A: Paid Recharge (In-Person Payment)**

- Customer pays cash in person
- Store operator enters:
  - Credit amount to give
  - Cash amount received
  - Optional note
- System creates `StoreOrder` for cash payment (marked as paid)
- System calculates bonus (if applicable)
- System updates `CustomerCredit` balance
- System creates `CustomerCreditLedger` entries (TOPUP and BONUS if applicable)
- System creates `StoreLedger` entry with cash amount (type = 2, unearned revenue)
- All entries linked to `StoreOrder` via `referenceId`

**Scenario B: Promotional Recharge (No Payment)**

- Store operator gives credit as gift/promotion
- Store operator enters:
  - Credit amount to give
  - Optional note
- System calculates bonus (if applicable)
- System updates `CustomerCredit` balance
- System creates `CustomerCreditLedger` entries (TOPUP and BONUS if applicable)
- System creates `StoreLedger` entry with `amount = 0` (audit trail, no revenue impact)
- No `StoreOrder` is created
- Ledger entries have `referenceId: null`

**FR-CREDIT-014:** Store operator recharge must track creator:

- `creatorId` field records the store operator's userId
- Creator information stored in `CustomerCreditLedger` entries
- Creator information stored in `StoreLedger` entries (in note field)

---

### 3.3 Credit Usage

#### 3.3.1 Credit Usage for Purchases

**FR-CREDIT-015:** Customers must be able to use credit for purchases:

- Select "Use Credit" as payment method during checkout
- System validates credit balance is sufficient
- System calculates amount to deduct from credit
- System processes payment using credit

**FR-CREDIT-016:** Credit usage flow must follow these steps:

1. Customer selects "Use Credit" payment method
2. System validates:
   - Customer has sufficient credit balance
   - Credit is not expired (if expiration is configured)
   - Store has `useCustomerCredit` enabled
3. System creates `StoreOrder` with payment status
4. System deducts credit from `CustomerCredit` balance
5. System creates `CustomerCreditLedger` entry:
   - Type: `SPEND`
   - Amount: negative (debit)
   - `referenceId`: order ID
6. System creates `StoreLedger` entry (type = 3, revenue recognition)

**FR-CREDIT-017:** Credit usage must support partial credit usage:

- Customer can use credit for part of order total
- Remaining balance paid through other payment methods
- System tracks credit amount used vs. total order amount

**FR-CREDIT-018:** Credit usage must prevent insufficient balance:

- System must check balance before allowing credit usage
- Display error message if balance is insufficient
- Prevent order creation if credit validation fails

#### 3.3.2 Credit Usage for RSVP Prepaid

**FR-CREDIT-019:** Credit can be used for RSVP prepaid reservations:

- When `prepaidRequired` is true in RSVP settings
- Customer can use credit to pay `minPrepaidAmount`
- Credit is deducted when the `alreadyPaid` flag is set to `true` on the reservation
- Reservation is linked to order via `orderId`
- Credit usage follows same flow as regular purchase

---

### 3.4 Credit Refund

#### 3.4.1 Order Refund

**FR-CREDIT-020:** Store operators must be able to refund credit for cancelled orders:

- Initiate refund for order that was paid with credit
- System calculates refund amount
- System updates `CustomerCredit` balance
- System creates `CustomerCreditLedger` entry:
  - Type: `REFUND`
  - Amount: positive (credit)
  - `referenceId`: original order ID
  - `note`: refund reason
- System creates `StoreLedger` entry (type = 3, negative amount, revenue reversal)

**FR-CREDIT-021:** Credit refund must support:

- Full refund (entire order amount)
- Partial refund (portion of order amount)
- Refund reason tracking
- Creator tracking (store operator who processed refund)

---

### 3.5 Manual Credit Adjustment

#### 3.5.1 Credit Adjustment

**FR-CREDIT-022:** Store admins must be able to manually adjust customer credit:

- Navigate to customer credit management
- Select "Adjust Credit" option
- Enter adjustment amount (positive or negative)
- Provide required adjustment reason
- System validates adjustment
- System updates `CustomerCredit` balance
- System creates `CustomerCreditLedger` entry:
  - Type: `ADJUSTMENT`
  - Amount: adjustment amount (positive or negative)
  - `creatorId`: store admin's userId
  - `note`: adjustment reason (required)

**FR-CREDIT-023:** Credit adjustment must require:

- Store admin access (Store Staff cannot adjust)
- Adjustment reason (mandatory field)
- Validation of adjustment amount
- Creator tracking

**FR-CREDIT-024:** Credit adjustment must support:

- Positive adjustments (add credit)
- Negative adjustments (remove credit)
- Negative balance (if adjustment results in negative)
- Audit trail with reason and creator

---

### 3.6 Credit Ledger and History

#### 3.6.1 Customer Credit Ledger View

**FR-CREDIT-025:** Customers must be able to view their credit transaction history:

- Navigate to account page (`/account/`)
- Select "Credit" or "Credit History" tab
- View credit balances per store
- View transaction history with:
  - Transaction type (TOPUP, BONUS, SPEND, REFUND, ADJUSTMENT)
  - Amount (positive for credit, negative for debit)
  - Balance after transaction
  - Date and time
  - Reference (order ID if applicable)
  - Note/description
- Filter by store
- Filter by transaction type
- Pagination support

**FR-CREDIT-026:** Customer credit ledger must display:

- Current credit balance per store
- Transaction history in chronological order (newest first)
- Store name for each transaction
- Transaction details (type, amount, balance, date, reference, note)
- Read-only view (customers cannot modify transactions)

#### 3.6.2 Store Admin Credit Ledger View

**FR-CREDIT-027:** Store staff and Store admins must be able to view customer credit history:

- Navigate to customer management page
- Select customer
- View customer's credit balance for the store
- View customer's credit transaction history
- Filter by transaction type
- View transaction details including creator information

---

### 3.7 Credit Expiration

#### 3.7.1 Credit Expiration Management

**FR-CREDIT-028:** System must track credit expiration:

- Calculate expiration date from recharge date + `creditExpiration` days
- Store expiration information (if configured)
- Prevent usage of expired credit
- Display expiration warnings to customers

**FR-CREDIT-029:** Credit expiration must support:

- Per-store expiration configuration
- Expiration date calculation
- Expired credit detection
- Expiration warnings (e.g., 30 days before expiration)
- Display of expiration dates in customer ledger

**Note:** Credit expiration is calculated per transaction. Each recharge has its own expiration date based on when it was added.

---

## 4. Data Requirements

### 4.1 Customer Credit Data Model

**FR-CREDIT-030:** The system must store the following customer credit data:

- Unique credit record ID
- Store ID
- User ID (customer)
- Credit balance (`point`, Decimal, default: 0)
- Update timestamp
- Unique constraint on `storeId + userId` combination

**Key Points:**

- One record per customer per store
- `point` field stores current balance
- Automatically updated when transactions occur
- Balance can be negative (for adjustments)

### 4.2 Customer Credit Ledger Data Model

**FR-CREDIT-031:** The system must store the following credit ledger data:

- Unique ledger entry ID
- Store ID
- User ID (customer)
- Transaction amount (Decimal, positive for credit, negative for debit)
- Balance after transaction (Decimal)
- Transaction type (TOPUP, BONUS, SPEND, REFUND, ADJUSTMENT)
- Reference ID (order ID, payment ID, or null)
- Optional note/description
- Creator ID (userId who created transaction, null for customer-initiated)
- Creation timestamp

**Transaction Types:**

- `TOPUP`: Customer or store operator adds credit (via payment)
- `BONUS`: Bonus credit awarded based on bonus rules
- `SPEND`: Credit used for purchase/order
- `REFUND`: Credit refunded (e.g., order cancellation)
- `ADJUSTMENT`: Manual adjustment by store admin

**Key Points:**

- Immutable records (never updated, only created)
- `balance` field stores balance after this transaction
- `referenceId` links to related orders, payments, or other entities
- `creatorId` tracks who initiated transaction (null for customer-initiated)

### 4.3 Credit Bonus Rule Data Model

**FR-CREDIT-032:** The system must store the following bonus rule data:

- Unique rule ID
- Store ID
- Threshold (Decimal, minimum top-up amount to trigger bonus)
- Bonus amount (Decimal, bonus credit awarded)
- Active flag (`isActive`, Boolean, default: true)
- Creation timestamp
- Update timestamp

**Key Points:**

- Multiple rules per store
- Rules evaluated by threshold (highest matching rule applies)
- Rules can be enabled/disabled without deletion

### 4.4 Store Configuration Data Model

**FR-CREDIT-033:** The system must store the following credit settings per store:

- `useCustomerCredit` (Boolean): Enable/disable credit system
- `creditExchangeRate` (Decimal): 1 point = X dollars
- `creditServiceExchangeRate` (Decimal): 1 point = X minutes of service
- `creditMaxPurchase` (Decimal): Maximum credit per purchase
- `creditMinPurchase` (Decimal): Minimum credit per purchase
- `creditExpiration` (Int): Credit expiration in days (default: 365)

### 4.5 StoreLedger Integration

**FR-CREDIT-034:** The system must create `StoreLedger` entries for credit transactions:

**Customer Recharge (TOPUP):**

- `type = 2`: Credit recharge
- `amount`: Positive (cash received, unearned revenue)
- `orderId`: Links to `StoreOrder` created for recharge
- `balance`: Increases by amount minus fees

**Credit Usage (SPEND):**

- `type = 3`: Credit usage
- `amount`: Positive (revenue recognized)
- `orderId`: Links to `StoreOrder` paid with credit
- `balance`: Increases by credit amount used
- `fee` and `platformFee`: Zero (no payment processing)

**Paid In-Person Recharge:**

- `type = 2`: Credit recharge
- `amount`: Positive (cash received, unearned revenue)
- `orderId`: Links to `StoreOrder` created for cash payment
- `balance`: Increases by cash amount

**Promotional Recharge:**

- `type = 2`: Credit-related transaction
- `amount`: 0 (no cash transaction, audit trail only)
- `orderId`: null (no order created)
- `balance`: Unchanged (amount = 0)

**Credit Refund:**

- `type = 3`: Credit usage (revenue-related)
- `amount`: Negative (revenue reversal)
- `orderId`: Links to original `StoreOrder`
- `balance`: Decreases by refund amount

---

## 5. Business Rules

### 5.1 Recharge Rules

**BR-CREDIT-001:** Customer self-service recharges must be within configured limits (`creditMinPurchase` and `creditMaxPurchase`).

**BR-CREDIT-002:** Store operator recharges are not subject to min/max purchase limits.

**BR-CREDIT-003:** Customer recharges require successful payment before credit is added.

**BR-CREDIT-004:** Bonus credit is calculated automatically based on active bonus rules at time of recharge.

**BR-CREDIT-005:** Only one bonus rule applies per recharge (highest matching threshold).

**BR-CREDIT-006:** Bonus credit is added to recharge amount and recorded in separate ledger entry.

### 5.2 Credit Usage Rules

**BR-CREDIT-007:** Credit can only be used if balance is sufficient for the purchase amount.

**BR-CREDIT-008:** Credit cannot be used if it has expired (if expiration is configured).

**BR-CREDIT-009:** Credit usage must be validated before order creation.

**BR-CREDIT-010:** Credit can be used for partial payment (remaining balance through other methods).

**BR-CREDIT-011:** Credit usage creates revenue recognition entry in `StoreLedger`.

### 5.3 Refund Rules

**BR-CREDIT-012:** Credit refunds can only be processed for orders that were paid with credit.

**BR-CREDIT-013:** Refund amount cannot exceed original credit amount used.

**BR-CREDIT-014:** Refund reason must be provided (optional but recommended).

**BR-CREDIT-015:** Credit refunds create revenue reversal entry in `StoreLedger`.

### 5.4 Adjustment Rules

**BR-CREDIT-016:** Only Store Admins can adjust customer credit (Store Staff cannot).

**BR-CREDIT-017:** Adjustment reason is required (mandatory field).

**BR-CREDIT-018:** Adjustments can result in negative balance.

**BR-CREDIT-019:** Adjustments are recorded in ledger with creator information.

### 5.5 Accounting Rules

**BR-CREDIT-020:** Customer credit recharges are recorded as unearned revenue (liability) in `StoreLedger`.

**BR-CREDIT-021:** Credit usage is recorded as revenue recognition (income) in `StoreLedger`.

**BR-CREDIT-022:** Credit refunds are recorded as revenue reversal (negative income) in `StoreLedger`.

**BR-CREDIT-023:** Promotional recharges are recorded in `StoreLedger` with `amount = 0` (no revenue impact).

**BR-CREDIT-024:** Revenue is recognized when credit is used, not when credit is purchased.

### 5.6 Expiration Rules

**BR-CREDIT-025:** Credit expiration is calculated from recharge date + `creditExpiration` days.

**BR-CREDIT-026:** Expired credit cannot be used for purchases.

**BR-CREDIT-027:** Expiration warnings should be displayed to customers (e.g., 30 days before expiration).

**BR-CREDIT-028:** Each recharge has its own expiration date (FIFO or LIFO can be configured).

---

## 6. User Interface Requirements

### 6.1 Device/Platform Requirements

**UI-CREDIT-001:** The system must support the following device types:

- **Customer Interface:**
  - Mobile phones (primary platform)
  - Must be optimized for phone screen sizes and touch interactions
  
- **Staff/Store Admin Interface:**
  - Tablets (primary platform)
  - Mobile phones (secondary platform)
  - Must be optimized for both tablet and phone screen sizes
  - Touch-friendly interface for both device types

### 6.2 Customer-Facing Interface

**UI-CREDIT-002:** Credit recharge page must be intuitive and mobile-friendly:

- Clear display of current credit balance
- Easy amount selection (preset amounts or custom input)
- Clear display of min/max purchase limits
- Payment method selection
- Confirmation page after successful recharge

**UI-CREDIT-003:** Credit ledger view must be clear and organized:

- Current balance per store prominently displayed
- Transaction history in chronological order
- Clear transaction type indicators (TOPUP, BONUS, SPEND, REFUND, ADJUSTMENT)
- Transaction details (amount, balance, date, reference, note)
- Filter by store and transaction type
- Pagination for large transaction lists
- Mobile-optimized layout

**UI-CREDIT-004:** Credit usage during checkout must be clear:

- Display current credit balance
- Option to use credit as payment method
- Display amount to deduct from credit
- Display remaining balance after usage
- Clear indication if balance is insufficient

### 6.3 Store Staff & Store Admin Interface

**UI-CREDIT-005:** Credit management page must provide clear customer credit view:

- Customer credit balance display
- Transaction history view
- Recharge interface (paid and promotional)
- Adjustment interface (Store Admin only)
- Filter and search capabilities
- Optimized for tablets and phones

**UI-CREDIT-006:** Credit bonus rule management must be organized:

- List of all bonus rules
- Create/edit/delete bonus rules
- Enable/disable bonus rules
- Clear display of threshold and bonus amounts
- Optimized for tablets and phones

**UI-CREDIT-007:** Credit settings page must be organized by functional area:

- Basic settings (enable/disable, exchange rates)
- Purchase limits (min/max)
- Expiration settings
- Optimized for tablets and phones

**UI-CREDIT-008:** Staff interface must be touch-friendly:

- Support both portrait and landscape orientations
- Large touch targets (minimum 44x44px on mobile)
- Clear action buttons
- Optimized for tablets and phones

---

## 7. Performance Requirements

### 7.1 Response Time

**PERF-CREDIT-001:** Credit recharge must complete within 5 seconds (excluding payment processing).

**PERF-CREDIT-002:** Credit balance check must respond within 1 second.

**PERF-CREDIT-003:** Credit ledger loading must complete within 2 seconds for 50 entries.

**PERF-CREDIT-004:** Bonus calculation must complete within 500ms.

### 7.2 Scalability

**PERF-CREDIT-005:** System must support at least 10,000 credit transactions per store per day.

**PERF-CREDIT-006:** System must handle concurrent credit operations from multiple users.

**PERF-CREDIT-007:** Credit ledger queries must be optimized with proper indexing.

---

## 8. Security Requirements

### 8.1 Access Control

**SEC-CREDIT-001:** Customers can only view/modify their own credit.

**SEC-CREDIT-002:** Store staff and Store admins can access customer credit management for their store.

**SEC-CREDIT-003:** Store Admins have full access to credit settings and bonus rules.

**SEC-CREDIT-004:** Store Staff have limited access (can recharge, cannot adjust or configure).

**SEC-CREDIT-005:** Credit adjustments require Store Admin access.

### 8.2 Data Protection

**SEC-CREDIT-006:** Credit balance information must be protected and not exposed to unauthorized users.

**SEC-CREDIT-007:** Payment information must be handled securely (PCI compliance if storing).

**SEC-CREDIT-008:** Credit transaction history must be accessible only to authorized users.

**SEC-CREDIT-009:** All credit operations must be logged for audit purposes.

### 8.3 Transaction Safety

**SEC-CREDIT-010:** All credit updates must use database transactions.

**SEC-CREDIT-011:** Ledger entries must be created in same transaction as balance updates.

**SEC-CREDIT-012:** System must prevent race conditions and data inconsistencies.

**SEC-CREDIT-013:** Credit operations must be atomic (all-or-nothing).

---

## 9. Error Handling

### 9.1 Validation Errors

**ERR-CREDIT-001:** System must validate all required fields before processing credit operations.

**ERR-CREDIT-002:** System must display clear error messages for validation failures.

**ERR-CREDIT-003:** System must prevent credit usage when balance is insufficient.

**ERR-CREDIT-004:** System must prevent credit recharge when amount is outside limits.

**ERR-CREDIT-005:** System must prevent credit usage when credit has expired.

### 9.2 System Errors

**ERR-CREDIT-006:** System must handle concurrent credit operations gracefully.

**ERR-CREDIT-007:** System must log all credit operations for audit trail.

**ERR-CREDIT-008:** System must handle payment failures gracefully (no credit added if payment fails).

**ERR-CREDIT-009:** System must handle database transaction failures (rollback on error).

**ERR-CREDIT-010:** System must prevent negative balances (unless adjustment).

---

## 10. Integration Requirements

### 10.1 Order Management Integration

**INT-CREDIT-001:** Credit system must integrate with order management:

- Create `StoreOrder` for customer recharges
- Link credit usage to orders via `referenceId`
- Support credit payment method in checkout
- Handle order refunds and credit refunds

### 10.2 Payment Gateway Integration

**INT-CREDIT-002:** Credit system must integrate with payment gateways:

- Process payments for customer recharges
- Handle payment webhooks for confirmation
- Support Stripe, LINE Pay, and other payment methods
- Handle payment failures gracefully

### 10.3 StoreLedger Integration

**INT-CREDIT-003:** Credit system must integrate with StoreLedger:

- Create StoreLedger entries for all credit transactions
- Track unearned revenue (credit recharges)
- Track revenue recognition (credit usage)
- Track revenue reversal (credit refunds)
- Maintain proper accounting balance

### 10.4 RSVP Integration

**INT-CREDIT-004:** Credit system must integrate with RSVP system:

- Support credit usage for prepaid reservations
- Link credit transactions to RSVP orders
- Handle RSVP refunds and credit refunds

---

## 11. Dependencies

### 11.1 External Services

- Payment processing services (Stripe, LINE Pay, etc.)
- Email service provider (for notifications)
- SMS service provider (for notifications, if configured)

### 11.2 Internal Systems

- User authentication system
- Store management system
- Order management system
- StoreLedger system
- RSVP system (for prepaid reservations)

---

## 12. Acceptance Criteria

### 12.1 Core Functionality

- ✅ Customers can recharge credit through public interface
- ✅ Store operators can manually recharge customer credit (paid and promotional)
- ✅ Credit can be used for purchases and orders
- ✅ Credit refunds work correctly
- ✅ Credit adjustments work correctly (Store Admin only)
- ✅ Bonus credit is calculated and awarded automatically
- ✅ Credit ledger displays complete transaction history
- ✅ Credit expiration is tracked and enforced (if configured)

### 12.2 Integration

- ✅ Order management integration works
- ✅ Payment gateway integration works
- ✅ StoreLedger integration works (proper accounting entries)
- ✅ RSVP integration works (prepaid reservations)

### 12.3 Performance

- ✅ All performance requirements met
- ✅ System handles expected load
- ✅ Credit operations are fast and responsive

### 12.4 Security

- ✅ Access control works correctly
- ✅ Data protection is enforced
- ✅ Transaction safety is maintained
- ✅ Audit trail is complete

---

## 13. Glossary

- **Credit**: Pre-purchased points that can be used for future purchases
- **Recharge**: Adding credit to customer account (via payment or manual)
- **TOPUP**: Transaction type for credit recharge
- **BONUS**: Transaction type for bonus credit awarded
- **SPEND**: Transaction type for credit usage
- **REFUND**: Transaction type for credit refund
- **ADJUSTMENT**: Transaction type for manual credit adjustment
- **Unearned Revenue**: Liability account for customer deposits (credit recharges)
- **Revenue Recognition**: Income account for revenue when credit is used
- **Credit Expiration**: Number of days before credit expires (if configured)
- **Bonus Rule**: Configuration that awards bonus credit based on top-up amount
- **Credit Ledger**: Immutable transaction log of all credit operations

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-27 | System | Initial functional requirements document |

---

## End of Document

