# Design: Customer Credit System

**Date:** 2025-01-27  
**Status:** Design  
**Version:** 1.1  
**Related Documents:**

- [RSVP Functional Requirements](./RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](./RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)

---

## 1. Overview

The Customer Credit system allows customers to pre-purchase credit points that can be used for future purchases at a store. The system supports:

- **Customer Recharge**: Customers can purchase credit through the store's public interface
- **Store Operator Recharge**: Store staff can manually add credit to customer accounts via the store admin interface
- **Transaction Recording**: All credit transactions are recorded in the `CustomerCreditLedger` for audit and history
- **Payment Processing**: Customer recharges create `StoreOrder` records to process payments through standard payment methods
- **Bonus System**: Stores can configure bonus rules that award additional credit based on top-up amounts
- **Credit Ledger Review**: Customers can review their credit balances and transaction history at their account page (`/account/`)

---

## 2. Database Schema

### 2.1 CustomerCredit Model

```prisma
model CustomerCredit {
  id        String   @id @default(uuid())
  storeId   String
  userId    String   // userId of the customer
  credit    Decimal  @default(0)
  updatedAt DateTime @updatedAt

  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([storeId, userId])
  @@index([storeId])
  @@index([userId])
}
```

**Purpose**: Stores the current credit balance for each customer-store pair.

**Key Points**:

- One record per customer per store
- `credit` field stores the current balance
- Automatically updated when transactions occur

### 2.2 CustomerCreditLedger Model

```prisma
model CustomerCreditLedger {
  id          String   @id @default(uuid())
  storeId     String
  userId      String   // userId of the customer
  amount      Decimal  // Transaction amount (positive for credit, negative for debit)
  balance     Decimal  // Balance after this transaction
  type        String   // TOPUP, BONUS, SPEND, REFUND, ADJUSTMENT
  referenceId String?  // Order ID, Payment ID, or other reference
  note        String?  // Optional note/description
  creatorId   String?  // userId who created this transaction
  createdAt   DateTime @default(now())

  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([storeId])
  @@index([userId])
  @@map("CustomerCreditLedger")
}
```

**Purpose**: Immutable transaction log for all credit operations.

**Transaction Types**:

- `TOPUP`: Customer or store operator adds credit (via payment)
- `BONUS`: Bonus credit awarded based on bonus rules
- `SPEND`: Credit used for purchase/order
- `REFUND`: Credit refunded (e.g., order cancellation)
- `ADJUSTMENT`: Manual adjustment by store operator

**Key Points**:

- Immutable records (never updated, only created)
- `balance` field stores the balance after this transaction
- `referenceId` links to related orders, payments, or other entities
- `creatorId` tracks who initiated the transaction (null for customer-initiated)

### 2.3 Store Configuration

```prisma
model Store {
  // ... other fields
  useCustomerCredit         Boolean @default(false) // Enable/disable credit system
  creditExchangeRate        Decimal @default(0)     // 1 point = ?? dollars
  creditServiceExchangeRate Decimal @default(0)     // 1 point = ?? minutes of service
  creditMaxPurchase         Decimal @default(0)     // Maximum credit per purchase
  creditMinPurchase         Decimal @default(0)     // Minimum credit per purchase
  creditExpiration          Int     @default(365)   // Credit expiration in days
}
```

### 2.4 CreditBonusRule Model

```prisma
model CreditBonusRule {
  id        String   @id @default(uuid())
  storeId   String
  threshold Decimal  // Minimum top-up amount to trigger bonus
  bonus     Decimal  // Bonus amount awarded
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@index([storeId])
}
```

**Purpose**: Defines bonus rules that award additional credit based on top-up amounts.

---

## 3. Use Cases

### 3.1 Customer Recharge (Public Interface)

**Actor**: Customer  
**Preconditions**:

- Store has `useCustomerCredit` enabled
- Customer is authenticated
- Customer has valid payment method

**Flow**:

1. Customer navigates to store's credit recharge page - `{store}/[storeId]/recharge`
2. Customer selects recharge amount (must be within `creditMinPurchase` and `creditMaxPurchase`)
3. System validates amount against store settings
4. System creates a `StoreOrder` for the recharge amount
5. Customer completes payment through standard payment flow (Stripe, LINE Pay, etc.)
6. Upon successful payment:
   - System calculates bonus (if applicable)
   - System creates `CustomerCreditLedger` entries:
     - One `TOPUP` entry for the paid amount
     - One `BONUS` entry if bonus is awarded
   - System updates `CustomerCredit` balance
   - System links ledger entries to the `StoreOrder` via `referenceId`

**Postconditions**:

- `StoreOrder` is created and marked as paid
- `CustomerCredit` balance is updated
- `CustomerCreditLedger` entries are created
- Customer receives confirmation

### 3.2 Store Operator Recharge (Admin Interface) - `{storeAdmin}/(dashboard)/[storeId]/(routes)/customers/credit`

**Actor**: Store Operator (owner, storeAdmin, or staff)  
**Preconditions**:

- Store operator is authenticated
- Store operator has access to store admin
- Customer exists in the system

**Two Scenarios**:

This use case supports two different scenarios:

1. **Paid Recharge (In-Person Payment)**: Customer pays cash in person, store staff credits the customer via admin interface
2. **Promotional Recharge (No Payment)**: Store operator gives credit as a gift/promotion without payment

**Flow**:

1. Store operator navigates to customer management page
2. Store operator selects a customer
3. Store operator enters:
   - Recharge amount (credit points)
   - **Payment indicator**: Whether customer paid in person (cash amount) or this is promotional (no payment)
   - **Cash amount** (if paid): The actual cash amount received from customer
   - Optional note
4. System validates:
   - Store operator has permission
   - Credit amount is valid (positive integer)
   - If paid: Cash amount is valid (positive number)
5. **If Paid Recharge**:
   - System creates a `StoreOrder` for the cash amount
   - System marks order as paid (cash payment)
   - System calculates bonus (if applicable based on bonus rules)
   - System updates `CustomerCredit` balance (including bonus)
   - System creates `CustomerCreditLedger` entries:
     - One `TOPUP` entry for the recharge amount:
       - Type: `TOPUP`
       - Credit amount: recharge amount
       - `creatorId`: store operator's userId
       - `note`: optional note from operator
       - `referenceId`: StoreOrder.id (links to the order created)
     - One `BONUS` entry if bonus is awarded:
       - Type: `BONUS`
       - Amount: bonus amount
       - `creatorId`: null (system-generated)
       - `note`: bonus description
       - `referenceId`: StoreOrder.id
   - System creates `StoreLedger` entry:
     - `amount`: Cash amount received (positive, unearned revenue)
     - `orderId`: StoreOrder.id
     - `type`: 2 (credit recharge)
     - `description`: "In-Person Credit Recharge"
     - `note`: Details about the cash payment and credit given
6. **If Promotional Recharge**:
   - System calculates bonus (if applicable based on bonus rules)
   - System updates `CustomerCredit` balance (including bonus)
   - System creates `CustomerCreditLedger` entries:
     - One `TOPUP` entry for the recharge amount:
       - Type: `TOPUP`
       - Credit amount: recharge amount
       - `creatorId`: store operator's userId
       - `note`: optional note from operator
       - `referenceId`: null (no order for promotional recharge)
     - One `BONUS` entry if bonus is awarded:
       - Type: `BONUS`
       - Amount: bonus amount
       - `creatorId`: null (system-generated)
       - `note`: bonus description
       - `referenceId`: null
   - System creates `StoreLedger` entry:
     - `amount`: 0 (no cash transaction, audit trail only)
     - `orderId`: null
     - `type`: 2 (credit-related transaction)
     - `description`: "Promotional Credit Recharge"
     - `note`: Clearly indicates this is promotional credit

**Postconditions**:

- `CustomerCredit` balance is updated (including bonus if applicable)
- `CustomerCreditLedger` entries are created
- **If Paid**: `StoreOrder` is created and marked as paid
- **If Paid**: `StoreLedger` entry is created with cash amount (unearned revenue)
- **If Promotional**: `StoreLedger` entry is created with amount = 0 (audit trail)
- Customer's credit history is updated

**Accounting Notes**:

- **Paid Recharge (In-Person Payment)**:
  - **StoreOrder Created**: Creates `StoreOrder` record for the cash payment
  - **StoreLedger Entry**: Creates `StoreLedger` entry with actual cash amount (unearned revenue)
  - **Revenue Impact**: Cash received increases unearned revenue (liability)
  - **Accounting Entry**:

    ```text
    Debit: Cash (Asset) +$X
    Credit: Unearned Revenue (Liability) +$X
    ```

- **Promotional Recharge (No Payment)**:
  - **No StoreOrder Created**: Does NOT create `StoreOrder` record (no payment)
  - **StoreLedger Entry (Amount = 0)**: Creates `StoreLedger` entry with `amount = 0` for audit trail
  - **Revenue Impact**: No cash received, no revenue impact
  - **Accounting Entry**:

    ```text
    Debit: Customer Credit (Liability) +$X
    Credit: Promotional Expense (Expense) +$X
    Note: Recorded in StoreLedger with amount = 0 for audit trail
    ```

- **Bonus Credit**: Bonus credit is included in the same StoreLedger entry (no separate entry needed)

---

### 3.3 Credit Usage (Purchase)

**Actor**: Customer or System  
**Preconditions**:

- Customer has sufficient credit balance
- Store has `useCustomerCredit` enabled

**Flow**:

1. Customer makes a purchase
2. System calculates total cost
3. Customer selects "Use Credit" as payment method
4. System validates credit balance is sufficient
5. System creates order and processes payment:
   - Deducts credit from `CustomerCredit`
   - Creates `CustomerCreditLedger` entry:
     - Type: `SPEND`
     - Amount: negative (debit)
     - `referenceId`: order ID
   - Creates `StoreOrder` with payment status

**Postconditions**:

- `CustomerCredit` balance is reduced
- `CustomerCreditLedger` entry is created
- Order is created and marked as paid

### 3.4 Credit Refund

**Actor**: Store Operator or System  
**Preconditions**:

- Order exists and was paid with credit
- Refund is authorized

**Flow**:

1. Store operator initiates refund for an order
2. System calculates refund amount
3. System updates `CustomerCredit` balance
4. System creates `CustomerCreditLedger` entry:
   - Type: `REFUND`
   - Amount: positive (credit)
   - `referenceId`: original order ID
   - `note`: refund reason

**Postconditions**:

- `CustomerCredit` balance is increased
- `CustomerCreditLedger` entry is created

### 3.5 Manual Adjustment

**Actor**: Store Operator  
**Preconditions**:

- Store operator has permission
- Adjustment reason is provided

**Flow**:

1. Store operator navigates to customer credit management
2. Store operator selects "Adjust Credit"
3. Store operator enters adjustment amount (positive or negative) and reason
4. System validates adjustment
5. System updates `CustomerCredit` balance
6. System creates `CustomerCreditLedger` entry:
   - Type: `ADJUSTMENT`
   - Amount: adjustment amount (positive or negative)
   - `creatorId`: store operator's userId
   - `note`: adjustment reason

**Postconditions**:

- `CustomerCredit` balance is updated
- `CustomerCreditLedger` entry is created

### 3.6 Credit Ledger Review (Customer Account Page)

**Actor**: Customer  
**Preconditions**:

- Customer is authenticated
- Customer has accessed their account page at `/account/`

**Flow**:

1. Customer navigates to account page (`/account/`)
2. Customer selects "Credit" or "Credit History" tab
3. System fetches customer's credit ledger for all stores where they have credit
4. System displays:
   - Current credit balance per store
   - Transaction history (ledger entries) with:
     - Transaction type (TOPUP, BONUS, SPEND, REFUND, ADJUSTMENT)
     - Amount (positive for credit, negative for debit)
     - Balance after transaction
     - Date and time
     - Reference (order ID if applicable)
     - Note/description
5. Customer can:
   - View transaction history
   - Filter by store
   - Filter by transaction type
   - See current balance for each store

**Postconditions**:

- Customer can view their complete credit transaction history
- Customer can see current balances across all stores

**Note**: This is a read-only view. Customers cannot modify credit balances or transactions.

---

## 4. Accounting Standards and StoreLedger Integration

### 4.1 Accounting Principles (GAAP/IFRS)

Customer credit follows standard accounting principles for **unearned revenue** (also called deferred revenue or customer deposits):

**Key Concepts**:

1. **Customer Credit Recharge (TOPUP)**:
   - **Cash Received**: Store receives payment from customer
   - **Liability Created**: Unearned Revenue / Customer Deposits (liability increases)
   - **NOT Revenue Yet**: Revenue is NOT recognized until credit is used for goods/services
   - **Accounting Entry**:

     ```text
     Debit: Cash (Asset) +$X
     Credit: Unearned Revenue (Liability) +$X
     ```

2. **Credit Usage (SPEND)**:
   - **Revenue Recognized**: Revenue is recognized when credit is used for purchase
   - **Liability Reduced**: Unearned Revenue is reduced
   - **Accounting Entry**:

     ```text
     Debit: Unearned Revenue (Liability) -$X
     Credit: Revenue (Income) +$X
     ```

3. **Store Operator Manual Recharge**:
   - **No Cash Transaction**: Store operator adds credit without payment
   - **Accounting Treatment**: This is a **promotion/gift**, not a cash transaction
   - **StoreLedger Entry**: Create StoreLedger entry with `amount = 0` for audit purposes
   - **Accounting Entry**:

     ```text
     Debit: Customer Credit (Liability) +$X
     Credit: Promotional Expense (Expense) +$X
     Note: Recorded in StoreLedger with amount = 0 for audit trail
     ```

   - **StoreLedger Impact**:

     - `amount`: 0 (no cash received, no revenue)
     - `balance`: Unchanged (amount = 0, so balance stays same)
     - `description`: "Manual Credit Recharge" or "Promotional Credit"
     - `note`: Details about the promotional credit given

4. **Bonus Credit**:
   - **No Cash Transaction**: Bonus is awarded without payment
   - **Accounting Treatment**: Similar to manual recharge - treat as promotion
   - **StoreLedger Entry**: Included in the same StoreLedger entry as the manual recharge (no separate entry)

### 4.2 StoreLedger Integration

The `StoreLedger` model tracks store financial transactions and should include customer credit transactions for proper revenue visibility:

```prisma
model StoreLedger {
  id          String  @id @default(uuid())
  storeId     String
  orderId     String?  // Nullable: may not have order for manual operations
  amount      Decimal  // Positive for revenue, negative for expenses
  fee         Decimal  // Payment processing fees
  platformFee Decimal  // Platform fees
  currency    String   @default("twd")
  type        Int      @default(0) // 0: 代收 | 1: store's own payment provider | 2: credit recharge | 3: credit usage
  balance     Decimal  // Running balance
  description String
  note        String?
  createdAt   DateTime @default(now())
  availability DateTime @default(now())
  
  StoreOrder StoreOrder? @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

**StoreLedger Entry Types**:

- `type = 0`: Platform payment processing (代收)
- `type = 1`: Store's own payment provider
- `type = 2`: **Customer credit recharge** (unearned revenue - liability)
- `type = 3`: **Credit usage** (revenue recognition)

### 4.3 StoreLedger Entries for Credit Transactions

#### 4.3.1 Customer Credit Recharge (TOPUP)

When a customer recharges credit via payment:

1. **Create StoreLedger Entry** (after payment is confirmed):

   ```typescript
   // Get last ledger balance
   const lastLedger = await sqlClient.storeLedger.findFirst({
     where: { storeId },
     orderBy: { createdAt: "desc" },
     take: 1,
   });
   
   const balance = Number(lastLedger ? lastLedger.balance : 0);
   
   // Calculate fees (same as regular order)
   const fee = -Number(
     Number(rechargeAmount) * Number(paymentMethod.fee) +
     Number(paymentMethod.feeAdditional)
   );
   const feeTax = Number(fee * 0.05);
   const platformFee = isPro ? 0 : -Number(Number(rechargeAmount) * 0.01);
   
   // Create StoreLedger entry for credit recharge
   await sqlClient.storeLedger.create({
     data: {
       storeId,
       orderId: order.id, // Link to the StoreOrder created for recharge
       amount: new Prisma.Decimal(rechargeAmount), // Positive: cash received
       fee: fee + feeTax,
       platformFee: platformFee,
       currency: store.defaultCurrency,
       type: 2, // Credit recharge type
       balance: balance + Number(rechargeAmount) + fee + feeTax + platformFee,
       description: `Credit Recharge - Order #${order.orderNum}`,
       note: `Customer credit top-up: ${rechargeAmount} ${store.defaultCurrency}`,
       availability: availabilityDate, // Based on payment method clear days
     },
   });
   ```

   **Accounting Impact**:
   - `amount`: Positive (cash received)
   - `balance`: Increases by amount minus fees
   - **Represents**: Unearned revenue (liability) - cash received but service not yet delivered

2. **Link to CustomerCreditLedger**:
   - `CustomerCreditLedger` entry has `referenceId` pointing to `StoreOrder.id`
   - `StoreLedger` entry has `orderId` pointing to same `StoreOrder.id`
   - Both are linked via the `StoreOrder`

#### 4.3.2 Credit Usage (SPEND)

When a customer uses credit for a purchase:

1. **Create StoreLedger Entry** (when order is created/confirmed):

   ```typescript
   // Get last ledger balance
   const lastLedger = await sqlClient.storeLedger.findFirst({
     where: { storeId },
     orderBy: { createdAt: "desc" },
     take: 1,
   });
   
   const balance = Number(lastLedger ? lastLedger.balance : 0);
   
   // Create StoreLedger entry for revenue recognition
   await sqlClient.storeLedger.create({
     data: {
       storeId,
       orderId: order.id, // Link to the order paid with credit
       amount: new Prisma.Decimal(creditAmountUsed), // Positive: revenue recognized
       fee: new Prisma.Decimal(0), // No payment processing fee for credit usage
       platformFee: new Prisma.Decimal(0), // No platform fee for credit usage
       currency: store.defaultCurrency,
       type: 3, // Credit usage type
       balance: balance + Number(creditAmountUsed), // Balance increases (revenue)
       description: `Credit Usage - Order #${order.orderNum}`,
       note: `Revenue recognized from customer credit: ${creditAmountUsed} ${store.defaultCurrency}`,
       availability: new Date(), // Immediate availability (no payment processing delay)
     },
   });
   ```

   **Accounting Impact**:
   - `amount`: Positive (revenue recognized)
   - `balance`: Increases by credit amount used
   - `fee` and `platformFee`: Zero (no payment processing for credit)
   - **Represents**: Revenue recognition - service delivered, liability reduced

2. **Link to CustomerCreditLedger**:
   - `CustomerCreditLedger` entry (type: `SPEND`) has `referenceId` pointing to `StoreOrder.id`
   - `StoreLedger` entry has `orderId` pointing to same `StoreOrder.id`

#### 4.3.3 Store Operator Recharge (Two Scenarios)

##### Scenario A: Paid Recharge (In-Person Payment)

When a customer pays cash in person and store staff credits via admin interface:

1. **Create StoreOrder** (for the cash payment):

   ```typescript
   const order = await sqlClient.storeOrder.create({
     data: {
       storeId,
       userId,
       orderTotal: cashAmount, // Cash amount received
       currency: store.defaultCurrency,
       paymentMethodId: "cash_in_person", // Special payment method
       orderStatus: OrderStatus.Confirmed,
       paymentStatus: PaymentStatus.Paid,
       isPaid: true,
       paidDate: new Date(),
       // ... other order fields
     },
   });
   ```

2. **Create StoreLedger Entry** (with actual cash amount):

   ```typescript
   // Get last ledger balance
   const lastLedger = await sqlClient.storeLedger.findFirst({
     where: { storeId },
     orderBy: { createdAt: "desc" },
     take: 1,
   });

   const balance = Number(lastLedger ? lastLedger.balance : 0);

   // Create StoreLedger entry for paid recharge
   await sqlClient.storeLedger.create({
     data: {
       storeId,
       orderId: order.id, // Link to the order
       amount: new Prisma.Decimal(cashAmount), // Positive: cash received
       fee: new Prisma.Decimal(0), // No payment processing fee for cash
       platformFee: new Prisma.Decimal(0), // No platform fee for cash
       currency: store.defaultCurrency,
       type: 2, // Credit recharge type
       balance: balance + Number(cashAmount), // Balance increases
       description: `In-Person Credit Recharge - Order #${order.orderNum}`,
       note: `Cash payment: ${cashAmount} ${store.defaultCurrency}. Credit given: ${creditAmount} + bonus ${bonus} = ${totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
       availability: new Date(), // Immediate for cash
     },
   });
   ```

   **Accounting Impact**:
   - `amount`: Positive (cash received, unearned revenue)
   - `balance`: Increases by cash amount
   - `fee` and `platformFee`: Zero (no payment processing for cash)
   - **Represents**: Unearned revenue - cash received but service not yet delivered

#### Scenario B: Promotional Recharge (No Payment)

**Recommendation**: **CREATE** StoreLedger entry with `amount = 0` for audit and recording purposes.

**Implementation**:

1. **Create StoreLedger Entry** (after credit is added):

   ```typescript
   // Get last ledger balance
   const lastLedger = await sqlClient.storeLedger.findFirst({
     where: { storeId },
     orderBy: { createdAt: "desc" },
     take: 1,
   });

   const balance = Number(lastLedger ? lastLedger.balance : 0);

   // Create StoreLedger entry for manual recharge (amount = 0)
   await sqlClient.storeLedger.create({
     data: {
       storeId,
       orderId: null, // No order for manual recharge
       amount: new Prisma.Decimal(0), // Zero amount - no cash transaction
       fee: new Prisma.Decimal(0),
       platformFee: new Prisma.Decimal(0),
       currency: store.defaultCurrency,
       type: 2, // Credit-related transaction type (or new type = 4 for manual)
       balance: balance, // Balance unchanged (amount = 0)
       description: `Manual Credit Recharge - ${totalCredit} points`,
       note: `Promotional credit: ${amount} + bonus ${bonus} = ${totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
       availability: new Date(), // Immediate
     },
   });
   ```

   **Accounting Impact**:
   - `amount`: 0 (no cash received, no revenue impact)
   - `balance`: Unchanged (amount = 0, so balance stays the same)
   - `fee` and `platformFee`: 0 (no payment processing)
   - **Represents**: Audit record of promotional credit given (no financial impact)

2. **Link to CustomerCreditLedger**:
   - `CustomerCreditLedger` entries (type: `TOPUP` and `BONUS`) have `referenceId: null`
   - `StoreLedger` entry has `orderId: null`
   - Both are linked via `storeId` and `userId` context

**Benefits**:

- **Complete Audit Trail**: All credit operations are recorded in StoreLedger
- **No Revenue Impact**: Amount = 0 ensures no impact on revenue calculations
- **Transparency**: Store owners can see all promotional credit given
- **Reporting**: Can query StoreLedger to see promotional activity
- **Compliance**: Maintains complete financial records

#### 4.3.4 Credit Refund

When credit is refunded (e.g., order cancellation):

1. **Create StoreLedger Entry** (if original order was paid with credit):

   ```typescript
   // Get last ledger balance
   const lastLedger = await sqlClient.storeLedger.findFirst({
     where: { storeId },
     orderBy: { createdAt: "desc" },
     take: 1,
   });
   
   const balance = Number(lastLedger ? lastLedger.balance : 0);
   
   // Create StoreLedger entry for refund
   await sqlClient.storeLedger.create({
     data: {
       storeId,
       orderId: originalOrder.id, // Link to original order
       amount: new Prisma.Decimal(-refundAmount), // Negative: revenue reversal
       fee: new Prisma.Decimal(0),
       platformFee: new Prisma.Decimal(0),
       currency: store.defaultCurrency,
       type: 3, // Same as credit usage (revenue-related)
       balance: balance - Number(refundAmount), // Balance decreases
       description: `Credit Refund - Order #${originalOrder.orderNum}`,
       note: `Refund to customer credit: ${refundAmount} ${store.defaultCurrency}`,
       availability: new Date(),
     },
   });
   ```

   **Accounting Impact**:
   - `amount`: Negative (revenue reversal)
   - `balance`: Decreases by refund amount
   - **Represents**: Revenue reversal - service not delivered, liability restored

### 4.4 Revenue Reporting

Store owners can now view proper revenue reports by querying `StoreLedger`:

**Total Revenue** (earned):

```sql
SELECT SUM(amount)
FROM StoreLedger
WHERE storeId = ?
  AND type IN (1, 3) -- Regular orders + credit usage
  AND amount > 0;
```

**Unearned Revenue** (customer deposits):

```sql
SELECT SUM(amount)
FROM StoreLedger
WHERE storeId = ?
  AND type = 2 -- Credit recharges
  AND amount > 0;
```

**Net Revenue** (earned - refunds):

```sql
SELECT SUM(amount)
FROM StoreLedger
WHERE storeId = ?
  AND type IN (1, 3) -- Regular orders + credit usage
  AND amount != 0; -- Includes negative refunds
```

---

## 5. Payment Flow for Customer Recharge

### 4.1 Order Creation

When a customer initiates a recharge:

1. **Create StoreOrder**:

   ```typescript
   const order = await sqlClient.storeOrder.create({
     data: {
       storeId,
       userId,
       orderTotal: rechargeAmount,
       currency: store.defaultCurrency,
       paymentMethodId: "credit_recharge", // Special payment method
       orderStatus: OrderStatus.Pending,
       paymentStatus: PaymentStatus.Pending,
       // ... other order fields
     },
   });
   ```

2. **Create OrderItem** (optional, for tracking):

   ```typescript
   await sqlClient.orderItem.create({
     data: {
       orderId: order.id,
       productId: null, // No product for credit recharge
       name: "Credit Recharge",
       quantity: 1,
       price: rechargeAmount,
       // ... other fields
     },
   });
   ```

### 4.2 Payment Processing

1. Customer completes payment through standard payment gateway (Stripe, LINE Pay, etc.)
2. Payment webhook/response confirms payment success
3. System processes credit top-up (see Section 5)

### 4.3 Order Completion

After successful payment and credit top-up:

1. Update `StoreOrder`:

   ```typescript
   await sqlClient.storeOrder.update({
     where: { id: orderId },
     data: {
       isPaid: true,
       paidDate: new Date(),
       paymentStatus: PaymentStatus.Paid,
       orderStatus: OrderStatus.Confirmed,
     },
   });
   ```

2. Link ledger entries to order via `referenceId`

---

## 5. Transaction Recording

### 5.1 Transaction Flow

All credit transactions follow this pattern:

1. **Calculate New Balance**:

   ```typescript
   const currentCredit = await getCustomerCredit(storeId, userId);
   const newBalance = currentCredit + transactionAmount;
   ```

2. **Update CustomerCredit** (in transaction):

   ```typescript
   await sqlClient.customerCredit.upsert({
     where: { storeId_userId: { storeId, userId } },
     update: { credit: { increment: transactionAmount } },
     create: { storeId, userId, credit: transactionAmount },
   });
   ```

3. **Create Ledger Entry** (in same transaction):

   ```typescript
   await sqlClient.customerCreditLedger.create({
     data: {
       storeId,
       userId,
       amount: transactionAmount,
       balance: newBalance,
       type: transactionType,
       referenceId: orderId || null,
       note: note || null,
       creatorId: operatorId || null,
     },
   });
   ```

### 5.2 Transaction Types

#### TOPUP

- **Amount**: Positive (credit added)
- **Reference**: `StoreOrder.id` (for customer recharge) or `null` (for manual recharge)
- **Creator**: `null` (customer-initiated) or operator `userId` (operator-initiated)
- **Note**: "Top-up {amount}" or custom note

#### BONUS

- **Amount**: Positive (bonus credit)
- **Reference**: Same as related `TOPUP` transaction
- **Creator**: `null` (system-generated)
- **Note**: "Bonus for top-up {amount}"

#### SPEND

- **Amount**: Negative (credit deducted)
- **Reference**: `StoreOrder.id`
- **Creator**: `null` (system-generated)
- **Note**: "Payment for order {orderId}"

#### REFUND

- **Amount**: Positive (credit refunded)
- **Reference**: Original `StoreOrder.id`
- **Creator**: Operator `userId` or `null` (system)
- **Note**: Refund reason

#### ADJUSTMENT

- **Amount**: Positive or negative (manual adjustment)
- **Reference**: `null`
- **Creator**: Operator `userId`
- **Note**: Adjustment reason (required)

### 5.3 Bonus Calculation

When processing a top-up:

1. **Check Active Bonus Rules**:

   ```typescript
   const bonusRules = await sqlClient.creditBonusRule.findMany({
     where: {
       storeId,
       isActive: true,
       threshold: { lte: topUpAmount },
     },
     orderBy: { threshold: "desc" },
   });
   ```

2. **Select Highest Matching Rule**:

   ```typescript
   const applicableRule = bonusRules[0]; // Highest threshold that matches
   const bonus = applicableRule ? Number(applicableRule.bonus) : 0;
   ```

3. **Create Separate Ledger Entries**:
   - First entry: `TOPUP` for the paid amount
   - Second entry: `BONUS` for the bonus amount (if > 0)

---

## 6. API/Server Actions Design

### 6.1 Customer Recharge (Public)

**Location**: `src/actions/store/[storeId]/credit/recharge.ts`

```typescript
export const rechargeCreditAction = userRequiredActionClient
  .metadata({ name: "rechargeCredit" })
  .schema(rechargeCreditSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, amount } = parsedInput;
    
    // 1. Validate store settings
    const store = await validateStoreCreditSettings(storeId);
    
    // 2. Validate amount
    validateRechargeAmount(amount, store);
    
    // 3. Create StoreOrder
    const order = await createRechargeOrder(storeId, userId, amount);
    
    // 4. Return order for payment processing
    return { order };
  });
```

**Schema**:

```typescript
const rechargeCreditSchema = z.object({
  storeId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.coerce.number().positive(),
});
```

### 6.2 Process Credit Top-Up (After Payment)

**Location**: `src/actions/store/[storeId]/credit/process-topup.ts`

```typescript
export const processCreditTopUpAction = baseClient
  .metadata({ name: "processCreditTopUp" })
  .schema(processTopUpSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, amount, orderId } = parsedInput;
    
    // 1. Calculate bonus
    const bonus = await calculateBonus(storeId, amount);
    const totalCredit = amount + bonus;
    
    // 2. Process in transaction
    await sqlClient.$transaction(async (tx) => {
      // Update CustomerCredit
      const customerCredit = await tx.customerCredit.upsert({
        where: { storeId_userId: { storeId, userId } },
        update: { credit: { increment: totalCredit } },
        create: { storeId, userId, credit: totalCredit },
      });
      
      const finalBalance = Number(customerCredit.credit);
      const balanceAfterTopUp = finalBalance - bonus;
      
      // Create TOPUP ledger entry
      await tx.customerCreditLedger.create({
        data: {
          storeId,
          userId,
          amount: new Prisma.Decimal(amount),
          balance: new Prisma.Decimal(balanceAfterTopUp),
          type: "TOPUP",
          referenceId: orderId,
          note: `Top-up ${amount}`,
        },
      });
      
      // Create BONUS ledger entry if applicable
      if (bonus > 0) {
        await tx.customerCreditLedger.create({
          data: {
            storeId,
            userId,
            amount: new Prisma.Decimal(bonus),
            balance: new Prisma.Decimal(finalBalance),
            type: "BONUS",
            referenceId: orderId,
            note: `Bonus for top-up ${amount}`,
          },
        });
      }
    });
    
    return { amount, bonus, totalCredit };
  });
```

### 6.3 Store Operator Recharge

**Location**: `src/actions/storeAdmin/customer/recharge-customer-credit.ts`

```typescript
export const rechargeCustomerCreditAction = storeActionClient
  .metadata({ name: "rechargeCustomerCredit" })
  .schema(rechargeCustomerCreditSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, creditAmount, cashAmount, isPaid, note } = parsedInput;

    // Get the current user (store operator) who is creating this recharge
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const creatorId = session?.user?.id;

    if (typeof creatorId !== "string") {
      throw new SafeError("Unauthorized");
    }

    // Verify customer exists
    const user = await sqlClient.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new SafeError("Customer not found");
    }

    const store = await sqlClient.store.findUnique({
      where: { id: storeId },
      select: { defaultCurrency: true, defaultTimezone: true },
    });

    if (!store) {
      throw new SafeError("Store not found");
    }

    let orderId: string | null = null;

    // If paid recharge, create StoreOrder first
    if (isPaid && cashAmount && cashAmount > 0) {
      const order = await sqlClient.storeOrder.create({
        data: {
          storeId,
          userId,
          orderTotal: new Prisma.Decimal(cashAmount),
          currency: store.defaultCurrency,
          paymentMethodId: "cash_in_person", // Special payment method for in-person cash
          orderStatus: OrderStatus.Confirmed,
          paymentStatus: PaymentStatus.Paid,
          isPaid: true,
          paidDate: getUtcNow(),
          // ... other order fields
        },
      });
      orderId = order.id;
    }

    // Process credit top-up using the shared function
    const result = await processCreditTopUp(
      storeId,
      userId,
      creditAmount,
      orderId, // Order ID if paid, null if promotional
      creatorId, // Store operator who created this
      note || (isPaid ? `In-person cash recharge` : `Promotional recharge by operator`),
    );

    // Create StoreLedger entry
    const lastLedger = await sqlClient.storeLedger.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const balance = Number(lastLedger ? lastLedger.balance : 0);

    if (isPaid && cashAmount && cashAmount > 0) {
      // Paid recharge: create StoreLedger entry with cash amount
      await sqlClient.storeLedger.create({
        data: {
          storeId,
          orderId: orderId!,
          amount: new Prisma.Decimal(cashAmount), // Cash amount received
          fee: new Prisma.Decimal(0), // No payment processing fee for cash
          platformFee: new Prisma.Decimal(0), // No platform fee for cash
          currency: store.defaultCurrency,
          type: 2, // Credit recharge type
          balance: new Prisma.Decimal(balance + Number(cashAmount)), // Balance increases
          description: `In-Person Credit Recharge - ${result.totalCredit} points`,
          note: `Cash payment: ${cashAmount} ${store.defaultCurrency}. Credit given: ${result.amount} + bonus ${result.bonus} = ${result.totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
          availability: new Date(), // Immediate for cash
        },
      });
    } else {
      // Promotional recharge: create StoreLedger entry with amount = 0
      await sqlClient.storeLedger.create({
        data: {
          storeId,
          orderId: null, // No order for promotional recharge
          amount: new Prisma.Decimal(0), // Zero amount - no cash transaction
          fee: new Prisma.Decimal(0),
          platformFee: new Prisma.Decimal(0),
          currency: store.defaultCurrency,
          type: 2, // Credit-related transaction type
          balance: new Prisma.Decimal(balance), // Balance unchanged
          description: `Promotional Credit Recharge - ${result.totalCredit} points`,
          note: `Promotional credit: ${result.amount} + bonus ${result.bonus} = ${result.totalCredit} points. Operator: ${creatorId}. ${note || ""}`,
          availability: new Date(),
        },
      });
    }

    return {
      success: true,
      amount: result.amount,
      bonus: result.bonus,
      totalCredit: result.totalCredit,
      orderId: orderId, // Return order ID if created
    };
  });
```

**Schema**:

```typescript
const rechargeCustomerCreditSchema = z.object({
  storeId: z.string().min(1),
  userId: z.string().min(1),
  creditAmount: z.coerce.number().int().min(1, "Credit amount must be a positive integer"),
  cashAmount: z.coerce.number().positive().optional().nullable(), // Required if isPaid = true
  isPaid: z.boolean().default(false), // true = customer paid in person, false = promotional
  note: z.string().optional().nullable(),
}).refine(
  (data) => {
    // If isPaid is true, cashAmount must be provided and positive
    if (data.isPaid) {
      return data.cashAmount !== null && data.cashAmount !== undefined && data.cashAmount > 0;
    }
    return true;
  },
  {
    message: "Cash amount is required when isPaid is true",
    path: ["cashAmount"],
  }
);
```

**Key Implementation Details**:

1. **Two Scenarios Supported**:
   - **Paid Recharge (`isPaid = true`)**: Customer pays cash in person, creates StoreOrder and StoreLedger with cash amount
   - **Promotional Recharge (`isPaid = false`)**: No payment, creates StoreLedger with amount = 0 for audit

2. **Uses Shared Function**: Calls `processCreditTopUp` from `@/lib/credit-bonus.ts` to ensure consistent bonus calculation and transaction handling

3. **Bonus Calculation**: Automatically calculates and applies bonus credit based on store's `CreditBonusRule` configuration

4. **Transaction Safety**: All database operations are wrapped in a transaction via `processCreditTopUp`

5. **Paid Recharge Flow**:
   - Creates `StoreOrder` for cash payment (marked as paid immediately)
   - Creates `StoreLedger` entry with actual cash amount (unearned revenue)
   - Links `CustomerCreditLedger` entries to `StoreOrder` via `referenceId`

6. **Promotional Recharge Flow**:
   - Does NOT create `StoreOrder` record (no payment)
   - Creates `StoreLedger` entry with `amount = 0` for audit trail
   - `CustomerCreditLedger` entries have `referenceId: null`

7. **StoreLedger Entries**:
   - **Paid**: `amount` = cash amount received, `balance` increases, `orderId` links to StoreOrder
   - **Promotional**: `amount` = 0, `balance` unchanged, `orderId` = null

8. **Creator Tracking**: Records the `creatorId` (store operator) in both `CustomerCreditLedger` and `StoreLedger` entries for audit purposes

9. **Validation**: Validates that:
   - User is authenticated and authorized
   - Customer exists
   - Credit amount is a positive integer
   - If `isPaid = true`, cash amount must be provided and positive

### 6.4 Adjust Credit

**Location**: `src/actions/storeAdmin/customer/adjust-credit.ts`

```typescript
export const adjustCustomerCreditAction = storeActionClient
  .metadata({ name: "adjustCustomerCredit" })
  .schema(adjustCreditSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, amount, reason, creatorId } = parsedInput;
    
    // Validate: reason is required for adjustments
    if (!reason || reason.trim().length === 0) {
      throw new SafeError("Adjustment reason is required");
    }
    
    // Process in transaction
    await sqlClient.$transaction(async (tx) => {
      // Update CustomerCredit
      const customerCredit = await tx.customerCredit.upsert({
        where: { storeId_userId: { storeId, userId } },
        update: { credit: { increment: amount } },
        create: { storeId, userId, credit: amount },
      });
      
      const newBalance = Number(customerCredit.credit);
      
      // Create ledger entry
      await tx.customerCreditLedger.create({
        data: {
          storeId,
          userId,
          amount: new Prisma.Decimal(amount),
          balance: new Prisma.Decimal(newBalance),
          type: "ADJUSTMENT",
          referenceId: null,
          note: reason,
          creatorId,
        },
      });
    });
    
    return { success: true };
  });
```

**Schema**:

```typescript
const adjustCreditSchema = z.object({
  storeId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.coerce.number(), // Can be positive or negative
  reason: z.string().min(1, "Adjustment reason is required"),
});
```

### 6.5 Get Customer Credit

**Location**: `src/actions/storeAdmin/customer/get-customer-credit.ts`

```typescript
export const getCustomerCreditAction = storeActionClient
  .metadata({ name: "getCustomerCredit" })
  .schema(getCustomerCreditSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId } = parsedInput;
    
    const customerCredit = await sqlClient.customerCredit.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
    });
    
    return {
      credit: customerCredit ? Number(customerCredit.credit) : 0,
    };
  });
```

### 6.6 Get Credit Ledger (Store Admin)

**Location**: `src/actions/storeAdmin/customer/get-credit-ledger.ts`

```typescript
export const getCreditLedgerAction = storeActionClient
  .metadata({ name: "getCreditLedger" })
  .schema(getCreditLedgerSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, limit = 50, offset = 0 } = parsedInput;
    
    const ledger = await sqlClient.customerCreditLedger.findMany({
      where: { storeId, userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    
    return {
      ledger: ledger.map(entry => ({
        ...entry,
        amount: Number(entry.amount),
        balance: Number(entry.balance),
      })),
    };
  });
```

### 6.7 Get Customer Credit Ledger (Public - Account Page)

**Location**: `src/actions/user/get-credit-ledger.ts`

```typescript
export const getCustomerCreditLedgerAction = userRequiredActionClient
  .metadata({ name: "getCustomerCreditLedger" })
  .schema(getCustomerCreditLedgerSchema)
  .action(async ({ parsedInput }) => {
    const { userId, storeId, limit = 50, offset = 0 } = parsedInput;
    
    // Verify user can only access their own ledger
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (session?.user?.id !== userId) {
      throw new SafeError("Unauthorized");
    }
    
    const whereClause: Prisma.CustomerCreditLedgerWhereInput = {
      userId,
      ...(storeId ? { storeId } : {}), // Optional store filter
    };
    
    const ledger = await sqlClient.customerCreditLedger.findMany({
      where: whereClause,
      include: {
        Store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    
    return {
      ledger: ledger.map(entry => ({
        ...entry,
        amount: Number(entry.amount),
        balance: Number(entry.balance),
      })),
    };
  });
```

**Schema**:

```typescript
const getCustomerCreditLedgerSchema = z.object({
  userId: z.string().min(1),
  storeId: z.string().optional(), // Optional: filter by store
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
```

### 6.8 Get Customer Credit Balances (Public - Account Page)

**Location**: `src/actions/user/get-credit-balances.ts`

```typescript
export const getCustomerCreditBalancesAction = userRequiredActionClient
  .metadata({ name: "getCustomerCreditBalances" })
  .schema(getCustomerCreditBalancesSchema)
  .action(async ({ parsedInput }) => {
    const { userId } = parsedInput;
    
    // Verify user can only access their own balances
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (session?.user?.id !== userId) {
      throw new SafeError("Unauthorized");
    }
    
    const credits = await sqlClient.customerCredit.findMany({
      where: { userId },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return {
      balances: credits.map(credit => ({
        storeId: credit.storeId,
        storeName: credit.Store.name,
        credit: Number(credit.credit),
      })),
    };
  });
```

**Schema**:

```typescript
const getCustomerCreditBalancesSchema = z.object({
  userId: z.string().min(1),
});
```

---

## 7. Security Considerations

### 7.1 Authorization

- **Customer Recharge**: Requires authenticated user (`userRequiredActionClient`)
- **Store Operator Actions**: Requires store admin access (`storeActionClient`)
- **Credit Usage**: Validated during checkout process

### 7.2 Validation

- **Amount Validation**:
  - Must be positive for recharges
  - Must be within `creditMinPurchase` and `creditMaxPurchase` for customer recharges
  - No limits for store operator recharges (but should be logged)
  
- **Balance Validation**:
  - Check sufficient balance before allowing credit usage
  - Prevent negative balances (unless adjustment)

### 7.3 Audit Trail

- All transactions recorded in `CustomerCreditLedger`
- `creatorId` tracks who initiated manual transactions
- `referenceId` links to related orders/payments
- Immutable ledger entries (never updated or deleted)

### 7.4 Transaction Safety

- All credit updates use database transactions
- Ledger entries created in same transaction as balance updates
- Prevents race conditions and data inconsistencies

---

## 8. Edge Cases and Error Handling

### 8.1 Concurrent Transactions

**Problem**: Multiple simultaneous transactions could cause race conditions.

**Solution**: Use database transactions with proper locking:

```typescript
await sqlClient.$transaction(async (tx) => {
  // All operations in single transaction
});
```

### 8.2 Negative Balance

**Problem**: Adjustments or refunds might result in negative balance.

**Solution**:

- Allow negative balances only for `ADJUSTMENT` type
- Validate balance before allowing credit usage
- Show warning in UI for negative balances

### 8.3 Missing CustomerCredit Record

**Problem**: Customer might not have a `CustomerCredit` record yet.

**Solution**: Use `upsert` to create record if it doesn't exist:

```typescript
await tx.customerCredit.upsert({
  where: { storeId_userId: { storeId, userId } },
  update: { credit: { increment: amount } },
  create: { storeId, userId, credit: amount },
});
```

### 8.4 Payment Failure After Order Creation

**Problem**: `StoreOrder` created but payment fails.

**Solution**:

- Do not process credit top-up until payment is confirmed
- Mark order as failed/cancelled
- No ledger entries created

### 8.5 Bonus Rule Changes

**Problem**: Bonus rules might change between order creation and payment.

**Solution**:

- Calculate bonus at payment time (not order creation)
- Use bonus rules active at time of payment
- Record bonus amount in ledger for audit

---

## 9. Implementation Checklist

### 9.1 Customer Recharge Flow

- [ ] Create `rechargeCreditAction` (public action)
- [ ] Create `processCreditTopUpAction` (called after payment)
- [ ] Create recharge order creation logic
- [ ] Integrate with payment gateway webhooks
- [ ] Create customer-facing recharge UI
- [ ] Add validation for min/max purchase amounts

### 9.2 Store Operator Recharge

- [ ] Create `rechargeCustomerCreditAction`
- [ ] Create store admin UI for manual recharge
- [ ] Add operator authentication/authorization
- [ ] Add note field for manual recharges

### 9.3 Credit Usage

- [ ] Integrate credit payment option in checkout
- [ ] Create `useCreditForOrderAction`
- [ ] Add balance validation before checkout
- [ ] Create ledger entry on credit usage

### 9.4 Credit Management

- [ ] Create `getCustomerCreditAction`
- [ ] Create `getCreditLedgerAction`
- [ ] Create `adjustCustomerCreditAction`
- [ ] Create credit history UI
- [ ] Add credit balance display

### 9.5 Bonus System

- [ ] Ensure `calculateBonus` function exists
- [ ] Integrate bonus calculation in top-up flow
- [ ] Create separate ledger entries for bonus
- [ ] Display bonus information in UI

### 9.6 Customer Credit Ledger Review

- [ ] Create `getCustomerCreditLedgerAction` (public action for account page)
- [ ] Create `getCustomerCreditBalancesAction` (public action for account page)
- [ ] Create credit ledger UI component for account page
- [ ] Add "Credit" tab to account page (`/account/`)
- [ ] Display credit balances per store
- [ ] Display transaction history with filtering
- [ ] Add pagination for ledger entries
- [ ] Ensure users can only view their own credit data

### 9.7 StoreLedger Integration

- [ ] Update `StoreLedger` schema to support credit transactions (add `type = 2` and `type = 3`)
- [ ] Create StoreLedger entry when customer recharges credit (after payment confirmation) with positive amount
- [ ] Create StoreLedger entry when credit is used for purchase (revenue recognition) with positive amount
- [ ] Create StoreLedger entry when credit is refunded (revenue reversal) with negative amount
- [ ] **Create StoreLedger entry for manual operator recharges with `amount = 0`** (audit trail, no revenue impact)
- [ ] **Include bonus credit in manual recharge StoreLedger entry** (no separate entry needed)
- [ ] Update revenue reporting queries to include credit transactions
- [ ] Test accounting accuracy (unearned revenue vs. recognized revenue)
- [ ] Verify StoreLedger balance calculations include credit transactions
- [ ] Ensure StoreLedger entries with `amount = 0` do not affect balance calculations

### 9.8 Testing

- [ ] Test customer recharge flow
- [ ] Test store operator recharge
- [ ] Test credit usage
- [ ] Test bonus calculation
- [ ] Test concurrent transactions
- [ ] Test credit ledger review (customer account page)
- [ ] Test authorization (users can only see their own credit)
- [ ] Test edge cases (negative balance, missing records, etc.)

---

## 10. Summary

The Customer Credit system provides a comprehensive solution for store credit management:

1. **Customer Recharge**: Creates `StoreOrder` for payment processing, then updates credit balance
2. **Store Operator Recharge**: Supports two scenarios:
   - **Paid Recharge (In-Person)**: Customer pays cash, creates `StoreOrder` and `StoreLedger` with cash amount
   - **Promotional Recharge**: No payment, creates `StoreLedger` with amount = 0 for audit
3. **Transaction Recording**: All operations recorded in `CustomerCreditLedger` with full audit trail
4. **Bonus System**: Automatic bonus calculation and recording
5. **Credit Ledger Review**: Customers can view their credit history and balances at `/account/`
6. **StoreLedger Integration**: Proper accounting treatment with unearned revenue tracking
7. **Revenue Recognition**: Revenue recognized when credit is used, not when purchased
8. **Security**: Proper authorization, validation, and transaction safety

### 10.1 Accounting Compliance

The system follows GAAP/IFRS accounting standards:

- **Customer Credit Recharge**: Recorded in `StoreLedger` as unearned revenue (liability)
- **Credit Usage**: Recorded in `StoreLedger` as revenue recognition (income)
- **Credit Refund**: Recorded in `StoreLedger` as revenue reversal
- **Paid In-Person Recharge**: StoreLedger entry with actual cash amount (unearned revenue)
- **Promotional Recharge**: StoreLedger entry with `amount = 0` (audit trail, no revenue impact)
- **Bonus Credit**: Included in recharge StoreLedger entry (no separate entry needed)

Store owners can now view accurate revenue reports that distinguish between:

- **Earned Revenue**: Revenue from completed orders (including credit usage)
- **Unearned Revenue**: Customer deposits (credit recharges not yet used)

All credit operations are atomic and recorded in both `CustomerCreditLedger` and `StoreLedger` for complete transparency, auditability, and proper financial reporting.
