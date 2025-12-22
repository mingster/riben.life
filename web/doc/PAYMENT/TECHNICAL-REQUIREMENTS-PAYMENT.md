# Technical Requirements: Payment System

**Date:** 2025-01-27
**Status:** Active
**Version:** 1.0

**Related Documents:**

- [FUNCTIONAL-REQUIREMENTS-PAYMENT.md](./FUNCTIONAL-REQUIREMENTS-PAYMENT.md)
- [FUNCTIONAL-REQUIREMENTS-RSVP.md](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [FUNCTIONAL-REQUIREMENTS-CREDIT.md](../CREDIT/FUNCTIONAL-REQUIREMENTS-CREDIT.md)

---

## 1. Overview

This document specifies the technical architecture, implementation patterns, and technical constraints for the Payment System. It complements the Functional Requirements document by providing technical implementation details for payment processing, payment method plugins, fee calculation, and store ledger integration.

The payment system implements a plugin-based architecture where payment methods are installable, configurable plugins that can be added without modifying core system code.

---

## 2. Architecture

### 2.1 Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** Better Auth
- **Validation:** Zod v4
- **State Management:** React Server Components (default), Client Components with local state
- **Data Fetching:** SWR (client-side), Server Components (server-side)
- **UI Framework:** React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- **Icons:** @tabler/icons-react
- **Package Manager:** Bun
- **Payment Gateways:**
  - Stripe (via `stripe` package)
  - LINE Pay (via `@line/bot-sdk` or custom integration)

### 2.2 Application Architecture

#### 2.2.1 Server Actions Pattern

All payment-related data mutations use Next.js Server Actions with `next-safe-action` wrapper:

```typescript
// Pattern: actions/store/[feature]/[action-name].ts
export const [actionName]Action = [actionClient]
  .metadata({ name: "[actionName]" })
  .schema([validationSchema])
  .action(async ({ parsedInput, bindArgsClientInputs }) => {
    // Implementation
  });
```

**Action Client Types:**

- `storeActionClient` - For store admin actions (requires store membership)
- `userRequiredActionClient` - For authenticated user actions (e.g., credit recharge)
- `adminActionClient` - For system admin actions (e.g., payment method management)
- `baseClient` - For public/unauthenticated actions (e.g., payment confirmation webhooks)

#### 2.2.2 Component Architecture

- **Server Components (default):** Payment confirmation pages, order status pages
- **Client Components:** Payment forms, payment method selection, checkout flows
- **Pattern:** Server page → Client component → Server actions

#### 2.2.3 Payment Flow Architecture

1. **Order Creation:** Server action creates `StoreOrder` with `paymentStatus = Pending`
2. **Payment Processing:** Delegated to payment method plugin (redirect to gateway or internal processing)
3. **Payment Confirmation:** Server action verifies payment and updates order status
4. **State Updates:** Client components update local state after successful payment confirmation

---

## 3. Database Schema

### 3.1 Core Models

#### 3.1.1 PaymentMethod

```prisma
model PaymentMethod {
  id                        String                      @id @default(uuid())
  name                      String                      @unique
  payUrl                    String                      @default("") // Plugin identifier: "stripe", "linepay", "credit", "cash"
  priceDescr                String                      @default("")
  fee                       Decimal                     @default("0.029") // Fee rate (percentage)
  feeAdditional             Decimal                     @default("0") // Additional fee (flat amount)
  clearDays                 Int                         @default(3) // Days until funds are available
  isDeleted                 Boolean                     @default(false)
  isDefault                 Boolean                     @default(false)
  canDelete                 Boolean                     @default(false) // Store owner cannot delete this method
  createdAt                 BigInt // Epoch milliseconds
  updatedAt                 BigInt // Epoch milliseconds
  
  StorePaymentMethodMapping StorePaymentMethodMapping[]
  StoreOrder                StoreOrder[]

  @@index([isDefault])
  @@index([name])
  @@index([payUrl])
  @@index([isDeleted])
  @@index([updatedAt])
  @@index([createdAt])
}
```

**Field Descriptions:**

- `payUrl`: Plugin identifier that maps to payment method plugin implementation
- `fee`: Fee rate as decimal (e.g., 0.029 = 2.9%)
- `feeAdditional`: Additional flat fee amount
- `clearDays`: Number of days until payment is available to store (for revenue recognition timing)

#### 3.1.2 StorePaymentMethodMapping

```prisma
model StorePaymentMethodMapping {
  id                 String  @id @default(uuid())
  storeId            String
  methodId           String
  paymentDisplayName String? // Optional custom display name for store

  Store         Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  PaymentMethod PaymentMethod @relation(fields: [methodId], references: [id], onDelete: Cascade)

  @@unique([storeId, methodId])
  @@index([storeId])
  @@index([methodId])
}
```

**Purpose:** Maps payment methods to stores, enabling stores to enable/disable specific payment methods.

#### 3.1.3 StoreOrder

```prisma
model StoreOrder {
  id                String          @id @default(uuid())
  storeId           String
  userId            String? // Optional for anonymous orders
  facilityId        String?
  orderNum          Int?            @default(autoincrement()) // Unique at database level
  pickupCode        String?
  isPaid            Boolean         @default(false)
  paidDate          BigInt? // Epoch milliseconds
  checkoutAttributes String         @default("") // JSON string for plugin-specific data (e.g., rsvpId, payment intent IDs)
  checkoutRef       String          @default("") // Reference ID from payment gateway (e.g., transaction ID)
  currency          String          @default("twd")
  currencyRate      Decimal         @default(1)
  discount          Decimal         @default(0)
  paymentMethodId   String? // Optional payment method
  paymentStatus     Int             @default(10) // PaymentStatus enum (10 = Pending)
  refundAmount      Decimal         @default(0)
  returnStatus      Int             @default(0)
  shippingMethodId  String
  shippingAddress   String          @default("")
  shippingCost      Decimal         @default(0)
  shippingStatus    Int             @default(10)
  orderStatus       Int             @default(10) // OrderStatus enum (10 = Pending)
  paymentCost       Decimal         @default(0) // Total fees (gateway fees + platform fees)
  taxRate           Decimal         @default(0)
  orderTax          Decimal         @default(0)
  orderTotal        Decimal         @default(0)
  createdAt         BigInt // Epoch milliseconds
  updatedAt         BigInt // Epoch milliseconds
  // Note: RSVP relationship is reverse - Rsvp.orderId references StoreOrder.id

  Store                 Store                @relation("StoreToOrder", fields: [storeId], references: [id], onDelete: Cascade)
  User                  User?                @relation("UserOrders", fields: [userId], references: [id])
  OrderNotes            OrderNote[]          @relation("orderNoteToStoreOrder")
  OrderItems            OrderItem[]          @relation("itemToStoreOrder")
  OrderItemView         orderitemview[]      @relation("itemViewToStoreOrder")
  ShippingMethod        ShippingMethod       @relation(fields: [shippingMethodId], references: [id])
  Shipment              Shipment[]
  PaymentMethod         PaymentMethod?       @relation(fields: [paymentMethodId], references: [id])
  Rsvp                  Rsvp[]               // Reverse relation: RSVPs linked via Rsvp.orderId
  StoreLedger           StoreLedger[]
  customerCreditLedgers CustomerCreditLedger[]

  @@index([userId])
  @@index([facilityId])
  @@index([paymentMethodId])
  @@index([paymentStatus])
  @@index([returnStatus])
  @@index([shippingMethodId])
  @@index([shippingStatus])
  @@index([storeId])
  @@index([checkoutAttributes])
  @@index([isPaid])
  @@index([paidDate])
  @@index([currency])
  @@index([orderStatus])
  @@index([createdAt])
  @@index([updatedAt])
}
```

**Payment-Related Fields:**

- `paymentMethodId`: References `PaymentMethod` (plugin identifier via `payUrl`)
- `paymentStatus`: PaymentStatus enum (10=Pending, 11=SelfPickup, 20=Authorized, 30=Paid, 40=PartiallyRefunded, 50=Refunded, 60=Voided)
- `orderStatus`: OrderStatus enum (10=Pending, 20=Processing, 30=InShipping, 40=Completed, 50=Confirmed, 60=Refunded, 90=Voided)
- `isPaid`: Boolean flag indicating payment received
- `paidDate`: Timestamp when payment was completed (BigInt epoch milliseconds)
- `paymentCost`: Total fees (negative value, sum of gateway fees and platform fees)
- `checkoutAttributes`: JSON string storing plugin-specific data (e.g., `{"rsvpId": "...", "creditRecharge": true}` or Stripe payment intent ID)
- `checkoutRef`: Reference ID from payment gateway (e.g., Stripe payment intent ID, LINE Pay transaction ID)

#### 3.1.4 StoreLedger

```prisma
model StoreLedger {
  id          String   @id @default(uuid())
  storeId     String
  orderId     String // Required (not optional in actual schema)
  amount      Decimal  // Positive for revenue, negative for fees/refunds
  fee         Decimal  // Payment gateway fee (negative)
  platformFee Decimal  // Platform fee (negative, Free stores only)
  currency    String   @default("twd")
  type        Int      @default(0) // StoreLedgerType enum (0: PlatformPayment, 1: StorePaymentProvider, 2: CreditRecharge, 3: CreditUsage)
  balance     Decimal  // Running balance after this transaction
  description String   // Required (not optional in actual schema)
  note        String?
  createdBy   String?  // userId who created this ledger entry
  availability BigInt  // Epoch milliseconds - when funds become available
  createdAt   BigInt   // Epoch milliseconds

  StoreOrder StoreOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  CreatedBy  User?      @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  // Note: storeId field exists but no Store relation defined (storeId validated via StoreOrder.storeId)

  @@index([storeId])
  @@index([orderId])
  @@index([type])
  @@index([createdAt])
  @@index([createdBy])
  // Note: availability index not present in actual schema
}
```

**Payment-Related Types:**

- `type = 0`: PlatformPayment (代收) - Platform payment processing
- `type = 1`: StorePaymentProvider - Store's own payment provider (if store uses own gateway)
- `type = 2`: CreditRecharge - Customer credit recharge (unearned revenue - liability)
- `type = 3`: CreditUsage - Credit usage (revenue recognition)

**Additional Fields:**

- `createdBy`: Optional userId field for tracking who created the ledger entry (store operator for manual entries)
- `description`: Required field (not optional) - description of the ledger entry
- `orderId`: Required field (not optional) - all ledger entries must be associated with an order

**Fee Fields:**

- `fee`: Payment gateway fee (negative amount)
- `platformFee`: Platform fee (negative amount, Free stores only)
- `amount`: Order amount (positive) or refund amount (negative)

### 3.2 Database Constraints

- **Unique Constraints:**
  - `PaymentMethod.name` - Unique payment method names
  - `StorePaymentMethodMapping.storeId + methodId` - One mapping per store per payment method
  - `StoreOrder.orderNum` - Unique order numbers (auto-incrementing integer) - Note: Unique constraint exists but not explicitly shown in model definition

- **Indexes:**
  - All foreign keys indexed for query performance
  - `PaymentMethod.payUrl` indexed for plugin lookup
  - `StoreOrder` indexes: `userId`, `facilityId`, `paymentMethodId`, `paymentStatus`, `returnStatus`, `shippingMethodId`, `shippingStatus`, `storeId`, `checkoutAttributes`, `isPaid`, `paidDate`, `currency`, `orderStatus`, `createdAt`, `updatedAt`
  - `StoreLedger.type` indexed for filtering by transaction type
  - `StoreLedger.createdBy` indexed (userId who created ledger entry)
  - Note: `StoreLedger.availability` index not present in actual schema (though field exists)

- **Cascade Deletes:**
  - Store deletion cascades to orders and ledger entries
  - Payment method deletion prevented if used by orders (`canDelete` flag)
  - User deletion cascades to orders (optional via `userId`)

---

## 4. Payment Method Plugin Interface

### 4.1 Plugin Interface Definition

Payment method plugins must implement the following interface:

```typescript
interface PaymentMethodPlugin {
  // Plugin metadata
  identifier: string; // Unique plugin ID (e.g., "stripe", "linepay", "credit", "cash")
  name: string; // Display name
  description: string;
  version: string;

  // Core payment methods
  processPayment(
    order: StoreOrder,
    config: PluginConfig
  ): Promise<PaymentResult>;

  confirmPayment(
    orderId: string,
    paymentData: PaymentData,
    config: PluginConfig
  ): Promise<PaymentConfirmation>;

  verifyPaymentStatus(
    orderId: string,
    paymentData: PaymentData,
    config: PluginConfig
  ): Promise<PaymentStatus>;

  // Fee calculation
  calculateFees(
    amount: number,
    config: PluginConfig
  ): FeeStructure;

  // Configuration
  validateConfiguration(config: PluginConfig): ValidationResult;

  // Availability check
  checkAvailability(
    order: StoreOrder,
    config: PluginConfig
  ): AvailabilityResult;
}
```

### 4.2 Type Definitions

```typescript
interface PaymentResult {
  success: boolean;
  redirectUrl?: string; // For external payment gateways
  paymentData?: PaymentData; // For storing payment intent/transaction IDs
  error?: string;
}

interface PaymentConfirmation {
  success: boolean;
  paymentStatus: "paid" | "failed" | "pending";
  paymentData?: PaymentData;
  error?: string;
}

interface PaymentStatus {
  status: "paid" | "failed" | "pending";
  paymentData?: PaymentData;
}

interface FeeStructure {
  feeRate: number; // Percentage (e.g., 0.029 = 2.9%)
  feeAdditional: number; // Flat amount
  calculateFee(amount: number): number; // Total fee calculation
}

interface PluginConfig {
  storeId: string;
  platformConfig?: Record<string, any>; // Platform-level configuration
  storeConfig?: Record<string, any>; // Store-level configuration (overrides platform)
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface AvailabilityResult {
  available: boolean;
  reason?: string;
}

interface PaymentData {
  [key: string]: any; // Plugin-specific data (e.g., payment intent ID, transaction ID)
}
```

### 4.3 Plugin Registration

Plugins are registered in the system via `PaymentMethod` table records:

- `payUrl` field stores the plugin identifier
- Platform-level configuration stored separately (future enhancement)
- Store-level configuration via `StorePaymentMethodMapping` and plugin-specific config tables

---

## 5. API Design

### 5.1 Server Actions

#### 5.1.1 Order Payment Actions

**Location:** `src/actions/store/order/`

- `create-order.ts` - Create store order (checkout)
- `mark-order-as-paid.ts` - Mark order as paid (cash/in-person, admin)

**Location:** `src/actions/storeAdmin/order/`

- `mark-order-as-paid.ts` - Mark order as paid (store admin)

**Validation Files:** `[action-name].validation.ts`

**Create Order Action:**

**Location:** `src/actions/store/order/create-order.ts`

```typescript
export const createOrderAction = userRequiredActionClient
  .metadata({ name: "createOrder" })
  .schema(createOrderSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, userId, facilityId, total, currency, productIds, quantities, unitPrices, variants, variantCosts, orderNote, shippingMethodId, paymentMethodId } = parsedInput;
    
    // 1. Validate products exist and belong to store
    // 2. Validate store exists
    // 3. Validate shipping method exists and is not deleted
    // 4. Validate payment method exists and is not deleted
    // 5. Determine order status based on store.autoAcceptOrder
    // 6. Create StoreOrder with:
    //    - OrderItems (createMany from products array)
    //    - OrderNotes (single note entry)
    //    - paymentStatus: Pending
    //    - orderStatus: Processing (if autoAcceptOrder) or Pending
    //    - pickupCode: random 6-digit code
    // 7. Fetch complete order with all relations
    // 8. Transform Prisma data for JSON serialization
    // 9. Log order creation
    // 10. Return order
    
    return { order };
  });
```

**Implementation Details:**

- Uses `userRequiredActionClient` (requires authenticated user, but userId can be null for guest orders)
- Validates all input arrays have matching lengths
- Creates order items using `createMany` for efficiency
- Generates random 6-digit pickup code
- Returns complete order with all relations for client use

**Mark Order as Paid Action (Store Level):**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`

```typescript
export const markOrderAsPaidAction = baseClient
  .metadata({ name: "markOrderAsPaid" })
  .schema(markOrderAsPaidSchema)
  .action(async ({ parsedInput }) => {
    const { orderId, checkoutAttributes } = parsedInput;
    
    // 1. Get order with Store and PaymentMethod relations
    // 2. Check if order is already paid (return early if so)
    // 3. Determine if platform payment processing is used:
    //    - Free stores: always use platform
    //    - Pro stores: use platform if LINE_PAY_ID or STRIPE_SECRET_KEY configured
    // 4. Get last ledger balance
    // 5. Calculate fees (only for platform payments):
    //    - fee = orderTotal * paymentMethod.fee + paymentMethod.feeAdditional
    //    - feeTax = fee * 0.05
    // 6. Calculate platform fee (Free stores only: 1% of orderTotal)
    // 7. Calculate availability date (order.updatedAt + paymentMethod.clearDays)
    // 8. In transaction:
    //    - Update order: isPaid=true, paidDate, orderStatus=Processing, paymentStatus=Paid
    //    - Create StoreLedger entry:
    //      * type: PlatformPayment (0) or StorePaymentProvider (1)
    //      * amount: orderTotal (positive)
    //      * fee: gateway fees (negative)
    //      * platformFee: platform fee (negative, Free stores only)
    //      * availability: calculated availability date
    // 9. Fetch updated order with all relations
    // 10. Transform and return order
    
    return { order };
  });
```

**Implementation Details:**

- Uses `baseClient` (no authentication required) - can be called from webhooks or admin interfaces
- Idempotent: returns existing order if already paid
- Fee calculation based on payment method configuration
- Platform fee (1%) only applies to Free-level stores
- StoreLedger type distinguishes platform vs store-owned payment processing

**Mark Order as Paid Action (Store Admin):**

**Location:** `src/actions/storeAdmin/order/mark-order-as-paid.ts`

```typescript
export const markOrderAsPaidAction = storeActionClient
  .metadata({ name: "markOrderAsPaid" })
  .schema(markOrderAsPaidSchema)
  .action(async ({ parsedInput, bindArgsClientInputs }) => {
    const storeId = bindArgsClientInputs[0] as string;
    const { orderId, checkoutAttributes } = parsedInput;
    
    // 1. Get order with Store and PaymentMethod relations
    // 2. Validate order belongs to the store (storeId match)
    // 3. Check if order is already paid (return early if so)
    // 4. Determine if platform payment processing is used (same logic as store-level)
    // 5. Calculate fees and platform fees (same logic as store-level)
    // 6. Mark order as paid and create ledger entry (same logic as store-level)
    // 7. Fetch updated order with all relations
    // 8. Transform and return order
    
    return { order };
  });
```

**Implementation Details:**

- Uses `storeActionClient` (requires store membership with appropriate role)
- Validates order belongs to the store before processing
- Same fee calculation and ledger logic as store-level action
- Intended for store admin interfaces to manually mark orders as paid

#### 5.1.2 Credit Recharge Actions

**Location:** `src/actions/store/credit/`

- `create-recharge-order.ts` - Create credit recharge order
- `process-credit-topup-after-payment.ts` - Process credit top-up after payment confirmation

**Validation Files:** `[action-name].validation.ts`

**Create Recharge Order Action:**

**Location:** `src/actions/store/credit/create-recharge-order.ts`

```typescript
export const createRechargeOrderAction = userRequiredActionClient
  .metadata({ name: "createRechargeOrder" })
  .schema(createRechargeOrderSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, creditAmount, paymentMethodId, rsvpId } = parsedInput;
    
    // Validation: Check store credit system enabled
    // Validation: Check credit amount against min/max limits
    // Validation: Validate payment method exists and is enabled for store
    // Calculate dollar amount from credit amount using creditExchangeRate
    // Create StoreOrder with:
    //   - paymentMethodId: Selected payment method ID
    //   - checkoutAttributes: JSON string containing rsvpId (if provided) and creditRecharge flag
    //   - paymentStatus: Pending
    //   - orderStatus: Pending
    //   - isPaid: false
    
    return { order: createdOrder };
  });
```

**Implementation Details:**

- Validates store has credit system enabled (`useCustomerCredit`)
- Validates credit amount against store min/max purchase limits
- Validates payment method exists, is not deleted, and is enabled for the store (via `StorePaymentMethodMapping`)
- Calculates dollar amount: `dollarAmount = creditAmount * creditExchangeRate`
- Stores `rsvpId` in `checkoutAttributes` JSON for later processing
- Creates order with `paymentStatus = Pending`, `orderStatus = Pending`
- Payment method selection: Customer must select a payment method from available payment methods for the store
- After order creation, client redirects to: `/checkout/${orderId}/${paymentMethod.payUrl}` (standard payment URL pattern)

**Process Credit Top-Up After Payment:**

**Location:** `src/actions/store/credit/process-credit-topup-after-payment.ts`

```typescript
export const processCreditTopUpAfterPaymentAction = baseClient
  .metadata({ name: "processCreditTopUpAfterPayment" })
  .schema(processCreditTopUpAfterPaymentSchema)
  .action(async ({ parsedInput }) => {
    const { orderId } = parsedInput;
    
    // 1. Get order with Store, User, and PaymentMethod relations
    // 2. Validate order exists and has userId
    // 3. Check idempotency: Look for existing CustomerCreditLedger entry with referenceId = orderId, type = "TOPUP"
    // 4. If already processed, mark order as paid (if not already) and return early
    // 5. Calculate credit amount from dollar amount: creditAmount = dollarAmount / creditExchangeRate
    // 6. Process credit top-up (including bonus calculation) via processCreditTopUp()
    //    - Creates CustomerCreditLedger entry (type: TOPUP)
    //    - Updates CustomerCredit balance
    // 7. Calculate fees (gateway fees, platform fees) from PaymentMethod
    // 8. Create StoreLedger entry in transaction:
    //    - type: CreditRecharge (unearned revenue)
    //    - amount: dollarAmount (positive)
    //    - fee: gateway fees (negative)
    //    - platformFee: platform fee (negative, Free stores only)
    //    - availability: based on PaymentMethod.clearDays
    // 9. Mark order as paid in same transaction:
    //    - isPaid: true
    //    - paidDate: current timestamp
    //    - paymentStatus: Paid
    //    - orderStatus: Completed
    // 10. Parse checkoutAttributes to check for rsvpId
    // 11. If rsvpId present, process RSVP prepaid payment via processRsvpPrepaidPayment()
    //     - Updates RSVP: alreadyPaid, orderId, status, paidAt
    
    return { success: true, orderId, amount, bonus, totalCredit };
  });
```

**Implementation Details:**

- Uses `baseClient` (no authentication required) for webhook/payment confirmation callbacks
- Idempotency check prevents duplicate credit top-ups
- Credit top-up includes bonus calculation via `processCreditTopUp()` from `@/lib/credit-bonus`
- Fee calculation uses PaymentMethod's fee and feeAdditional fields
- Platform fee (1%) only applies to Free-level stores
- StoreLedger type is `CreditRecharge` (unearned revenue/liability)
- If `rsvpId` in checkoutAttributes, automatically processes RSVP prepaid payment after recharge

#### 5.1.3 RSVP Prepaid Payment Actions

**Location:** `src/actions/store/reservation/`

- `process-rsvp-prepaid-payment.ts` - Process RSVP prepaid payment using customer credit

**Shared Function:**

**Location:** `src/actions/store/reservation/process-rsvp-prepaid-payment.ts`

```typescript
export async function processRsvpPrepaidPayment(
  params: ProcessRsvpPrepaidPaymentParams
): Promise<ProcessRsvpPrepaidPaymentResult> {
  const {
    storeId,
    customerId,
    prepaidRequired,
    minPrepaidAmount,
    rsvpTime,
    store,
  } = params;

  // 1. Determine initial status:
  //    - If prepaid NOT required: status = ReadyToConfirm
  //    - If prepaid required: status = Pending (will be updated after payment)

  // 2. If prepaid required and customer signed in:
  //    - Get customer credit balance
  //    - Check if balance >= minPrepaidAmount
  //    - If sufficient:
  //      a. Calculate cash value: cashValue = minPrepaidAmount * creditExchangeRate
  //      b. Find credit payment method by payUrl = "credit"
  //      c. Find shipping method (prefer "reserve", fallback to default)
  //      d. In transaction:
  //         - Create StoreOrder:
  //           * paymentMethodId: credit payment method ID
  //           * orderTotal: cashValue
  //           * paymentStatus: Paid
  //           * orderStatus: Confirmed
  //           * isPaid: true
  //           * paidDate: current timestamp
  //         - Deduct credit from CustomerCredit balance
  //         - Create CustomerCreditLedger entry (type: SPEND, negative amount)
  //         - Create StoreLedger entry:
  //           * type: CreditUsage (revenue recognition)
  //           * amount: cashValue (positive)
  //           * fee: 0, platformFee: 0 (credit payments have no fees)
  //           * availability: immediate (getUtcNowEpoch())
  //      e. Update status to ReadyToConfirm, alreadyPaid = true, orderId = created order ID

  // 3. Return result: { status, alreadyPaid, orderId }
}
```

**Implementation Details:**

- Shared function (not a server action) - can be called from other actions
- Only processes prepaid payment if:
  - `prepaidRequired` is true
  - `customerId` exists
  - Store has `useCustomerCredit` enabled
  - `minPrepaidAmount` > 0
  - Customer has sufficient credit balance
- Creates StoreOrder with credit payment method (`payUrl = "credit"`)
- Uses transaction to ensure atomicity (order creation, credit deduction, ledger entries)
- StoreLedger type is `CreditUsage` (revenue recognition, not unearned)
- Credit payments have zero fees (no gateway fees, no platform fees)
- Returns status, alreadyPaid flag, and orderId for RSVP update

**Parameters Interface:**

```typescript
interface ProcessRsvpPrepaidPaymentParams {
  storeId: string;
  customerId: string | null;
  prepaidRequired: boolean;
  minPrepaidAmount: number | null; // In credit points
  rsvpTime: BigInt | number | Date;
  store: {
    useCustomerCredit: boolean | null;
    creditExchangeRate: number | null;
    defaultCurrency: string | null;
    defaultTimezone?: string | null;
  };
}

interface ProcessRsvpPrepaidPaymentResult {
  status: number; // RsvpStatus enum value
  alreadyPaid: boolean;
  orderId: string | null;
}
```

#### 5.1.4 Payment Method Management Actions

**System Admin Actions:**

**Location:** `src/actions/sysAdmin/paymentMethod/`

- `create-payment-method.ts` - Create payment method (System Admin)
- `update-payment-method.ts` - Update payment method (System Admin)
- `delete-payment-method.ts` - Delete payment method (System Admin)

**Create Payment Method:**

**Location:** `src/actions/sysAdmin/paymentMethod/create-payment-method.ts`

```typescript
export const createPaymentMethodAction = adminActionClient
  .metadata({ name: "createPaymentMethod" })
  .schema(createPaymentMethodSchema)
  .action(async ({ parsedInput }) => {
    const {
      name,
      payUrl,
      priceDescr,
      fee,
      feeAdditional,
      clearDays,
      isDeleted,
      isDefault,
      canDelete,
    } = parsedInput;

    // 1. Check if name already exists (unique constraint)
    // 2. Create PaymentMethod with provided fields
    // 3. Set createdAt and updatedAt to current timestamp (BigInt epoch)
    // 4. Include _count for StorePaymentMethodMapping and StoreOrder
    // 5. Transform result using mapPaymentMethodToColumn
    // 6. Return transformed payment method
    
    return { paymentMethod: transformed };
  });
```

**Validation Schema:**

```typescript
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  payUrl: z.string().default(""), // Plugin identifier (e.g., "stripe", "linepay", "credit", "cash")
  priceDescr: z.string().default(""), // Description of pricing/fees
  fee: z.coerce.number().default(0.029), // Fee rate (e.g., 0.029 = 2.9%)
  feeAdditional: z.coerce.number().default(0), // Additional fixed fee
  clearDays: z.coerce.number().int().default(3), // Days until funds are available
  isDeleted: z.boolean().default(false),
  isDefault: z.boolean().default(false), // Default payment method for all stores
  canDelete: z.boolean().default(false), // Whether store owners can delete this method
});
```

**Implementation Details:**

- Uses `adminActionClient` (requires System Admin role)
- Validates unique `name` constraint (PaymentMethod.name is unique)
- `payUrl` field identifies the plugin (must match plugin identifier)
- Default values: fee = 2.9%, feeAdditional = 0, clearDays = 3
- Creates PaymentMethod record with BigInt timestamps
- Returns payment method with counts of related mappings and orders

**Update Payment Method:**

**Location:** `src/actions/sysAdmin/paymentMethod/update-payment-method.ts`

```typescript
export const updatePaymentMethodAction = adminActionClient
  .metadata({ name: "updatePaymentMethod" })
  .schema(updatePaymentMethodSchema)
  .action(async ({ parsedInput }) => {
    const {
      id,
      name,
      payUrl,
      priceDescr,
      fee,
      feeAdditional,
      clearDays,
      isDeleted,
      isDefault,
      canDelete,
    } = parsedInput;

    // 1. Verify payment method exists
    // 2. If name is being changed, check new name doesn't already exist
    // 3. Update PaymentMethod with provided fields
    // 4. Update updatedAt to current timestamp (BigInt epoch)
    // 5. Include _count for StorePaymentMethodMapping and StoreOrder
    // 6. Transform result using mapPaymentMethodToColumn
    // 7. Return transformed payment method
    
    return { paymentMethod: transformed };
  });
```

**Validation Schema:**

```typescript
export const updatePaymentMethodSchema = createPaymentMethodSchema.extend({
  id: z.string().min(1, "ID is required"),
});
```

**Implementation Details:**

- Uses `adminActionClient` (requires System Admin role)
- Validates payment method exists before update
- Validates unique `name` if name is being changed
- All fields from create schema are updatable
- Updates `updatedAt` timestamp
- Returns updated payment method with counts

**Delete Payment Method:**

**Location:** `src/actions/sysAdmin/paymentMethod/delete-payment-method.ts`

```typescript
export const deletePaymentMethodAction = adminActionClient
  .metadata({ name: "deletePaymentMethod" })
  .schema(deletePaymentMethodSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    // 1. Verify payment method exists
    // 2. Delete PaymentMethod record
    //    - Cascades to StorePaymentMethodMapping (onDelete: Cascade)
    //    - StoreOrder.paymentMethodId becomes null (no cascade)
    // 3. Return deleted payment method ID
    
    return { id };
  });
```

**Validation Schema:**

```typescript
export const deletePaymentMethodSchema = z.object({
  id: z.string().min(1, "ID is required"),
});
```

**Implementation Details:**

- Uses `adminActionClient` (requires System Admin role)
- Hard delete (not soft delete via `isDeleted`)
- Cascades to `StorePaymentMethodMapping` (relations are deleted)
- `StoreOrder` records are NOT deleted, but `paymentMethodId` may become invalid
- Consider checking for existing orders before allowing delete

**Store Admin Actions:**

**Location:** `src/actions/storeAdmin/settings/`

- `update-store-payment-methods.ts` - Enable/disable payment methods for store

**Update Store Payment Methods:**

**Location:** `src/actions/storeAdmin/settings/update-store-payment-methods.ts`

```typescript
export const updateStorePaymentMethodsAction = storeActionClient
  .metadata({ name: "updateStorePaymentMethods" })
  .schema(updateStorePaymentMethodsSchema)
  .action(async ({ parsedInput, bindArgsClientInputs }) => {
    const storeId = bindArgsClientInputs[0] as string;
    const { methodIds } = parsedInput;

    // 1. Verify user is store owner/admin (via storeActionClient)
    // 2. In transaction:
    //    a. Delete all existing StorePaymentMethodMapping records for store
    //    b. Create new StorePaymentMethodMapping records for provided methodIds
    // 3. Fetch updated store with StorePaymentMethods and PaymentMethod relations
    // 4. Transform result for JSON serialization
    // 5. Return updated store
    
    return { store };
  });
```

**Validation Schema:**

```typescript
export const updateStorePaymentMethodsSchema = z.object({
  methodIds: z.array(z.string().min(1)), // Array of PaymentMethod IDs
});
```

**Implementation Details:**

- Uses `storeActionClient` (requires store membership: owner, storeAdmin, staff, or sysAdmin)
- `storeId` is passed as bound argument (first parameter)
- Transaction ensures atomic update (all mappings replaced atomically)
- Empty `methodIds` array results in all payment methods being disabled for the store
- Returns updated store with enabled payment methods and their details
- This action enables/disables payment methods for checkout (doesn't create PaymentMethod records)

### 5.2 API Routes

#### 5.2.1 Payment Confirmation Routes

**Stripe Checkout Confirmation:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx`

**Implementation:**

```typescript
export default async function StripeConfirmedPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
  }>;
}) {
  // 1. Extract orderId from params and payment_intent from searchParams
  // 2. Verify payment_intent and payment_intent_client_secret are present
  // 3. Verify redirect_status === "succeeded"
  // 4. Retrieve PaymentIntent from Stripe API using payment_intent and client_secret
  // 5. Verify PaymentIntent.status === "succeeded"
  // 6. Prepare checkoutAttributes JSON with payment_intent and client_secret
  // 7. Call markOrderAsPaidAction({ orderId, checkoutAttributes })
  // 8. Log success/error
  // 9. Redirect to success page: /checkout/{orderId}/stripe/success
}
```

**Implementation Details:**

- Server component (page.tsx) - handles Stripe redirect after payment
- Verifies PaymentIntent status via Stripe API before processing
- Uses `markOrderAsPaidAction` from `@/actions/store/order/mark-order-as-paid`
- Stores payment intent data in `checkoutAttributes` for reference
- Handles Next.js redirect errors properly (doesn't log them)
- Shows loading state with `SuccessAndRedirect` component during processing

**Credit Recharge Payment Processing:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx` (standard checkout route)

**Implementation:**

Credit recharge orders use the same payment processing routes as regular store orders. After order creation:

1. Client redirects to: `/checkout/${orderId}/${paymentMethod.payUrl}` (standard payment URL pattern)
2. Payment processing follows the same flow as regular orders
3. After payment confirmation, redirects to: `/checkout/${orderId}/stripe/success`
4. Success page calls `processCreditTopUpAfterPaymentAction({ orderId })` which:
   - Processes credit top-up (adds credit to customer balance)
   - Calculates and applies bonus credit (if applicable)
   - Marks order as paid
   - Creates StoreLedger entry
   - Processes RSVP prepaid payment if `rsvpId` is in checkoutAttributes

**Implementation Details:**

- Uses standard checkout payment routes (not recharge-specific routes)
- Payment confirmation handled by standard Stripe confirmed page
- Success page includes RSVP redirect logic for recharge orders linked to reservations
- All payment processing uses unified `/checkout/[orderId]/[payUrl]` pattern

**LINE Pay Confirmation:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx`

**Implementation:**

```typescript
export default async function LinePayConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 1. Extract orderId and transactionId from searchParams
  // 2. Get order from database
  // 3. Verify transactionId matches order.checkoutAttributes
  // 4. Check if order is already paid (early return if yes)
  // 5. Get store and create LINE Pay client
  // 6. Call LINE Pay confirm API with transactionId, currency, and amount
  // 7. Verify response returnCode === "0000"
  // 8. Call markOrderAsPaidAction({ orderId, checkoutAttributes })
  // 9. Log success/error
  // 10. Redirect to success page: /checkout/{orderId}/linePay/success
}
```

**Implementation Details:**

- Server component (page.tsx) - handles LINE Pay redirect after payment
- Verifies transaction ID matches order's checkoutAttributes (security check)
- Calls LINE Pay confirm API to finalize payment
- Uses `markOrderAsPaidAction` from `@/actions/store/order/mark-order-as-paid`
- Stores transaction data in `checkoutAttributes` for reference
- Handles idempotency (returns early if order already paid)
- Shows loading state with `SuccessAndRedirect` component if order already paid

#### 5.2.2 Payment Processing Routes

**Stripe Payment Intent Creation Route:**

**Location:** `src/app/api/payment/stripe/create-payment-intent/route.ts`

**Endpoint:** `POST /api/payment/stripe/create-payment-intent`

**Request Body:**

```typescript
{
  total: number;              // Order total in currency units (e.g., 100.00)
  currency: string;           // ISO currency code (e.g., "usd", "twd")
  stripeCustomerId?: string;  // Optional Stripe customer ID
  orderId?: string;          // Optional order ID (for webhook metadata)
  storeId?: string;          // Optional store ID (for webhook metadata)
}
```

**Response:**

```typescript
{
  id: string;                 // PaymentIntent ID
  client_secret: string;       // Client secret for Stripe Elements
  amount: number;             // Amount in cents
  currency: string;           // Currency code
  status: string;             // PaymentIntent status
  metadata: {
    orderId?: string;        // Order ID (if provided)
    storeId?: string;        // Store ID (if provided)
  }
}
```

**Implementation Details:**

- Validates `total` is a positive number
- Validates `currency` is provided
- Converts `total` to cents (multiplies by 100) for Stripe API
- Includes `orderId` and `storeId` in metadata for webhook processing
- Returns PaymentIntent with `client_secret` for client-side payment processing

**Error Handling:**

- Returns 400 if `total` or `currency` is missing/invalid
- Returns 500 if Stripe API call fails
- Logs errors with structured metadata

**Usage:**

```typescript
// In payment-stripe.tsx or similar
const response = await fetch("/api/payment/stripe/create-payment-intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    total: Number(order.orderTotal),
    currency: order.currency,
    orderId: order.id,        // Include for webhook processing
    storeId: order.storeId,   // Include for webhook processing
  }),
});

const paymentIntent = await response.json();
const clientSecret = paymentIntent.client_secret;
```

**LINE Pay Payment Request Route:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/page.tsx`

**Endpoint:** Server-side page (not API route)

**Process:**

- Fetches order by `orderId`
- Creates LINE Pay payment request via `linePayClient.request.send()`
- Stores `transactionId` in `order.checkoutAttributes`
- Stores `paymentAccessToken` in `order.checkoutRef`
- Redirects user to LINE Pay payment page (web or app URL based on device)

**Implementation Details:**

- Validates order exists and is not already paid
- Creates LINE Pay request with order details
- Handles mobile vs desktop redirect URLs
- Logs payment request creation with structured metadata

**Error Handling:**

- Returns error if order not found
- Returns error if LINE Pay API returns non-"0000" code
- Logs errors with full context

**Stripe Webhook Handler:**

**Location:** `src/app/api/payment/stripe/webhooks/route.ts`

**Endpoint:** `POST /api/payment/stripe/webhooks`

**Supported Events:**

- `payment_intent.succeeded` - Handles successful payment confirmations
- `payment_intent.payment_failed` - Logs failed payments
- `payment_intent.canceled` - Logs canceled payments
- `product.created/updated/deleted` - Product management (legacy)
- `price.created/updated/deleted` - Price management (legacy)
- `customer.subscription.created/updated/deleted` - Subscription management (legacy)
- `checkout.session.completed` - Checkout session completion (legacy)

**Implementation:**

```typescript
export async function POST(req: Request) {
  // 1. Verify webhook signature using STRIPE_WEBHOOK_SECRET
  // 2. Construct Stripe event from request body
  // 3. Handle event based on event.type
  // 4. For payment_intent.succeeded:
  //    - Extract orderId from paymentIntent.metadata.orderId
  //    - Call markOrderAsPaidAction with orderId and checkoutAttributes
  //    - Log success/error
  // 5. For payment_intent.payment_failed/canceled:
  //    - Log payment failure/cancellation with orderId
  // 6. Return 200 OK response
}
```

**Implementation Details:**

- Verifies webhook signature using `stripe.webhooks.constructEvent()`
- Extracts `orderId` from `paymentIntent.metadata.orderId` (set during PaymentIntent creation)
- Calls `markOrderAsPaidAction` to process payment (idempotent)
- Handles errors gracefully without exposing internal details
- Logs all webhook events with structured metadata

**Security:**

- Webhook secret verified on every request
- Invalid signatures return 400 error
- Only processes events from Stripe (verified signature)

**Error Handling:**

- Invalid signature: Returns 400 with error message
- Missing orderId in metadata: Logs warning, continues
- Payment processing failure: Logs error, returns 200 (to prevent retries)
- Unknown event types: Returns 400

**Usage:**

Webhook is automatically called by Stripe when payment events occur. Configure webhook endpoint in Stripe Dashboard:

- **URL:** `https://yourdomain.com/api/payment/stripe/webhooks`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
- **Secret:** Set `STRIPE_WEBHOOK_SECRET` environment variable

**Benefits:**

- Reliable payment confirmation (not dependent on user redirect)
- Handles cases where user closes browser before redirect
- Provides backup confirmation mechanism
- Enables real-time payment status updates

#### 5.2.3 Store Admin Payment Routes

**Cash Mark as Paid:**

**Location:** `src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts`

**Implementation:**

```typescript
export async function POST(
  _req: Request,
  props: { params: Promise<{ storeId: string; orderId: string }> },
) {
  // 1. Extract storeId and orderId from params
  // 2. Validate orderId and storeId are present
  // 3. Call markOrderAsPaidAction with:
  //    - storeId as bound argument (first parameter)
  //    - { orderId, checkoutAttributes: JSON.stringify({ paymentMethod: "cash" }) }
  // 4. Handle result:
  //    - If serverError: return error response (400)
  //    - If data: return success response with order (200)
  // 5. Log success/error with structured metadata
}
```

**Request:**

- Method: POST
- Path: `/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]`
- No request body required (orderId and storeId from URL params)

**Response:**

```typescript
// Success (200)
{
  success: true,
  order: StoreOrder // Updated order object
}

// Error (400/500)
{
  success: false,
  message: string // Error message
}
```

**Implementation Details:**

- API route handler (route.ts) - handles POST requests
- Access control: `markOrderAsPaidAction` uses `storeActionClient` which validates:
  - User is authenticated
  - User is a member of the store's organization with role: owner, storeAdmin, staff, or sysAdmin
  - Order belongs to the specified store
- Stores `checkoutAttributes` as JSON: `{ paymentMethod: "cash" }`
- Uses structured logging with metadata (storeId, orderId, error details)
- Returns proper HTTP status codes (400 for validation errors, 500 for server errors)
- Returns updated order object on success

---

## 6. Payment Processing Implementation

### 6.1 Payment Flow

#### 6.1.0 Regular Store Order Payment

**Overview:**

This section describes the technical implementation of the regular store order payment flow. The system processes payments for regular store orders through a plugin-based architecture where payment method plugins handle payment initiation, processing, and confirmation.

**Technical Flow:**

**1. Order Creation:**

**Location:** `src/actions/store/order/create-order.ts`

**Process:**

- Customer completes checkout and selects payment method
- Server action `createOrderAction` creates `StoreOrder` with:
  - `orderStatus`: `OrderStatus.Pending` (or `OrderStatus.Processing` if `store.autoAcceptOrder` is enabled)
  - `paymentStatus`: `PaymentStatus.Pending`
  - `isPaid`: `false`
  - `paymentMethodId`: Selected payment method ID
  - `orderTotal`: Total amount to be paid (calculated from order items, shipping, taxes, discounts)
  - `currency`: Currency from store settings (default: "twd")
  - `checkoutAttributes`: JSON string for plugin-specific data (initialized as empty string)
  - `checkoutRef`: Reference ID from payment gateway (initialized as empty string)
- Order is created with all related `OrderItem` and `OrderNote` records
- Returns complete order object with all relations

**Code Reference:**

```typescript
// In create-order.ts
export const createOrderAction = userRequiredActionClient
  .metadata({ name: "createOrder" })
  .schema(createOrderSchema)
  .action(async ({ parsedInput }) => {
    // ... validation ...
    const order = await sqlClient.storeOrder.create({
      data: {
        storeId,
        userId,
        // ... other fields ...
        paymentStatus: PaymentStatus.Pending,
        orderStatus: store.autoAcceptOrder ? OrderStatus.Processing : OrderStatus.Pending,
        isPaid: false,
        paymentMethodId,
        orderTotal: calculatedTotal,
        currency: store.currency || "twd",
        checkoutAttributes: "",
        checkoutRef: "",
        // ... timestamps ...
      },
    });
    return { order };
  });
```

**2. Payment Processing Delegation:**

**Location:** Payment method plugin implementations

**Standard Payment URL Pattern:**

All payment processing (regular orders, credit recharge, RSVP prepaid) uses the unified URL pattern:

```text
/checkout/[orderId]/[payUrl]?returnUrl=[optional_custom_url]
```

Where:

- `orderId`: The `StoreOrder.id` (UUID)
- `payUrl`: The `PaymentMethod.payUrl` value (e.g., "stripe", "linepay", "credit", "cash")
- `returnUrl` (optional): Custom URL to redirect customer after payment success or failure. If not provided, uses default success/failure pages.

**Examples:**

- Stripe: `/checkout/[orderId]/stripe`
- LINE Pay: `/checkout/[orderId]/linePay`
- Credit: `/checkout/[orderId]/credit`
- Cash: `/checkout/[orderId]/cash`
- With custom return URL: `/checkout/[orderId]/stripe?returnUrl=https://example.com/success`

**Return URL Behavior:**

The optional `returnUrl` query parameter allows custom redirect destinations after payment processing:

- **On Success**: Customer is redirected to the `returnUrl` (if provided) or default success page
- **On Failure**: Customer is redirected to the `returnUrl` with `?status=failed` query parameter (if provided) or default failure page
- **Default Behavior**: If `returnUrl` is not provided:
  - Success: `/checkout/[orderId]/[payUrl]/success` (e.g., `/checkout/[orderId]/stripe/success`)
  - Failure: `/checkout/[orderId]/[payUrl]/canceled` or payment method-specific failure page

**Success Page Pattern:**

After payment confirmation, all orders redirect to:

- **With returnUrl**: Customer redirected to `returnUrl` (success) or `returnUrl?status=failed` (failure)
- **Without returnUrl**:
  - Payment method-specific success: `/checkout/[orderId]/[payUrl]/success` (e.g., `/checkout/[orderId]/stripe/success`)
  - Generic success (for immediate payments): `/checkout/[orderId]/success`

**Process:**

- System delegates payment processing to the selected payment method plugin
- Plugin is identified by `PaymentMethod.payUrl` field (e.g., "stripe", "linepay", "credit", "cash")
- After order creation, client redirects to: `/checkout/${orderId}/${paymentMethod.payUrl}?returnUrl=${encodeURIComponent(customUrl)}` (returnUrl is optional)
- Payment page extracts `returnUrl` from query parameters (if provided)
- Plugin handles payment initiation according to its implementation:
  - **External Gateway Plugins** (Stripe, LINE Pay):
    - Create payment intent/request via gateway API
    - Store payment intent/transaction ID in `order.checkoutAttributes` or `order.checkoutRef`
    - Use `returnUrl` (if provided) or default confirmed URL for gateway redirect
    - Redirect user to external payment page
    - On return from gateway, redirect to `returnUrl` (success) or `returnUrl?status=failed` (failure)
  - **Internal Processing Plugins** (Credit, Cash):
    - Process payment immediately (credit deduction or cash confirmation)
    - May mark order as paid immediately (cash with immediate confirmation)
    - Store plugin-specific data in `order.checkoutAttributes`
    - Redirect to `returnUrl` (if provided) or generic success page: `/checkout/${orderId}/success`

**Plugin Interface:**

```typescript
// Payment method plugins implement PaymentMethodPlugin interface
interface PaymentMethodPlugin {
  processPayment(
    order: StoreOrder,
    config: PluginConfig
  ): Promise<PaymentResult>;
  
  confirmPayment(
    orderId: string,
    paymentData: PaymentData,
    config: PluginConfig
  ): Promise<PaymentConfirmation>;
}
```

**3. Cash/In-Person Payment Specific Flow:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts` or `src/actions/storeAdmin/order/mark-order-as-paid.ts`

**Process:**

- Orders with cash/in-person payment method (`payUrl = "cash"`) are created with `paymentStatus = Pending`
- Payment confirmation can be handled in two ways:
  - **Immediate confirmation**: Order marked as paid immediately upon creation (if configured)
    - Implemented in `createOrderAction` for cash payments with immediate confirmation flag
  - **Manual confirmation**: Store staff manually confirms payment receipt via admin interface
    - API route: `POST /api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]`
    - Server action: `markOrderAsPaidAction` (store admin version)
- Cash payments have zero processing fees:
  - No gateway fees (`fee = 0`)
  - No platform fees (`platformFee = 0`)
- Suitable for in-store transactions, order pickup, or delivery scenarios

**4. Payment Confirmation:**

**Location:** Payment method plugin implementations + `src/actions/store/order/mark-order-as-paid.ts`

**Process:**

- After payment confirmation (via webhook, redirect callback, or manual confirmation):
- System calls `markOrderAsPaidAction` which:
  1. Validates order exists and is not already paid (idempotent check)
  2. Determines if platform payment processing is used:
     - Free stores: always use platform
     - Pro stores: use platform if `LINE_PAY_ID` or `STRIPE_SECRET_KEY` configured
  3. Calculates fees:
     - Gateway fees: `fee = orderTotal * paymentMethod.fee + paymentMethod.feeAdditional`
     - Platform fees: `platformFee = orderTotal * 0.01` (Free stores only)
  4. Calculates availability date: `availability = order.updatedAt + paymentMethod.clearDays`
  5. In a database transaction:
     - Updates order:
       - `isPaid`: `true`
       - `paidDate`: Current timestamp (`getUtcNowEpoch()`)
       - `paymentStatus`: `PaymentStatus.Paid`
       - `orderStatus`: `OrderStatus.Processing` (or `OrderStatus.Confirmed` based on order type)
     - Creates `StoreLedger` entry:
       - `type`: `PlatformPayment` (0) or `StorePaymentProvider` (1)
       - `amount`: `orderTotal` (positive)
       - `fee`: Gateway fees (negative)
       - `platformFee`: Platform fee (negative, Free stores only)
       - `availability`: Calculated availability date
       - `orderId`: Reference to the order
       - `description`: "Order payment"
  6. Returns updated order with all relations

**Code Reference:**

```typescript
// In mark-order-as-paid.ts
export const markOrderAsPaidAction = baseClient
  .metadata({ name: "markOrderAsPaid" })
  .schema(markOrderAsPaidSchema)
  .action(async ({ parsedInput }) => {
    const { orderId, checkoutAttributes } = parsedInput;
    
    // ... validation and idempotency check ...
    
    // Calculate fees
    const fee = calculateGatewayFees(order.orderTotal, paymentMethod);
    const platformFee = isFreeStore ? order.orderTotal * 0.01 : 0;
    const availability = order.updatedAt + BigInt(paymentMethod.clearDays * 24 * 60 * 60 * 1000);
    
    // Transaction: Update order + Create ledger entry
    await sqlClient.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paidDate: getUtcNowEpoch(),
          paymentStatus: PaymentStatus.Paid,
          orderStatus: OrderStatus.Processing,
          checkoutAttributes: checkoutAttributes || order.checkoutAttributes,
        },
      });
      
      await tx.storeLedger.create({
        data: {
          storeId: order.storeId,
          type: isPlatformPayment ? 0 : 1, // PlatformPayment or StorePaymentProvider
          amount: order.orderTotal,
          fee: -fee,
          platformFee: -platformFee,
          availability,
          orderId: order.id,
          description: "Order payment",
        },
      });
    });
    
    return { order: updatedOrder };
  });
```

**5. Payment Confirmation by Plugins:**

**FR-PAY-010 Implementation:**

- Each payment method plugin implements payment confirmation logic via `confirmPayment()` method
- Plugins verify payment status via their payment gateway API (if applicable):
  - **Stripe Plugin**: Verifies `PaymentIntent` status via Stripe API
  - **LINE Pay Plugin**: Verifies transaction status via LINE Pay API
  - **Credit Plugin**: Verifies credit deduction was successful (internal check)
  - **Cash Plugin**: Manual confirmation (no API verification needed)
- Plugins return `PaymentConfirmation` with:
  - `success`: boolean
  - `paymentStatus`: "paid" | "failed" | "pending"
  - `paymentData`: Additional payment information
- Payment must be verified by plugin before marking order as paid
- System calls `markOrderAsPaidAction` only after plugin confirms payment success

**Plugin Confirmation Pattern:**

```typescript
// Example: Stripe plugin confirmation
async confirmPayment(
  orderId: string,
  paymentData: PaymentData,
  config: PluginConfig
): Promise<PaymentConfirmation> {
  const paymentIntentId = paymentData.paymentIntentId;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (paymentIntent.status === "succeeded") {
    return {
      success: true,
      paymentStatus: "paid",
      paymentData: { paymentIntentId },
    };
  }
  
  return {
    success: false,
    paymentStatus: "failed",
    error: "Payment not completed",
  };
}
```

**State Transitions:**

```text
Order Creation:
  orderStatus: Pending → Processing (if autoAcceptOrder) or Pending
  paymentStatus: Pending
  isPaid: false

Payment Confirmation:
  orderStatus: Pending/Processing → Processing/Confirmed
  paymentStatus: Pending → Paid
  isPaid: false → true
  paidDate: null → Current timestamp
```

**Error Handling:**

- Order creation failures: Return error to client, order not created
- Payment processing failures: Order remains in `Pending` state, user can retry
- Payment confirmation failures: Order remains unpaid, can be retried or cancelled
- Idempotent operations: `markOrderAsPaidAction` checks if order is already paid before processing

**Related Sections:**

- Section 5.1.1: Order Payment Actions (server actions)
- Section 6.1.1: Payment Method Plugin Configuration (configuration management)
- Section 6.1.2: Stripe Payment Flow (specific implementation)
- Section 6.1.3: LINE Pay Payment Flow (specific implementation)
- Section 6.1.4: Credit-Based Payment Flow (specific implementation)
- Section 6.1.5: Cash/In-Person Payment Flow (specific implementation)
- Section 4: Payment Method Plugin Interface (plugin architecture)

#### 6.1.1 Payment Method Plugin Configuration

**Overview:**

This section describes the technical implementation of multi-level configuration for payment method plugins. The system supports platform-level and store-level configuration with a priority hierarchy: Store-level > Platform-level > Plugin defaults.

**FR-PAY-011 Implementation: Multi-Level Configuration**

**Configuration Hierarchy:**

1. **Store-level Configuration** (highest priority)
2. **Platform-level Configuration** (fallback)
3. **Plugin Defaults** (lowest priority)

**Platform-level Configuration:**

**Location:** Platform configuration storage (environment variables, database, or config files)

**Process:**

- System Admins configure default settings for each plugin
- Platform configuration includes:
  - Default credentials (API keys, secrets)
  - Fee structure (fee rate, additional fees)
  - Plugin-specific settings (endpoints, timeouts, etc.)
- Platform configuration serves as fallback for stores
- Stored in system-wide configuration (e.g., environment variables like `STRIPE_SECRET_KEY`, `LINE_PAY_ID`)

**Code Reference:**

```typescript
// Platform configuration example
const platformConfig = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  linepay: {
    channelId: process.env.LINE_PAY_ID,
    channelSecret: process.env.LINE_PAY_SECRET,
    sandbox: process.env.LINE_PAY_SANDBOX === "true",
  },
};
```

**Store-level Configuration:**

**Location:** `StorePaymentMethodMapping` table + plugin-specific configuration tables (future enhancement)

**Process:**

- Store Admins can override platform configuration with store-specific settings
- Store configuration includes:
  - Store-specific credentials (for Pro-level stores)
  - Fee overrides (custom fee rates)
  - Plugin-specific options (store-specific endpoints, custom settings)
- Store configuration takes precedence over platform configuration
- Currently implemented via:
  - `StorePaymentMethodMapping` table (maps payment methods to stores)
  - Environment variable checks for store-specific credentials (future: database storage)

**Code Reference:**

```typescript
// Store configuration lookup pattern
async function getPluginConfig(storeId: string, pluginId: string): Promise<PluginConfig> {
  const store = await sqlClient.store.findUnique({
    where: { id: storeId },
    include: { StorePaymentMethodMapping: true },
  });
  
  // Check for store-level configuration first
  const storeConfig = await getStoreLevelConfig(storeId, pluginId);
  if (storeConfig) {
    return {
      storeId,
      storeConfig,
      platformConfig: getPlatformConfig(pluginId), // Fallback
    };
  }
  
  // Fall back to platform configuration
  return {
    storeId,
    platformConfig: getPlatformConfig(pluginId),
  };
}
```

**FR-PAY-012 Implementation: Configuration Routing**

**Configuration Resolution Logic:**

**Location:** Plugin implementations and configuration helper functions

**Process:**

1. **Plugins check for store-level configuration first:**
   - Query `StorePaymentMethodMapping` for store-specific payment method mapping
   - Check for store-specific credentials in database (future enhancement)
   - Check for store-specific environment variables (e.g., `STRIPE_SECRET_KEY_${storeId}`)

2. **If store-level configuration is not available, plugins use platform-level configuration:**
   - Read from environment variables (e.g., `STRIPE_SECRET_KEY`, `LINE_PAY_ID`)
   - Read from platform configuration database (future enhancement)

3. **If platform-level configuration is not available, plugins use default configuration:**
   - Plugin-defined defaults (e.g., default fee rates from `PaymentMethod` table)
   - Fallback values for missing configuration

**Store Tier Restrictions:**

- **Free-level stores:**
  - Configuration may be restricted (e.g., must use platform credentials)
  - Cannot configure store-specific credentials
  - Must use platform payment processing
  - Platform fee applies (1% of order total)

- **Pro-level stores:**
  - Can configure store-specific credentials and settings
  - Can use own payment gateway accounts
  - Can override fee structures (via `PaymentMethod` configuration)
  - No platform fee (if using own payment processing)

**Code Reference:**

```typescript
// Configuration resolution in plugin
async function resolveConfig(storeId: string, pluginId: string): Promise<PluginConfig> {
  const store = await sqlClient.store.findUnique({
    where: { id: storeId },
  });
  
  // Free stores: always use platform config
  if (store.tier === "FREE") {
    return {
      storeId,
      platformConfig: getPlatformConfig(pluginId),
    };
  }
  
  // Pro stores: check for store-level config first
  const storeConfig = await getStoreLevelConfig(storeId, pluginId);
  if (storeConfig) {
    return {
      storeId,
      storeConfig,
      platformConfig: getPlatformConfig(pluginId), // Fallback
    };
  }
  
  // Fallback to platform config
  return {
    storeId,
    platformConfig: getPlatformConfig(pluginId),
  };
}
```

**FR-PAY-013 Implementation: Configuration Validation**

**Validation Process:**

**Location:** Plugin `validateConfiguration()` method implementation

**Process:**

- Plugins validate configuration when enabled or updated
- Invalid configuration prevents plugin from being enabled
- Configuration validation includes:
  - **Credential validation** (when applicable):
    - API key format validation
    - Test API calls to verify credentials work
    - Webhook endpoint validation
  - **Fee structure validation**:
    - Fee rates must be between 0 and 1 (0% to 100%)
    - Additional fees must be non-negative
  - **Required field validation**:
    - All required fields must be present
    - Field types must match expected types
- Configuration errors are reported to System/Store Admins

**Code Reference:**

```typescript
// Plugin validation implementation
interface PaymentMethodPlugin {
  validateConfiguration(config: PluginConfig): ValidationResult;
}

// Example: Stripe plugin validation
async validateConfiguration(config: PluginConfig): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Determine which config to validate (store-level or platform-level)
  const configToValidate = config.storeConfig || config.platformConfig;
  
  if (!configToValidate) {
    return {
      valid: false,
      errors: ["No configuration provided"],
    };
  }
  
  // Validate secret key
  if (!configToValidate.secretKey || !configToValidate.secretKey.startsWith("sk_")) {
    errors.push("Invalid Stripe secret key format");
  }
  
  // Validate publishable key
  if (!configToValidate.publishableKey || !configToValidate.publishableKey.startsWith("pk_")) {
    errors.push("Invalid Stripe publishable key format");
  }
  
  // Test API call (optional, can be expensive)
  if (errors.length === 0) {
    try {
      const stripe = new Stripe(configToValidate.secretKey);
      await stripe.customers.list({ limit: 1 }); // Test API call
    } catch (error) {
      errors.push(`Stripe API test failed: ${error.message}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

**Configuration Storage:**

**Current Implementation:**

- Platform-level: Environment variables
- Store-level: `StorePaymentMethodMapping` table (basic mapping only)
- Payment method defaults: `PaymentMethod` table (fee rates, clear days)

**Future Enhancement:**

- Database storage for platform-level configuration
- Database storage for store-level configuration (plugin-specific config tables)
- Configuration UI for System Admins and Store Admins
- Configuration versioning and audit logging

**Database Schema:**

```prisma
// Current: StorePaymentMethodMapping
model StorePaymentMethodMapping {
  id                 String  @id @default(uuid())
  storeId            String
  methodId           String
  paymentDisplayName String? // Optional custom display name for store
  
  Store         Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  PaymentMethod PaymentMethod @relation(fields: [methodId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, methodId])
}

// Future: Plugin-specific configuration tables
// Example: StripePluginConfig
model StripePluginConfig {
  id              String  @id @default(uuid())
  storeId         String? // null for platform-level config
  secretKey       String
  publishableKey  String
  webhookSecret   String?
  // ... other plugin-specific fields
}
```

**Configuration Access Pattern:**

```typescript
// Helper function to get merged configuration
async function getMergedConfig(
  storeId: string,
  pluginId: string
): Promise<MergedPluginConfig> {
  // 1. Get platform config
  const platformConfig = await getPlatformConfig(pluginId);
  
  // 2. Get store config (if exists)
  const storeConfig = await getStoreConfig(storeId, pluginId);
  
  // 3. Merge: store config overrides platform config
  return {
    ...platformConfig,
    ...storeConfig, // Store config takes precedence
  };
}
```

**Error Handling:**

- Configuration validation failures: Return validation errors to admin interface
- Missing configuration: Use plugin defaults or return error if required
- Invalid credentials: Log error, prevent plugin activation, notify admin
- Configuration update failures: Rollback changes, maintain previous configuration

**Related Sections:**

- Section 4.2: Type Definitions (`PluginConfig` interface)
- Section 4.3: Plugin Registration (plugin registration mechanism)
- Section 5.1.1: Order Payment Actions (configuration usage in payment processing)
- Section 6.1.0: Regular Store Order Payment (configuration routing in payment flow)

#### 6.1.2 Stripe Payment Flow

**Overview:**

The Stripe payment flow uses Stripe Elements for client-side payment processing. The flow involves order creation, payment intent creation, client-side payment processing, server-side confirmation, and order completion.

**Flow Diagram:**

```text
1. Checkout → 2. Order Creation → 3. Redirect to Stripe Page
                                              ↓
6. Success Page ← 5. Confirmation ← 4. Payment Processing
```

**Detailed Flow:**

**1. Order Creation:**

**Location:** `src/app/s/[storeId]/checkout/client.tsx`

**Process:**

- User clicks "Place Order" button in checkout
- Client component (`CheckoutSteps`) collects:
  - Cart items (productIds, quantities, unitPrices, variants, variantCosts)
  - Selected payment method (`paymentMethodId`)
  - Selected shipping method (`shippingMethodId`)
  - Order note (optional)
  - User ID (optional, for anonymous orders)
- Calls API: `POST /api/store/[storeId]/create-order`
- Server action: `createOrderAction` (see section 5.1.1)
- Creates `StoreOrder` with:
  - `paymentStatus = PaymentStatus.Pending`
  - `orderStatus = OrderStatus.Pending` (or `Processing` if `autoAcceptOrder`)
  - `isPaid = false`
  - `paymentMethodId` = Stripe payment method ID
- Returns created order object
- Client redirects to: `/checkout/${order.id}/${paymentMethod.payUrl}` (standard payment URL pattern)

**Code Reference:**

```typescript
// In checkout/client.tsx
const placeOrder = async () => {
  // ... validation ...
  const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/create-order`;
  const result = await axios.post(url, body);
  const order = result.data.order as StoreOrder;
  
  // Redirect to payment page
  const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
  router.push(paymenturl);
};
```

**2. Payment Intent Creation:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/components/payment-stripe.tsx`

**Process:**

- Payment page loads: `/checkout/[orderId]/stripe/page.tsx`
- Server component fetches order via `getOrderById`
- If order is already paid, redirects to success page
- Client component `PaymentStripe` mounts
- `useEffect` hook calls: `POST /api/payment/stripe/create-payment-intent`
- API route: `src/app/api/payment/stripe/create-payment-intent/route.ts`
- Creates Stripe PaymentIntent:
  - `amount`: `orderTotal * 100` (convert to cents)
  - `currency`: `order.currency.toLowerCase()`
  - `automatic_payment_methods`: `{ enabled: true }`
  - `metadata`: `{ orderId, storeId }`
- Returns PaymentIntent with `client_secret`
- Client stores `client_secret` in component state

**Code Reference:**

```typescript
// In payment-stripe.tsx
useEffect(() => {
  if (order.isPaid) return;
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/create-payment-intent`;
  const body = JSON.stringify({
    total: Number(order.orderTotal),
    currency: order.currency,
  });
  
  fetch(url, { method: "POST", headers: {...}, body })
    .then((res) => res.json())
    .then((data) => {
      setClientSecret(data.client_secret);
    });
}, [order]);
```

**3. Payment Processing (Client-Side):**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/components/payment-stripe.tsx`

**Process:**

- Once `clientSecret` is available, renders Stripe Elements:
  - `<Elements>` wrapper with `clientSecret` and Stripe instance
  - `<LinkAuthenticationElement>` for email collection
  - `<PaymentElement>` for payment method input
  - `<StripePayButton>` for payment submission
- User enters payment details (card number, expiry, CVC, etc.)
- User clicks "Pay" button
- `StripePayButton` component:
  - Calls `stripe.confirmPayment()` with:
    - `elements`: Stripe Elements instance
    - `confirmParams.return_url`: `/checkout/${orderId}/stripe/confirmed`
  - Stripe processes payment:
    - For card payments: immediate processing
    - For redirect methods (iDEAL, etc.): redirects to bank, then back
  - On success: Stripe redirects to `return_url` with query params:
    - `payment_intent`: PaymentIntent ID
    - `payment_intent_client_secret`: Client secret
    - `redirect_status`: "succeeded" or "failed"

**Code Reference:**

```typescript
// In StripePayButton component
// Extract returnUrl from query parameters (optional)
const searchParams = useSearchParams();
const returnUrl = searchParams.get('returnUrl');

const fetchData = async () => {
  if (!stripe || !elements) return;
  
  // Use returnUrl if provided, otherwise use default confirmed URL
  const confirmedUrl = returnUrl 
    ? `${getAbsoluteUrl()}/checkout/${orderId}/stripe/confirmed?returnUrl=${encodeURIComponent(returnUrl)}`
    : `${getAbsoluteUrl()}/checkout/${orderId}/stripe/confirmed`;
  
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: confirmedUrl,
    },
  });
  
  if (error) {
    setErrorMessage(error.message);
    // On error, redirect to returnUrl with status=failed if provided
    if (returnUrl) {
      router.push(`${returnUrl}?status=failed`);
    }
  } else {
    router.push(confirmedUrl);
  }
};
```

**4. Payment Confirmation (Server-Side):**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx`

**Process:**

- Stripe redirects to: `/checkout/[orderId]/stripe/confirmed?payment_intent=pi_xxx&payment_intent_client_secret=pi_xxx_secret_xxx&redirect_status=succeeded&returnUrl=[optional]`
- Server component extracts query parameters:
  - `payment_intent`: PaymentIntent ID from Stripe
  - `payment_intent_client_secret`: Client secret for verification
  - `redirect_status`: "succeeded" or "failed"
  - `returnUrl` (optional): Custom return URL passed through from payment page
- Verifies `redirect_status === "succeeded"`
- Calls Stripe API to verify PaymentIntent:
  - `stripe.paymentIntents.retrieve(payment_intent, { client_secret })`
  - Checks `paymentIntent.status === "succeeded"`
- If verified:
  - Prepares `checkoutAttributes`:

    ```json
    {
      "payment_intent": "pi_xxx",
      "client_secret": "pi_xxx_secret_xxx"
    }
    ```

  - Calls `markOrderAsPaidAction`:
    - Updates order: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Processing`
    - Creates `StoreLedger` entry with fees
    - Calculates payment processing fees
  - Logs success
  - Redirects based on `returnUrl`:
    - If `returnUrl` provided: Redirects to `returnUrl` (success)
    - If `returnUrl` not provided: Redirects to `/checkout/[orderId]/stripe/success` (default)
- If verification fails:
  - Logs error
  - Redirects based on `returnUrl`:
    - If `returnUrl` provided: Redirects to `returnUrl?status=failed`
    - If `returnUrl` not provided: Redirects to default failure page or shows error
  - Shows error state (does not mark as paid)

**Code Reference:**

```typescript
// In confirmed/page.tsx
if (searchParams.redirect_status === "succeeded") {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    searchParams.payment_intent,
    { client_secret: searchParams.payment_intent_client_secret }
  );
  
  if (paymentIntent.status === "succeeded") {
    const checkoutAttributes = JSON.stringify({
      payment_intent: searchParams.payment_intent,
      client_secret: searchParams.payment_intent_client_secret,
    });
    
    const result = await markOrderAsPaidAction({
      orderId: params.orderId,
      checkoutAttributes,
    });
    
    redirect(`${getAbsoluteUrl()}/checkout/${params.orderId}/stripe/success`);
  }
}
```

**5. Order Completion:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`

**Process:**

- `markOrderAsPaidAction` is called (see section 5.1.1)
- Validates order exists and is not already paid
- Determines platform payment processing (`usePlatform`)
- Calculates fees:
  - Payment method fee: `orderTotal * feeRate + feeAdditional`
  - Fee tax: `fee * 0.05` (5% tax on fees)
  - Platform fee: `orderTotal * 0.01` (1% for free stores)
- Updates order in transaction:
  - `isPaid = true`
  - `paidDate = getUtcNowEpoch()`
  - `orderStatus = OrderStatus.Processing`
  - `paymentStatus = PaymentStatus.Paid`
  - `paymentCost = fee + feeTax + platformFee`
  - `checkoutAttributes` = payment intent data (JSON string)
- Creates `StoreLedger` entry:
  - `amount`: order total (positive)
  - `fee`: payment method fee + tax (negative)
  - `platformFee`: platform fee (negative)
  - `type`: `PlatformPayment` (0) or `StorePaymentProvider` (1)
  - `availability`: order date + payment method `clearDays`
  - `balance`: previous balance + amount + fees
- Returns updated order

**6. Success Page:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/success/page.tsx`

**Process:**

- Displays success message
- Shows order details
- Provides navigation:
  - Back to store
  - View order history
  - Continue shopping

**State Transitions:**

```text
Order State Flow:
Pending → Processing (after payment confirmation)
PaymentStatus: Pending → Paid
isPaid: false → true
```

**Error Handling:**

1. **Payment Intent Creation Failure:**
   - API returns error response
   - Client logs error
   - User sees error message
   - Order remains in `Pending` state

2. **Payment Processing Failure:**
   - Stripe returns error in `confirmPayment()`
   - Error message displayed to user
   - User can retry payment
   - Order remains in `Pending` state

3. **Payment Confirmation Failure:**
   - PaymentIntent status not "succeeded"
   - Server logs error
   - User redirected to error state
   - Order remains in `Pending` state

4. **Order Completion Failure:**
   - `markOrderAsPaidAction` fails
   - Error logged with structured metadata
   - User redirected to success page (payment succeeded but order update failed)
   - Manual intervention may be required

**Security Considerations:**

- PaymentIntent client secret is only used client-side
- Server verifies PaymentIntent status before marking order as paid
- PaymentIntent metadata includes `orderId` and `storeId` for verification
- `checkoutAttributes` stores payment intent data for audit trail
- All payment operations are logged with structured metadata

**Files Involved:**

- `src/app/s/[storeId]/checkout/client.tsx` - Checkout and order creation
- `src/app/api/store/[storeId]/create-order/route.ts` - Order creation API
- `src/actions/store/order/create-order.ts` - Order creation action
- `src/app/(root)/checkout/[orderId]/stripe/page.tsx` - Stripe payment page
- `src/app/(root)/checkout/[orderId]/stripe/components/payment-stripe.tsx` - Payment UI component
- `src/app/api/payment/stripe/create-payment-intent/route.ts` - PaymentIntent creation API
- `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx` - Payment confirmation
- `src/actions/store/order/mark-order-as-paid.ts` - Order completion action
- `src/app/(root)/checkout/[orderId]/stripe/success/page.tsx` - Success page

**Testing Checklist:**

- [ ] Order creation with Stripe payment method
- [ ] PaymentIntent creation with correct amount and currency
- [ ] Stripe Elements renders correctly
- [ ] Payment processing with valid card
- [ ] Payment processing with invalid card (error handling)
- [ ] Payment confirmation with succeeded status
- [ ] Payment confirmation with failed status
- [ ] Order marked as paid after successful payment
- [ ] StoreLedger entry created correctly
- [ ] Fees calculated correctly
- [ ] Success page displays correctly
- [ ] Error states handled gracefully

#### 6.1.3 LINE Pay Payment Flow

**Overview:**

The LINE Pay payment flow uses LINE Pay's online payment API for payment processing. Unlike Stripe, LINE Pay requires server-side payment request creation and redirects users to LINE Pay's payment page. The flow involves order creation, payment request creation, redirect to LINE Pay, confirmation, and order completion.

**Flow Diagram:**

```text
1. Checkout → 2. Order Creation → 3. Payment Request → 4. Redirect to LINE Pay
                                                                    ↓
6. Success Page ← 5. Confirmation ← LINE Pay Payment Page
```

**Detailed Flow:**

**1. Order Creation:**

**Location:** `src/app/s/[storeId]/checkout/client.tsx`

**Process:**

- User clicks "Place Order" button in checkout
- Client component (`CheckoutSteps`) collects:
  - Cart items (productIds, quantities, unitPrices, variants, variantCosts)
  - Selected payment method (`paymentMethodId` - LINE Pay)
  - Selected shipping method (`shippingMethodId`)
  - Order note (optional)
  - User ID (optional, for anonymous orders)
- Calls API: `POST /api/store/[storeId]/create-order`
- Server action: `createOrderAction` (see section 5.1.1)
- Creates `StoreOrder` with:
  - `paymentStatus = PaymentStatus.Pending`
  - `orderStatus = OrderStatus.Pending` (or `Processing` if `autoAcceptOrder`)
  - `isPaid = false`
  - `paymentMethodId` = LINE Pay payment method ID
- Returns created order object
- Client redirects to: `/checkout/${order.id}/${paymentMethod.payUrl}` (standard payment URL pattern)

**Code Reference:**

```typescript
// In checkout/client.tsx (same as Stripe)
const placeOrder = async () => {
  // ... validation ...
  const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/create-order`;
  const result = await axios.post(url, body);
  const order = result.data.order as StoreOrder;
  
  // Redirect to payment page
  const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
  router.push(paymenturl); // payUrl = "linePay"
};
```

**2. Payment Request Creation:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/page.tsx`

**Process:**

- Payment page loads: `/checkout/[orderId]/linePay/page.tsx`
- Server component:
  - Fetches order via `getOrderById`
  - If order is already paid, shows success state
  - Fetches store via `getStoreById`
  - Gets LINE Pay client via `getLinePayClientByStore(store)`
  - Detects mobile vs desktop user agent
  - Determines protocol (http for dev, https for production)
  - Extracts `returnUrl` from query parameters (optional)
  - Constructs redirect URLs:
    - `confirmUrl`: `/checkout/${orderId}/linePay/confirmed` (with optional `?returnUrl=[encoded_url]` if provided)
    - `cancelUrl`: `/checkout/${orderId}/linePay/canceled` (with optional `?returnUrl=[encoded_url]` if provided)
- Prepares LINE Pay request body:
  - `amount`: `Number(order.orderTotal)`
  - `currency`: `order.currency` (as `Currency` type)
  - `orderId`: `order.id`
  - `packages`: Array of order items with:
    - `id`: Order item ID
    - `amount`: `unitPrice * quantity`
    - `products`: Array with item details (name, quantity, price)
  - `redirectUrls`: `{ confirmUrl, cancelUrl }`
- Calls LINE Pay API: `linePayClient.request.send(requestConfig)`
- If `returnCode === "0000"` (success):
  - Extracts from response:
    - `weburl`: Web payment URL
    - `appurl`: Mobile app payment URL
    - `transactionId`: Transaction ID
    - `paymentAccessToken`: Payment access token
  - Updates order:
    - `checkoutAttributes` = `transactionId` (string)
    - `checkoutRef` = `paymentAccessToken` (string)
  - Logs payment request creation
  - Redirects user:
    - Mobile: `redirect(appurl)`
    - Desktop: `redirect(weburl)`
- If request fails:
  - Logs error with return code and message
  - Throws error

**Code Reference:**

```typescript
// In linePay/page.tsx
const order = await getOrderById(params.orderId);
const store = await getStoreById(order.storeId);
const linePayClient = await getLinePayClientByStore(store);

const requestBody: RequestRequestBody = {
  amount: Number(order.orderTotal),
  currency: order.currency as Currency,
  orderId: order.id,
  packages: order.OrderItemView.map((item) => ({
    id: item.id,
    amount: Number(item.unitPrice) * item.quantity,
    products: [{
      name: item.name,
      quantity: item.quantity,
      price: Number(item.unitPrice),
    }],
  })),
  redirectUrls: {
    confirmUrl: `${protocol}//${host}/checkout/${order.id}/linePay/confirmed`,
    cancelUrl: `${protocol}//${host}/checkout/${order.id}/linePay/canceled`,
  },
};

const res = await linePayClient.request.send({ body: requestBody });

if (res.body.returnCode === "0000") {
  const { weburl, appurl, transactionId, paymentAccessToken } = res.body.info;
  
  await sqlClient.storeOrder.update({
    where: { id: order.id },
    data: {
      checkoutAttributes: transactionId,
      checkoutRef: paymentAccessToken,
    },
  });
  
  redirect(isMobile ? appurl : weburl);
}
```

**3. Payment Processing (LINE Pay Side):**

**Process:**

- User is redirected to LINE Pay payment page (web or app)
- User authenticates with LINE Pay account
- User reviews order details and payment amount
- User confirms payment
- LINE Pay processes payment:
  - Validates payment method
  - Processes transaction
  - On success: Redirects to `confirmUrl` with query params:
    - `orderId`: Order ID
    - `transactionId`: Transaction ID
  - On cancel: Redirects to `cancelUrl` with query params:
    - `orderId`: Order ID
    - `transactionId`: Transaction ID (may be present)

**Note:** This step happens entirely on LINE Pay's servers. Our application does not handle this directly.

**4. Payment Confirmation (Server-Side):**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx`

**Process:**

- LINE Pay redirects to: `/checkout/[orderId]/linePay/confirmed?orderId=xxx&transactionId=xxx&returnUrl=[optional]`
- Server component extracts query parameters:
  - `orderId`: Order ID
  - `transactionId`: Transaction ID from LINE Pay
  - `returnUrl` (optional): Custom return URL passed through from payment page
- Validates:
  - `orderId` is present
  - Order exists via `getOrderById`
  - `order.checkoutAttributes === transactionId` (security check)
  - Order is not already paid
- Gets store and LINE Pay client
- Prepares confirmation request:
  - `transactionId`: From query params
  - `body.currency`: `order.currency`
  - `body.amount`: `Number(order.orderTotal)`
- Calls LINE Pay API: `linePayClient.confirm.send(confirmRequest)`
- If `returnCode === "0000"` (success):
  - Calls `markOrderAsPaidAction`:
    - Updates order: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Processing`
    - Creates `StoreLedger` entry with fees
    - Calculates payment processing fees
  - Logs success
  - Redirects based on `returnUrl`:
    - If `returnUrl` provided: Redirects to `returnUrl` (success)
    - If `returnUrl` not provided: Redirects to `/checkout/[orderId]/linePay/success` (default)
- If confirmation fails:
  - Logs error
  - Redirects based on `returnUrl`:
    - If `returnUrl` provided: Redirects to `returnUrl?status=failed`
    - If `returnUrl` not provided: Returns empty component (error state)
  - Order remains in `Pending` state

**Code Reference:**

```typescript
// In linePay/confirmed/page.tsx
const { orderId, transactionId } = await searchParams;

const order = await getOrderById(orderId as string);

// Security check: verify transactionId matches
if (order.checkoutAttributes !== transactionId) {
  throw new Error("transactionId not match");
}

const store = await getStoreById(order.storeId);
const linePayClient = await getLinePayClientByStore(store);

const confirmRequest: ConfirmRequestConfig = {
  transactionId: transactionId as string,
  body: {
    currency: order.currency as Currency,
    amount: Number(order.orderTotal),
  },
};

const res = await linePayClient.confirm.send(confirmRequest);

if (res.body.returnCode === "0000") {
  const result = await markOrderAsPaidAction({
    orderId: order.id,
    checkoutAttributes: order.checkoutAttributes || "",
  });
  
  redirect(`${getAbsoluteUrl()}/checkout/${order.id}/linePay/success`);
}
```

**5. Order Completion:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`

**Process:**

- `markOrderAsPaidAction` is called (see section 5.1.1)
- Same process as Stripe:
  - Validates order exists and is not already paid
  - Determines platform payment processing (`usePlatform`)
  - Calculates fees:
    - Payment method fee: `orderTotal * feeRate + feeAdditional`
    - Fee tax: `fee * 0.05` (5% tax on fees)
    - Platform fee: `orderTotal * 0.01` (1% for free stores)
  - Updates order in transaction
  - Creates `StoreLedger` entry
  - Returns updated order

**6. Success Page:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/success/page.tsx`

**Process:**

- Displays success message
- Shows order details via `SuccessAndRedirect` component
- Provides navigation:
  - Back to store
  - View order history
  - Continue shopping

**7. Cancel Page (Optional):**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/canceled/page.tsx`

**Process:**

- User cancels payment on LINE Pay
- LINE Pay redirects to cancel URL
- Displays cancellation message
- Provides navigation back to checkout or store
- Order remains in `Pending` state (not paid)

**State Transitions:**

```text
Order State Flow:
Pending → Processing (after payment confirmation)
PaymentStatus: Pending → Paid
isPaid: false → true
```

**Error Handling:**

1. **Payment Request Creation Failure:**
   - LINE Pay API returns non-"0000" return code
   - Server logs error with return code and message
   - Throws error
   - Order remains in `Pending` state
   - User sees error page

2. **Transaction ID Mismatch:**
   - `order.checkoutAttributes !== transactionId` from query params
   - Security check fails
   - Throws error: "transactionId not match"
   - Prevents unauthorized payment confirmation
   - Order remains in `Pending` state

3. **Payment Confirmation Failure:**
   - LINE Pay confirm API returns non-"0000" return code
   - Server logs error
   - Returns empty component
   - Order remains in `Pending` state
   - User may need to retry or contact support

4. **Order Completion Failure:**
   - `markOrderAsPaidAction` fails
   - Error logged with structured metadata
   - User redirected to success page (payment confirmed but order update failed)
   - Manual intervention may be required

5. **User Cancellation:**
   - User cancels on LINE Pay page
   - Redirected to cancel URL
   - Order remains in `Pending` state
   - User can retry payment

**Security Considerations:**

- Transaction ID stored in `checkoutAttributes` is verified on confirmation
- Payment access token stored in `checkoutRef` for future reference
- Server-side confirmation ensures payment was actually processed
- LINE Pay API credentials are store-specific (from `Store.LINE_PAY_ID` and `Store.LINE_PAY_SECRET`)
- All payment operations are logged with structured metadata
- Mobile vs desktop detection ensures correct payment URL

**LINE Pay API Details:**

- **Request API:** Creates payment request and returns payment URLs
- **Confirm API:** Confirms payment after user completes on LINE Pay
- **Return Codes:**
  - `"0000"`: Success
  - Other codes: Various error conditions (see LINE Pay documentation)
- **Payment URLs:**
  - `web`: Desktop/web payment URL
  - `app`: Mobile app payment URL
- **Transaction ID:** Unique identifier for the payment transaction
- **Payment Access Token:** Token for accessing payment details

**Files Involved:**

- `src/app/s/[storeId]/checkout/client.tsx` - Checkout and order creation
- `src/app/api/store/[storeId]/create-order/route.ts` - Order creation API
- `src/actions/store/order/create-order.ts` - Order creation action
- `src/app/(root)/checkout/[orderId]/linePay/page.tsx` - Payment request page
- `src/lib/linePay/index.ts` - LINE Pay client creation
- `src/lib/linePay/line-pay-api/request.ts` - LINE Pay request API
- `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx` - Payment confirmation
- `src/lib/linePay/line-pay-api/confirm.ts` - LINE Pay confirm API
- `src/actions/store/order/mark-order-as-paid.ts` - Order completion action
- `src/app/(root)/checkout/[orderId]/linePay/success/page.tsx` - Success page
- `src/app/(root)/checkout/[orderId]/linePay/canceled/page.tsx` - Cancel page

**Testing Checklist:**

- [ ] Order creation with LINE Pay payment method
- [ ] Payment request creation with correct amount and currency
- [ ] Transaction ID and payment access token stored correctly
- [ ] Mobile user redirected to app URL
- [ ] Desktop user redirected to web URL
- [ ] Payment processing on LINE Pay (manual testing)
- [ ] Payment confirmation with succeeded status
- [ ] Transaction ID verification (security check)
- [ ] Payment confirmation with failed status
- [ ] Order marked as paid after successful payment
- [ ] StoreLedger entry created correctly
- [ ] Fees calculated correctly
- [ ] Success page displays correctly
- [ ] Cancel page handles cancellation correctly
- [ ] Error states handled gracefully
- [ ] Payment request failure handled
- [ ] Transaction ID mismatch detected

#### 6.1.4 Credit-Based Payment Flow

**Overview:**

The credit-based payment flow uses the customer's internal credit balance to pay for orders. Credit payments are processed immediately (no external gateway), with credit deduction, ledger entries, and order completion happening in a single atomic transaction. Credit payments have zero processing fees.

**Flow Diagram:**

```text
1. Checkout → 2. Order Creation → 3. Credit Validation → 4. Credit Deduction
                                                                    ↓
5. Order Completion (immediate) → 6. Success
```

**Detailed Flow:**

**1. Order Creation:**

**Location:** `src/app/s/[storeId]/checkout/client.tsx` → `src/actions/store/order/create-order.ts`

**Process:**

- User clicks "Place Order" button in checkout
- User selects credit payment method (`payUrl = "credit"`)
- Client component collects order data (same as Stripe/LINE Pay)
- Calls API: `POST /api/store/[storeId]/create-order`
- Server action: `createOrderAction` creates `StoreOrder` with:
  - `paymentStatus = PaymentStatus.Pending`
  - `orderStatus = OrderStatus.Pending` (or `Processing` if `autoAcceptOrder`)
  - `isPaid = false` (initially)
  - `paymentMethodId` = Credit payment method ID
- Returns created order object
- **Note:** For credit payments, the order is typically processed immediately after creation (see step 3)

**Code Reference:**

```typescript
// In create-order.ts
const order = await sqlClient.storeOrder.create({
  data: {
    storeId,
    userId: userId || null, // Required for credit payments
    paymentMethodId, // Credit payment method
    isPaid: false, // Will be set to true after credit deduction
    paymentStatus: PaymentStatus.Pending,
    // ... other fields
  },
});
```

**2. Availability Check:**

**Location:** `src/lib/payment/plugins/credit-plugin.ts`

**Process:**

- Before processing payment, validate:
  - Customer is signed in (`order.userId` must exist)
  - Store has credit system enabled (`Store.useCustomerCredit = true`)
  - Customer has sufficient credit balance
- Credit plugin's `checkAvailability()` method performs basic checks
- Full validation happens in `confirmPayment()` method

**Code Reference:**

```typescript
// In credit-plugin.ts
checkAvailability(order: StoreOrder, config: PluginConfig): AvailabilityResult {
  if (!order.userId) {
    return {
      available: false,
      reason: "User must be signed in to use credit payment",
    };
  }
  return { available: true };
}
```

**3. Payment Processing (Credit Deduction):**

**Location:** `src/lib/payment/plugins/credit-plugin.ts` → Payment processing logic

**Process:**

- After order creation, payment processing is triggered
- Credit plugin's `confirmPayment()` method:
  - Fetches order with Store and User relations
  - Validates:
    - Order exists
    - User ID exists
    - Store has credit system enabled
  - Calculates required credit:
    - `requiredCredit = orderTotal / creditExchangeRate`
  - Checks customer credit balance:
    - Queries `CustomerCredit` table
    - Gets current balance
    - Compares with required credit
  - If insufficient balance:
    - Returns error: "Insufficient credit balance"
    - Logs warning
    - Order remains unpaid
  - If sufficient balance:
    - Returns success confirmation
    - Actual credit deduction happens in transaction (see step 4)

**Code Reference:**

```typescript
// In credit-plugin.ts
async confirmPayment(orderId: string, paymentData: PaymentData, config: PluginConfig) {
  const order = await sqlClient.storeOrder.findUnique({
    where: { id: orderId },
    include: { Store: true, User: true },
  });
  
  const requiredCredit = Number(order.orderTotal) / Number(order.Store.creditExchangeRate);
  const customerCredit = await sqlClient.customerCredit.findUnique({
    where: { storeId_userId: { storeId: order.storeId, userId: order.User.id } },
  });
  
  const currentBalance = customerCredit ? Number(customerCredit.point) : 0;
  
  if (currentBalance < requiredCredit) {
    return { success: false, paymentStatus: "failed", error: "Insufficient credit balance" };
  }
  
  return { success: true, paymentStatus: "paid" };
}
```

**4. Credit Deduction and Order Completion (Atomic Transaction):**

**Location:** Payment processing logic (varies by use case)

**Process:**

- Credit deduction and order completion happen in a single database transaction
- Transaction includes:
  1. **Deduct credit from customer balance:**
     - Update `CustomerCredit.point` (decrement by required credit)
     - Calculate new balance: `newBalance = currentBalance - requiredCredit`
  2. **Create `CustomerCreditLedger` entry:**
     - Type: `SPEND`
     - Amount: negative (debit) = `-requiredCredit`
     - Balance: new balance after deduction
     - `referenceId`: order ID
     - Note: Description of purchase
  3. **Update order:**
     - `isPaid = true`
     - `paidDate = getUtcNowEpoch()`
     - `paymentStatus = PaymentStatus.Paid`
     - `orderStatus = OrderStatus.Processing` (or `Confirmed`)
  4. **Create `StoreLedger` entry:**
     - Amount: order total (positive, revenue)
     - Fee: 0 (credit payments have zero fees)
     - Platform fee: 0 (credit payments have zero platform fees)
     - Type: `CreditUsage` (revenue recognition)
     - Balance: previous balance + order total
     - Description: Order details
     - Availability: Immediate (no clear days for credit usage)

**Code Reference (from RSVP prepaid payment example):**

```typescript
await sqlClient.$transaction(async (tx) => {
  // 1. Create StoreOrder
  const storeOrder = await tx.storeOrder.create({
    data: {
      // ... order data
      isPaid: true,
      paymentStatus: PaymentStatus.Paid,
      paymentMethodId: creditPaymentMethod.id,
    },
  });
  
  // 2. Deduct credit
  const newBalance = currentBalance - requiredCredit;
  await tx.customerCredit.upsert({
    where: { storeId_userId: { storeId, userId: customerId } },
    update: { point: new Prisma.Decimal(newBalance) },
    create: { storeId, userId: customerId, point: new Prisma.Decimal(newBalance) },
  });
  
  // 3. Create CustomerCreditLedger
  await tx.customerCreditLedger.create({
    data: {
      storeId,
      userId: customerId,
      amount: new Prisma.Decimal(-requiredCredit),
      balance: new Prisma.Decimal(newBalance),
      type: "SPEND",
      referenceId: storeOrder.id,
      note: "Order payment",
    },
  });
  
  // 4. Create StoreLedger
  await tx.storeLedger.create({
    data: {
      storeId,
      orderId: storeOrder.id,
      amount: new Prisma.Decimal(cashValue),
      fee: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      type: StoreLedgerType.CreditUsage,
      balance: new Prisma.Decimal(previousBalance + cashValue),
    },
  });
});
```

**5. Success/Completion:**

**Process:**

- Order is immediately marked as paid
- Customer credit balance is reduced
- Ledger entries are created
- Order is ready for processing/fulfillment
- No redirect to external payment page needed
- User can proceed to order confirmation/success page

**State Transitions:**

```text
Order State Flow:
Pending → Processing/Confirmed (immediate, after credit deduction)
PaymentStatus: Pending → Paid (immediate)
isPaid: false → true (immediate)
CustomerCredit: balance → balance - requiredCredit
```

**Error Handling:**

1. **User Not Signed In:**
   - Credit payment not available
   - User must sign in to use credit
   - Order creation may fail or use different payment method

2. **Store Credit System Disabled:**
   - `Store.useCustomerCredit = false`
   - Credit payment not available
   - Error: "Store does not have credit system enabled"

3. **Insufficient Credit Balance:**
   - `currentBalance < requiredCredit`
   - Payment confirmation fails
   - Order remains unpaid
   - User needs to recharge credit or use different payment method
   - Warning logged with balance details

4. **Credit Exchange Rate Not Configured:**
   - `creditExchangeRate = 0` or null
   - Cannot calculate required credit
   - Payment processing fails
   - Error: "Credit exchange rate is not configured"

5. **Transaction Failure:**
   - Database transaction fails
   - All changes rolled back
   - Order remains unpaid
   - Credit balance unchanged
   - Error logged with details

**Security Considerations:**

- Credit deduction happens in atomic transaction (all-or-nothing)
- Credit balance checked before deduction (prevents negative balances)
- Order ID stored in `CustomerCreditLedger.referenceId` for audit trail
- All credit operations logged with structured metadata
- User must be authenticated to use credit payments
- Store credit system must be enabled

**Fee Structure:**

- **Payment Gateway Fee:** 0 (no external gateway)
- **Fee Tax:** 0 (no fees to tax)
- **Platform Fee:** 0 (credit usage is revenue recognition, not payment processing)
- **Total Fees:** 0

**Files Involved:**

- `src/app/s/[storeId]/checkout/client.tsx` - Checkout and order creation
- `src/actions/store/order/create-order.ts` - Order creation action
- `src/lib/payment/plugins/credit-plugin.ts` - Credit payment plugin
- `src/actions/store/reservation/process-rsvp-prepaid-payment.ts` - RSVP credit payment example
- `src/actions/storeAdmin/rsvp/deduce-customer-credit.ts` - Credit deduction utilities

**Testing Checklist:**

- [ ] Order creation with credit payment method
- [ ] User must be signed in to use credit
- [ ] Store credit system must be enabled
- [ ] Credit balance validation (sufficient vs insufficient)
- [ ] Credit deduction in atomic transaction
- [ ] CustomerCreditLedger entry created correctly
- [ ] StoreLedger entry created with zero fees
- [ ] Order marked as paid immediately
- [ ] Insufficient balance error handling
- [ ] Transaction rollback on failure
- [ ] Credit exchange rate calculation
- [ ] Multiple concurrent credit payments (race condition handling)

#### 6.1.5 Cash/In-Person Payment Flow

**Overview:**

The cash/in-person payment flow handles payments made with physical cash or in-person transactions at the store location. Payment confirmation can be immediate (upon order creation) or manual (by store staff via admin interface). Cash payments have zero processing fees.

**Flow Diagram:**

```text
Option 1 (Immediate):
1. Checkout → 2. Order Creation → 3. Immediate Confirmation → 4. Success

Option 2 (Manual):
1. Checkout → 2. Order Creation → 3. Pending Payment → 4. Store Staff Confirms → 5. Success
```

**Detailed Flow:**

**1. Order Creation:**

**Location:** `src/app/s/[storeId]/checkout/client.tsx` → `src/actions/store/order/create-order.ts`

**Process:**

- User clicks "Place Order" button in checkout
- User selects cash/in-person payment method (`payUrl = "cash"`)
- Client component collects order data
- Calls API: `POST /api/store/[storeId]/create-order`
- Server action: `createOrderAction` creates `StoreOrder` with:
  - `paymentMethodId` = Cash payment method ID
  - `paymentStatus = PaymentStatus.Pending` (default)
  - `isPaid = false` (default, unless immediate confirmation)
  - `orderStatus = OrderStatus.Pending` (or `Processing` if `autoAcceptOrder`)

**Configuration Options:**

- **Immediate Confirmation Mode:**
  - If `storeConfig.immediateConfirmation = true`
  - Order is marked as paid immediately upon creation
  - `isPaid = true`, `paymentStatus = Paid`, `paidDate = current timestamp`
  - Suitable for: Online orders with cash-on-delivery, pickup orders

- **Manual Confirmation Mode (Default):**
  - If `storeConfig.immediateConfirmation = false` or not set
  - Order remains in `Pending` payment status
  - Store staff confirms payment later via admin interface
  - Suitable for: In-store orders, orders requiring verification

**Code Reference:**

```typescript
// In create-order.ts
const order = await sqlClient.storeOrder.create({
  data: {
    storeId,
    paymentMethodId, // Cash payment method
    isPaid: false, // Or true if immediate confirmation
    paymentStatus: PaymentStatus.Pending, // Or Paid if immediate
    // ... other fields
  },
});
```

**2. Payment Confirmation:**

##### Option 1: Immediate Confirmation

**Location:** Order creation logic or cash plugin

**Process:**

- If `immediateConfirmation = true`:
  - Order is marked as paid during creation
  - `isPaid = true`
  - `paidDate = getUtcNowEpoch()`
  - `paymentStatus = PaymentStatus.Paid`
  - Proceeds directly to order completion (step 3)

##### Option 2: Manual Confirmation

**Location:** `src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts`

**Process:**

- Order remains in `Pending` payment status
- Store staff accesses admin interface
- Staff views unpaid orders
- Staff clicks "Mark as Paid" for cash orders
- API call: `POST /api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]`
- Server action: `markOrderAsPaidAction` (store admin version)
- Validates:
  - Order exists
  - Order belongs to store
  - Order is not already paid
  - User has store admin access
- Marks order as paid:
  - `isPaid = true`
  - `paidDate = getUtcNowEpoch()`
  - `paymentStatus = PaymentStatus.Paid`
  - `orderStatus = OrderStatus.Processing`
  - `checkoutAttributes = JSON.stringify({ paymentMethod: "cash" })`

**Code Reference:**

```typescript
// In cash-mark-as-paid route
const result = await markOrderAsPaidAction(
  params.storeId,
  {
    orderId: params.orderId,
    checkoutAttributes: JSON.stringify({ paymentMethod: "cash" }),
  }
);
```

**3. Order Completion:**

**Location:** `src/actions/storeAdmin/order/mark-order-as-paid.ts` or `src/actions/store/order/mark-order-as-paid.ts`

**Process:**

- `markOrderAsPaidAction` is called (see section 5.1.1)
- Determines platform payment processing (`usePlatform`)
- Calculates fees:
  - **Payment Gateway Fee:** 0 (cash has no gateway)
  - **Fee Tax:** 0 (no fees to tax)
  - **Platform Fee:** 0 (cash payments have zero platform fees, even for free stores)
- Updates order in transaction:
  - `isPaid = true`
  - `paidDate = getUtcNowEpoch()`
  - `orderStatus = OrderStatus.Processing`
  - `paymentStatus = PaymentStatus.Paid`
  - `paymentCost = 0` (zero fees)
  - `checkoutAttributes` = payment method data
- Creates `StoreLedger` entry:
  - Amount: order total (positive, revenue)
  - Fee: 0
  - Platform fee: 0
  - Type: `StorePaymentProvider` (1) or `PlatformPayment` (0) based on `usePlatform`
  - Balance: previous balance + order total
  - Description: Order details
  - Availability: Order date + payment method `clearDays` (typically 0 for cash)
- Returns updated order

**Code Reference:**

```typescript
// In mark-order-as-paid.ts
// Cash payments: fees are always zero
let fee = new Prisma.Decimal(0);
let feeTax = new Prisma.Decimal(0);
let platformFee = new Prisma.Decimal(0);

await sqlClient.$transaction(async (tx) => {
  await tx.storeOrder.update({
    where: { id: orderId },
    data: {
      isPaid: true,
      paidDate: now,
      paymentStatus: PaymentStatus.Paid,
      paymentCost: fee.add(feeTax).add(platformFee), // = 0
    },
  });
  
  await tx.storeLedger.create({
    data: {
      orderId,
      storeId,
      amount: order.orderTotal,
      fee: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      type: StoreLedgerType.StorePaymentProvider,
      balance: new Prisma.Decimal(previousBalance + Number(order.orderTotal)),
    },
  });
});
```

**4. Success/Completion:**

**Process:**

- Order is marked as paid
- StoreLedger entry created with zero fees
- Order is ready for processing/fulfillment
- Store staff can view confirmed orders
- Customer receives order confirmation

**State Transitions:**

```text
Order State Flow (Immediate):
Pending → Processing (immediate, upon creation)
PaymentStatus: Pending → Paid (immediate)
isPaid: false → true (immediate)

Order State Flow (Manual):
Pending → Pending (awaiting confirmation)
PaymentStatus: Pending → Pending (awaiting confirmation)
isPaid: false → false (awaiting confirmation)
  ↓ (after staff confirmation)
Pending → Processing
PaymentStatus: Pending → Paid
isPaid: false → true
```

**Error Handling:**

1. **Order Already Paid:**
   - Order is already marked as paid
   - Action returns existing order (idempotent)
   - No error, just returns current state

2. **Order Not Found:**
   - Order ID doesn't exist
   - Error: "Order not found"
   - Returns 400 status

3. **Order Belongs to Different Store:**
   - Store admin tries to mark order from different store
   - Error: "Order does not belong to this store"
   - Returns 400 status

4. **Access Denied:**
   - User doesn't have store admin access
   - `storeActionClient` validates access
   - Returns 401/403 status

5. **Transaction Failure:**
   - Database transaction fails
   - All changes rolled back
   - Order remains unpaid
   - Error logged with details

**Security Considerations:**

- Store admin access required for manual confirmation
- Order ownership validated (order must belong to store)
- Idempotent operation (can be called multiple times safely)
- All payment confirmations logged with structured metadata
- `checkoutAttributes` stores payment method for audit trail

**Fee Structure:**

- **Payment Gateway Fee:** 0 (no external gateway)
- **Fee Tax:** 0 (no fees to tax)
- **Platform Fee:** 0 (cash payments have zero platform fees, even for free stores)
- **Total Fees:** 0

**Configuration:**

- **Immediate Confirmation:**
  - `storeConfig.immediateConfirmation = true`
  - Order marked as paid immediately
  - Suitable for: COD, pickup orders

- **Manual Confirmation (Default):**
  - `storeConfig.immediateConfirmation = false` or not set
  - Requires store staff confirmation
  - Suitable for: In-store orders, verification required

**Files Involved:**

- `src/app/s/[storeId]/checkout/client.tsx` - Checkout and order creation
- `src/actions/store/order/create-order.ts` - Order creation action
- `src/lib/payment/plugins/cash-plugin.ts` - Cash payment plugin
- `src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts` - Manual confirmation API
- `src/actions/storeAdmin/order/mark-order-as-paid.ts` - Store admin mark as paid action
- `src/actions/store/order/mark-order-as-paid.ts` - General mark as paid action

**Testing Checklist:**

- [ ] Order creation with cash payment method
- [ ] Immediate confirmation mode (if configured)
- [ ] Manual confirmation via admin interface
- [ ] Store admin access validation
- [ ] Order ownership validation
- [ ] Idempotent operation (multiple calls safe)
- [ ] StoreLedger entry created with zero fees
- [ ] Order marked as paid correctly
- [ ] Payment cost is zero
- [ ] Platform fee is zero (even for free stores)
- [ ] Error handling for invalid orders
- [ ] Error handling for access denied
- [ ] Transaction rollback on failure

### 6.2 Fee Calculation

#### 6.2.1 Payment Gateway Fees

**Overview:**

Payment gateway fees are charges from payment processing providers (Stripe, LINE Pay) for processing payments. These fees are deducted from the store's revenue and recorded in the `StoreLedger` entry. Gateway fees only apply when the platform processes payments on behalf of the store (`usePlatform = true`).

**Fee Calculation Logic:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`, `src/actions/storeAdmin/order/mark-order-as-paid.ts`

**Formula:**

```typescript
// Step 1: Calculate base gateway fee
const feeAmount = orderTotal * paymentMethod.fee + paymentMethod.feeAdditional;

// Step 2: Apply as negative value (deduction from revenue)
const gatewayFee = new Prisma.Decimal(-feeAmount);

// Step 3: Calculate tax on fees (5% tax on the fee amount)
const feeTax = new Prisma.Decimal(feeAmount * 0.05);

// Step 4: Total gateway fees (both negative, representing deductions)
const totalGatewayFees = gatewayFee + feeTax;
```

**Components:**

1. **Fee Rate (`paymentMethod.fee`):**
   - Percentage-based fee (e.g., 0.029 for 2.9%)
   - Stored in `PaymentMethod.fee` field (Decimal)
   - Applied to order total: `orderTotal * fee`

2. **Additional Fee (`paymentMethod.feeAdditional`):**
   - Fixed fee amount (e.g., 0.30 for 30 cents)
   - Stored in `PaymentMethod.feeAdditional` field (Decimal)
   - Added to percentage-based fee

3. **Fee Tax:**
   - 5% tax on the total fee amount
   - Calculated as: `feeAmount * 0.05`
   - Represents tax on payment processing fees

**Conditions for Gateway Fees:**

**Fees Apply When:**

- `usePlatform = true` (platform processes payment)
- Payment method is Stripe or LINE Pay (not cash or credit)
- Order is marked as paid

**Fees Do NOT Apply When:**

- `usePlatform = false` (store uses own payment provider)
- Payment method is cash (`payUrl = "cash"`)
- Payment method is credit (`payUrl = "credit"`)

**Determining `usePlatform`:**

```typescript
// In mark-order-as-paid.ts
const isPro = (order.Store.level ?? 0) > 0;
let usePlatform = false;

if (!isPro) {
  // Free-level stores always use platform payment processing
  usePlatform = true;
} else {
  // Pro-level stores use platform if they have LINE Pay or Stripe configured
  if (
    order.Store.LINE_PAY_ID !== null ||
    order.Store.STRIPE_SECRET_KEY !== null
  ) {
    usePlatform = true;
  }
}
```

**Payment Method-Specific Fees:**

**Stripe:**

- Default fee rate: 2.9% (0.029)
- Default additional fee: $0.30 (0.30)
- Formula: `orderTotal * 0.029 + 0.30`
- Example: $100 order → $2.90 + $0.30 = $3.20 fee
- Fee tax: $3.20 * 0.05 = $0.16
- Total gateway fees: -$3.36

**LINE Pay:**

- Default fee rate: 3.0% (0.03)
- Default additional fee: $0.00 (0)
- Formula: `orderTotal * 0.03`
- Example: $100 order → $3.00 fee
- Fee tax: $3.00 * 0.05 = $0.15
- Total gateway fees: -$3.15

**Credit:**

- Fee rate: 0% (0)
- Additional fee: $0.00 (0)
- Total gateway fees: $0.00
- No fees applied (credit usage is revenue recognition, not payment processing)

**Cash:**

- Fee rate: 0% (0)
- Additional fee: $0.00 (0)
- Total gateway fees: $0.00
- No fees applied (no external gateway)

**Implementation:**

```typescript
// In mark-order-as-paid.ts
// Calculate fees (only for platform payments)
let fee = new Prisma.Decimal(0);
let feeTax = new Prisma.Decimal(0);

if (usePlatform) {
  // Fee rate is determined by payment method
  const feeAmount =
    Number(order.orderTotal) * Number(order.PaymentMethod.fee) +
    Number(order.PaymentMethod.feeAdditional);
  fee = new Prisma.Decimal(-feeAmount); // Negative for deduction
  feeTax = new Prisma.Decimal(feeAmount * 0.05); // 5% tax on fees
}

// Store in order
paymentCost: fee.toNumber() + feeTax.toNumber() + platformFee.toNumber(),

// Store in ledger
fee: fee.add(feeTax), // Combined fee and tax
```

**StoreLedger Entry:**

```typescript
await sqlClient.storeLedger.create({
  data: {
    orderId: order.id,
    storeId: order.storeId,
    amount: order.orderTotal, // Positive: revenue
    fee: fee.add(feeTax), // Negative: gateway fees (fee + tax)
    platformFee: platformFee, // Negative: platform fee (if applicable)
    currency: order.currency,
    type: usePlatform ? StoreLedgerType.PlatformPayment : StoreLedgerType.StorePaymentProvider,
    balance: new Prisma.Decimal(
      previousBalance +
      Number(order.orderTotal) +
      fee.toNumber() +
      feeTax.toNumber() +
      platformFee.toNumber()
    ),
  },
});
```

**Examples:**

##### Example 1: Stripe Payment (Free Store)

- Order total: $100.00
- Payment method: Stripe (fee: 0.029, feeAdditional: 0.30)
- `usePlatform = true` (Free store)
- Calculation:
  - Fee amount: $100 * 0.029 + $0.30 = $2.90 + $0.30 = $3.20
  - Gateway fee: -$3.20
  - Fee tax: $3.20 * 0.05 = $0.16
  - Platform fee: -$1.00 (1% of $100, see section 6.2.2)
  - Total deductions: -$3.20 - $0.16 - $1.00 = -$4.36
  - Store receives: $100.00 - $4.36 = $95.64

##### Example 2: LINE Pay Payment (Pro Store with Platform Processing)

- Order total: $100.00
- Payment method: LINE Pay (fee: 0.03, feeAdditional: 0)
- `usePlatform = true` (Pro store with LINE Pay configured)
- Calculation:
  - Fee amount: $100 * 0.03 + $0 = $3.00
  - Gateway fee: -$3.00
  - Fee tax: $3.00 * 0.05 = $0.15
  - Platform fee: $0 (Pro store)
  - Total deductions: -$3.00 - $0.15 = -$3.15
  - Store receives: $100.00 - $3.15 = $96.85

##### Example 3: Cash Payment

- Order total: $100.00
- Payment method: Cash
- `usePlatform = false` (cash has no gateway)
- Calculation:
  - Gateway fee: $0
  - Fee tax: $0
  - Platform fee: $0 (cash payments exempt)
  - Total deductions: $0
  - Store receives: $100.00

##### Example 4: Credit Payment

- Order total: $100.00
- Payment method: Credit
- `usePlatform = false` (credit has no gateway)
- Calculation:
  - Gateway fee: $0
  - Fee tax: $0
  - Platform fee: $0 (credit usage is revenue recognition)
  - Total deductions: $0
  - Store receives: $100.00

**Files Involved:**

- `src/actions/store/order/mark-order-as-paid.ts` - General order payment
- `src/actions/storeAdmin/order/mark-order-as-paid.ts` - Store admin order payment
- `src/lib/payment/plugins/stripe-plugin.ts` - Stripe fee calculation
- `src/lib/payment/plugins/linepay-plugin.ts` - LINE Pay fee calculation
- `src/lib/payment/plugins/credit-plugin.ts` - Credit fee calculation (zero fees)
- `src/lib/payment/plugins/cash-plugin.ts` - Cash fee calculation (zero fees)

**Testing Checklist:**

- [ ] Gateway fees calculated correctly for Stripe
- [ ] Gateway fees calculated correctly for LINE Pay
- [ ] Fee tax (5%) calculated correctly
- [ ] Gateway fees only apply when `usePlatform = true`
- [ ] Cash payments have zero gateway fees
- [ ] Credit payments have zero gateway fees
- [ ] Fees stored as negative values in ledger
- [ ] Payment method fee rates used correctly
- [ ] Additional fees added correctly
- [ ] Fee calculation handles edge cases (zero amounts, very large amounts)

#### 6.2.2 Platform Fees

**Overview:**

Platform fees are charges by riben.life for using the platform's payment processing services. These fees are separate from payment gateway fees and only apply to Free-level stores. Platform fees are deducted from the store's revenue and recorded in the `StoreLedger` entry.

**Fee Calculation Logic:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`, `src/actions/storeAdmin/order/mark-order-as-paid.ts`

**Formula:**

```typescript
// Determine if store is Pro-level
const isPro = (order.Store.level ?? 0) > 0;

// Calculate platform fee (only for Free stores)
let platformFee = new Prisma.Decimal(0);
if (!isPro) {
  // 1% platform fee for Free-level stores
  platformFee = new Prisma.Decimal(-Number(order.orderTotal) * 0.01);
}
```

**Components:**

1. **Store Level Determination:**
   - `isPro = true`: Store has Pro or Multi subscription (`level > 0`)
   - `isPro = false`: Store is Free-level (`level = 0` or null)

2. **Platform Fee Rate:**
   - Fixed rate: 1% (0.01)
   - Applied to order total: `orderTotal * 0.01`
   - Stored as negative value (deduction from revenue)

**Conditions for Platform Fees:**

**Fees Apply When:**

- Store is Free-level (`isPro = false`)
- Order is marked as paid
- Payment method is NOT cash

**Fees Do NOT Apply When:**

- Store is Pro-level (`isPro = true`)
- Payment method is cash (`payUrl = "cash"`) - **Even for Free stores**
- Payment method is credit (`payUrl = "credit"`) - Credit usage is revenue recognition

**Store Level Determination:**

```typescript
// In mark-order-as-paid.ts
const isPro = (order.Store.level ?? 0) > 0;

// Platform fee calculation
let platformFee = new Prisma.Decimal(0);
if (!isPro) {
  // Always charge platform fee for free stores
  platformFee = new Prisma.Decimal(-Number(order.orderTotal) * 0.01);
}
```

**Implementation:**

```typescript
// In mark-order-as-paid.ts
// Platform fee (only for Free stores)
let platformFee = new Prisma.Decimal(0);
if (!isPro) {
  // 1% platform fee for Free-level stores
  platformFee = new Prisma.Decimal(-Number(order.orderTotal) * 0.01);
}

// Store in order
paymentCost: fee.toNumber() + feeTax.toNumber() + platformFee.toNumber(),

// Store in ledger
platformFee: platformFee, // Negative: platform fee (if applicable)
```

**StoreLedger Entry:**

```typescript
await sqlClient.storeLedger.create({
  data: {
    orderId: order.id,
    storeId: order.storeId,
    amount: order.orderTotal, // Positive: revenue
    fee: fee.add(feeTax), // Negative: gateway fees (if applicable)
    platformFee: platformFee, // Negative: platform fee (if applicable)
    currency: order.currency,
    type: usePlatform ? StoreLedgerType.PlatformPayment : StoreLedgerType.StorePaymentProvider,
    balance: new Prisma.Decimal(
      previousBalance +
      Number(order.orderTotal) +
      fee.toNumber() +
      feeTax.toNumber() +
      platformFee.toNumber()
    ),
  },
});
```

**Examples:**

##### Example 1: Free Store - Stripe Payment

- Order total: $100.00
- Store level: 0 (Free)
- Payment method: Stripe
- Calculation:
  - Platform fee: -$100.00 * 0.01 = -$1.00
  - Gateway fees: -$3.36 (from section 6.2.1)
  - Total deductions: -$1.00 - $3.36 = -$4.36
  - Store receives: $100.00 - $4.36 = $95.64

##### Example 2: Free Store - Cash Payment

- Order total: $100.00
- Store level: 0 (Free)
- Payment method: Cash
- Calculation:
  - Platform fee: $0 (cash payments exempt, even for Free stores)
  - Gateway fees: $0 (cash has no gateway)
  - Total deductions: $0
  - Store receives: $100.00

##### Example 3: Pro Store - Stripe Payment

- Order total: $100.00
- Store level: 1+ (Pro)
- Payment method: Stripe
- Calculation:
  - Platform fee: $0 (Pro stores exempt)
  - Gateway fees: -$3.36 (from section 6.2.1)
  - Total deductions: -$3.36
  - Store receives: $100.00 - $3.36 = $96.64

##### Example 4: Free Store - Credit Payment

- Order total: $100.00
- Store level: 0 (Free)
- Payment method: Credit
- Calculation:
  - Platform fee: $0 (credit usage is revenue recognition, not payment processing)
  - Gateway fees: $0 (credit has no gateway)
  - Total deductions: $0
  - Store receives: $100.00

**Special Cases:**

**Cash Payments (Free Stores):**

- Even though Free stores normally pay 1% platform fee
- Cash payments are exempt from platform fees
- Rationale: Cash payments don't use platform payment processing services
- Platform fee: $0 (regardless of store level)

**Credit Payments (All Stores):**

- Credit usage is revenue recognition, not payment processing
- No platform fees apply (even for Free stores)
- Rationale: Customer credit was already purchased (revenue recognized at purchase)
- Platform fee: $0 (regardless of store level)

**Combined Fee Calculation:**

```typescript
// Complete fee calculation example
const orderTotal = 100.00;
const isPro = false; // Free store
const usePlatform = true; // Using platform payment processing
const paymentMethod = { fee: 0.029, feeAdditional: 0.30 }; // Stripe

// Gateway fees
const feeAmount = orderTotal * paymentMethod.fee + paymentMethod.feeAdditional;
// = 100 * 0.029 + 0.30 = 2.90 + 0.30 = 3.20
const gatewayFee = -feeAmount; // -3.20
const feeTax = feeAmount * 0.05; // 3.20 * 0.05 = 0.16
const totalGatewayFees = gatewayFee + feeTax; // -3.20 + 0.16 = -3.36

// Platform fee
const platformFee = isPro ? 0 : -(orderTotal * 0.01);
// = -(100 * 0.01) = -1.00

// Total fees
const totalFees = totalGatewayFees + platformFee;
// = -3.36 + (-1.00) = -4.36

// Store receives
const storeReceives = orderTotal + totalFees;
// = 100.00 + (-4.36) = 95.64
```

**Files Involved:**

- `src/actions/store/order/mark-order-as-paid.ts` - General order payment
- `src/actions/storeAdmin/order/mark-order-as-paid.ts` - Store admin order payment
- `src/actions/storeAdmin/is-pro-level.ts` - Store level determination utility

**Testing Checklist:**

- [ ] Platform fee calculated correctly for Free stores (1%)
- [ ] Platform fee is zero for Pro stores
- [ ] Platform fee is zero for cash payments (even Free stores)
- [ ] Platform fee is zero for credit payments (even Free stores)
- [ ] Platform fee stored as negative value in ledger
- [ ] Store level determination works correctly
- [ ] Combined with gateway fees correctly
- [ ] Fee calculation handles edge cases (zero amounts, very large amounts)

#### 6.2.3 Store Ledger Entry

**Overview:**

StoreLedger entries track all financial transactions for a store, including order payments, fees, and credit operations. Each entry represents a change to the store's balance and includes revenue, fees, and availability date information. StoreLedger entries are created atomically with order payment confirmation to ensure data consistency.

**Purpose:**

- Track store revenue and expenses
- Calculate running balance for each store
- Record payment processing fees
- Track platform fees
- Determine fund availability dates
- Provide audit trail for all financial transactions

**Entry Creation Process:**

**Location:** `src/actions/store/order/mark-order-as-paid.ts`, `src/actions/storeAdmin/order/mark-order-as-paid.ts`

##### Step 1: Get Last Ledger Balance

```typescript
// Get the most recent ledger entry for the store
const lastLedger = await sqlClient.storeLedger.findFirst({
  where: { storeId: order.storeId },
  orderBy: { createdAt: "desc" },
  take: 1,
});

// Extract balance (default to 0 if no previous entries)
const balance = Number(lastLedger ? lastLedger.balance : 0);
```

##### Step 2: Calculate Availability Date

```typescript
// Convert order updatedAt (BigInt epoch) to Date
const orderUpdatedDate = epochToDate(order.updatedAt);
if (!orderUpdatedDate) {
  throw new SafeError("Order updatedAt is invalid");
}

// Get payment method clear days (settlement period)
const clearDays = order.PaymentMethod.clearDays || 0;

// Calculate availability date: order date + clear days
const availabilityDate = new Date(
  orderUpdatedDate.getTime() + clearDays * 24 * 60 * 60 * 1000
);

// Convert back to BigInt epoch for storage
const availability = BigInt(availabilityDate.getTime());
```

**Clear Days Explanation:**

- `clearDays`: Number of days until funds are available for withdrawal
- Payment methods have different settlement periods:

  - Stripe: Typically 2-7 days (configurable)
  - LINE Pay: Typically 1-3 days (configurable)
  - Cash: Typically 0 days (immediate)
  - Credit: Typically 0 days (immediate, revenue recognition)

- `availability` field stores when funds become available for payout

##### Step 3: Determine Ledger Type

```typescript
// Determine ledger type based on payment processing method
const ledgerType = usePlatform
  ? StoreLedgerType.PlatformPayment // 0: 代收 (platform payment processing)
  : StoreLedgerType.StorePaymentProvider; // 1: Store's own payment provider
```

**Ledger Types:**

- **`PlatformPayment` (0)**: Platform processes payment on behalf of store

  - Used when: `usePlatform = true`
  - Examples: Free stores, Pro stores using platform Stripe/LINE Pay
  - Funds held by platform until availability date

- **`StorePaymentProvider` (1)**: Store uses own payment provider

  - Used when: `usePlatform = false`
  - Examples: Pro stores with own Stripe/LINE Pay accounts
  - Funds go directly to store's payment provider

- **`CreditRecharge` (2)**: Customer credit top-up

  - Used for: Credit recharge orders
  - Represents: Unearned revenue (liability)
  - Funds: Held until credit is used

- **`CreditUsage` (3)**: Credit usage for purchase

  - Used for: Orders paid with customer credit
  - Represents: Revenue recognition
  - Funds: Immediate availability (no clear days)

##### Step 4: Calculate New Balance

```typescript
// Calculate new balance after this transaction
const newBalance = balance +
  Number(order.orderTotal) +      // Revenue (positive)
  fee.toNumber() +                // Gateway fee (negative)
  feeTax.toNumber() +             // Fee tax (negative)
  platformFee.toNumber();         // Platform fee (negative)

// Example: $100 order, -$3.20 fee, -$0.16 tax, -$1.00 platform fee
// newBalance = previousBalance + 100 - 3.20 - 0.16 - 1.00
//            = previousBalance + 95.64
```

**Balance Calculation Formula:**

```typescript
newBalance = previousBalance + orderTotal + fee + feeTax + platformFee
```

Where:

- `previousBalance`: Balance from last ledger entry (or 0 if first entry)
- `orderTotal`: Order amount (positive, revenue)
- `fee`: Gateway fee (negative, deduction)
- `feeTax`: Tax on fees (negative, deduction)
- `platformFee`: Platform fee (negative, deduction)

##### Step 5: Create StoreLedger Entry

```typescript
await sqlClient.storeLedger.create({
  data: {
    storeId: order.storeId,                    // Store ID
    orderId: order.id,                         // Order ID (required)
    amount: order.orderTotal,                  // Order total (positive, revenue)
    fee: fee.add(feeTax),                      // Combined gateway fees (negative)
    platformFee: platformFee,                   // Platform fee (negative, if applicable)
    currency: order.currency.toLowerCase(),     // Currency code (lowercase)
    type: ledgerType,                          // Ledger type (0, 1, 2, or 3)
    description: `order # ${order.orderNum || order.id}`, // Description
    note: `${order.PaymentMethod?.name || "Unknown"}, order id: ${order.id}`, // Note
    availability: BigInt(availabilityDate.getTime()), // Availability date (BigInt epoch)
    balance: new Prisma.Decimal(newBalance),   // New running balance
    createdAt: getUtcNowEpoch(),               // Creation timestamp
    createdBy: session?.user?.id || null,      // User who created (if applicable)
  },
});
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String | Unique ledger entry ID | `"uuid"` |
| `storeId` | String | Store ID (required) | `"store_123"` |
| `orderId` | String | Order ID (required) | `"order_456"` |
| `amount` | Decimal | Order total (positive, revenue) | `100.00` |
| `fee` | Decimal | Gateway fees + tax (negative) | `-3.36` |
| `platformFee` | Decimal | Platform fee (negative, if applicable) | `-1.00` |
| `currency` | String | Currency code (lowercase) | `"twd"` |
| `type` | Int | Ledger type (0-3) | `0` (PlatformPayment) |
| `description` | String | Entry description | `"order # ORD-123"` |
| `note` | String? | Additional notes | `"Stripe, order id: abc"` |
| `availability` | BigInt | Availability date (epoch milliseconds) | `1735689600000` |
| `balance` | Decimal | Running balance after this entry | `195.64` |
| `createdAt` | BigInt | Creation timestamp (epoch milliseconds) | `1735689600000` |
| `createdBy` | String? | User ID who created (optional) | `"user_789"` |

**Complete Implementation Example:**

```typescript
// In mark-order-as-paid.ts
// 1. Get last balance
const lastLedger = await sqlClient.storeLedger.findFirst({
  where: { storeId: order.storeId },
  orderBy: { createdAt: "desc" },
  take: 1,
});
const balance = Number(lastLedger ? lastLedger.balance : 0);

// 2. Calculate fees (from sections 6.2.1 and 6.2.2)
let fee = new Prisma.Decimal(0);
let feeTax = new Prisma.Decimal(0);
if (usePlatform) {
  const feeAmount =
    Number(order.orderTotal) * Number(order.PaymentMethod.fee) +
    Number(order.PaymentMethod.feeAdditional);
  fee = new Prisma.Decimal(-feeAmount);
  feeTax = new Prisma.Decimal(feeAmount * 0.05);
}

let platformFee = new Prisma.Decimal(0);
if (!isPro) {
  platformFee = new Prisma.Decimal(-Number(order.orderTotal) * 0.01);
}

// 3. Calculate availability date
const orderUpdatedDate = epochToDate(order.updatedAt);
if (!orderUpdatedDate) {
  throw new SafeError("Order updatedAt is invalid");
}
const clearDays = order.PaymentMethod.clearDays || 0;
const availabilityDate = new Date(
  orderUpdatedDate.getTime() + clearDays * 24 * 60 * 60 * 1000
);

// 4. Determine ledger type
const ledgerType = usePlatform
  ? StoreLedgerType.PlatformPayment
  : StoreLedgerType.StorePaymentProvider;

// 5. Calculate new balance
const newBalance = balance +
  Number(order.orderTotal) +
  fee.toNumber() +
  feeTax.toNumber() +
  platformFee.toNumber();

// 6. Create ledger entry in transaction
await sqlClient.$transaction(async (tx) => {
  // Update order
  await tx.storeOrder.update({
    where: { id: orderId },
    data: {
      isPaid: true,
      paidDate: getUtcNowEpoch(),
      paymentStatus: PaymentStatus.Paid,
      paymentCost: fee.toNumber() + feeTax.toNumber() + platformFee.toNumber(),
    },
  });

  // Create ledger entry
  await tx.storeLedger.create({
    data: {
      storeId: order.storeId,
      orderId: order.id,
      amount: order.orderTotal,
      fee: fee.add(feeTax),
      platformFee,
      currency: order.currency.toLowerCase(),
      type: ledgerType,
      description: `order # ${order.orderNum || order.id}`,
      note: `${order.PaymentMethod?.name || "Unknown"}, order id: ${order.id}`,
      availability: BigInt(availabilityDate.getTime()),
      balance: new Prisma.Decimal(newBalance),
      createdAt: getUtcNowEpoch(),
    },
  });
});
```

**Examples:**

##### Example 1: Stripe Payment (Free Store) - StoreLedger

**Scenario:**

- Previous balance: $100.00
- Order total: $100.00
- Payment method: Stripe (fee: 2.9% + $0.30, clearDays: 7)
- Store level: Free (platform fee applies)

**Calculation:**

- Gateway fee: -$3.20 (2.9% of $100 + $0.30)
- Fee tax: -$0.16 (5% of $3.20)
- Platform fee: -$1.00 (1% of $100)
- New balance: $100.00 + $100.00 - $3.20 - $0.16 - $1.00 = $195.64
- Availability: Order date + 7 days

**StoreLedger Entry:**

```typescript
{
  storeId: "store_123",
  orderId: "order_456",
  amount: 100.00,           // Revenue
  fee: -3.36,               // Gateway fees + tax
  platformFee: -1.00,       // Platform fee
  currency: "twd",
  type: 0,                  // PlatformPayment
  description: "order # ORD-456",
  note: "Stripe, order id: order_456",
  availability: 1736294400000, // Order date + 7 days
  balance: 195.64,          // Previous $100 + $95.64 net
  createdAt: 1735689600000,
}
```

##### Example 2: Cash Payment (Free Store) - StoreLedger

**Scenario:**

- Previous balance: $100.00
- Order total: $100.00
- Payment method: Cash (clearDays: 0)
- Store level: Free (but cash exempt from platform fee)

**Calculation:**

- Gateway fee: $0 (cash has no gateway)
- Fee tax: $0
- Platform fee: $0 (cash exempt, even for Free stores)
- New balance: $100.00 + $100.00 = $200.00
- Availability: Order date (immediate)

**StoreLedger Entry:**

```typescript
{
  storeId: "store_123",
  orderId: "order_789",
  amount: 100.00,           // Revenue
  fee: 0,                   // No gateway fees
  platformFee: 0,           // Cash exempt
  currency: "twd",
  type: 1,                  // StorePaymentProvider
  description: "order # ORD-789",
  note: "Cash/In-Person, order id: order_789",
  availability: 1735689600000, // Immediate (0 days)
  balance: 200.00,          // Previous $100 + $100
  createdAt: 1735689600000,
}
```

##### Example 3: Credit Payment - StoreLedger

**Scenario:**

- Previous balance: $100.00
- Order total: $100.00
- Payment method: Credit (clearDays: 0)
- Store level: Free

**Calculation:**

- Gateway fee: $0 (credit has no gateway)
- Fee tax: $0
- Platform fee: $0 (credit usage is revenue recognition)
- New balance: $100.00 + $100.00 = $200.00
- Availability: Order date (immediate)

**StoreLedger Entry:**

```typescript
{
  storeId: "store_123",
  orderId: "order_101",
  amount: 100.00,           // Revenue
  fee: 0,                   // No gateway fees
  platformFee: 0,           // Credit usage exempt
  currency: "twd",
  type: 3,                  // CreditUsage
  description: "order # ORD-101",
  note: "Credit, order id: order_101",
  availability: 1735689600000, // Immediate (0 days)
  balance: 200.00,          // Previous $100 + $100
  createdAt: 1735689600000,
}
```

**Transaction Safety:**

- StoreLedger entry creation happens within a database transaction
- Transaction includes:
  - Order update (mark as paid)
  - StoreLedger entry creation
- If either operation fails, both are rolled back
- Ensures data consistency (order and ledger always in sync)

**Balance Tracking:**

- Each StoreLedger entry maintains a running balance
- Balance represents store's total revenue minus fees
- Balance is calculated incrementally:
  - First entry: `balance = orderTotal + fees`
  - Subsequent entries: `balance = previousBalance + orderTotal + fees`
- Balance is stored as `Decimal` for precision
- Balance can be queried to get current store revenue

**Availability Date:**

- Determines when funds are available for payout
- Calculated as: `order date + payment method clearDays`
- Stored as BigInt epoch milliseconds
- Used for:
  - Payout scheduling
  - Fund availability reporting
  - Cash flow management

**Ledger Type Usage:**

- **Type 0 (PlatformPayment)**: Platform holds funds until availability
- **Type 1 (StorePaymentProvider)**: Store receives funds directly
- **Type 2 (CreditRecharge)**: Credit top-up (unearned revenue)
- **Type 3 (CreditUsage)**: Credit usage (revenue recognition)

**Files Involved:**

- `src/actions/store/order/mark-order-as-paid.ts` - General order payment
- `src/actions/storeAdmin/order/mark-order-as-paid.ts` - Store admin order payment
- `src/actions/storeAdmin/storeLedger/create-store-ledger.ts` - Manual ledger entry creation
- `src/actions/store/reservation/process-rsvp-prepaid-payment.ts` - RSVP credit payment
- `src/actions/store/credit/process-credit-topup-after-payment.ts` - Credit recharge
- `src/types/enum.ts` - StoreLedgerType enum definition
- `prisma/schema.prisma` - StoreLedger model definition

**Testing Checklist:**

- [ ] Last ledger balance retrieved correctly
- [ ] New balance calculated correctly
- [ ] Availability date calculated correctly (order date + clearDays)
- [ ] Ledger type determined correctly (PlatformPayment vs StorePaymentProvider)
- [ ] StoreLedger entry created in transaction
- [ ] Transaction rollback on failure
- [ ] All fields populated correctly
- [ ] Balance increments correctly for multiple entries
- [ ] Currency stored in lowercase
- [ ] Description and note formatted correctly
- [ ] BigInt epoch conversion works correctly
- [ ] Decimal precision maintained
- [ ] First ledger entry (no previous balance) handled correctly

### 6.3 Payment Status Verification

**Overview:**

Payment status verification ensures that payments have been successfully processed by the payment gateway before marking orders as paid. Each payment method plugin implements a `verifyPaymentStatus` method that checks the current state of a payment transaction. Verification is performed server-side to ensure security and accuracy.

**Purpose:**

- Verify payment completion before order fulfillment
- Prevent duplicate payment processing
- Handle payment failures gracefully
- Support payment status polling for pending transactions
- Provide accurate payment status for order management

**Verification Flow:**

1. **Payment Gateway Verification:**
   - Query payment gateway API for transaction status
   - Compare with expected payment state
   - Return standardized status: `paid`, `pending`, or `failed`

2. **Order Status Update:**
   - If verified as `paid`: Mark order as paid and create ledger entry
   - If `pending`: Keep order in pending state, allow retry
   - If `failed`: Log error, keep order in pending state

3. **Error Handling:**
   - Network errors: Log and return `failed` or `pending`
   - API errors: Log with metadata, return appropriate status
   - Invalid payment data: Return `failed`

**Payment Status Types:**

- **`paid`**: Payment successfully completed
- **`pending`**: Payment in progress or awaiting confirmation
- **`failed`**: Payment failed or was canceled

#### 6.3.1 Stripe Verification

**Overview:**

Stripe payment verification uses the Stripe PaymentIntent API to check payment status. PaymentIntents represent a customer's intent to pay and track the payment lifecycle from creation to completion.

**Implementation:**

**Location:** `src/lib/payment/plugins/stripe-plugin.ts`

**Method:** `verifyPaymentStatus`

**Process:**

1. Extract `paymentIntentId` from `paymentData`
2. Call Stripe API: `stripe.paymentIntents.retrieve(paymentIntentId)`
3. Check `paymentIntent.status`:
   - `"succeeded"` → Return `paid`
   - `"requires_payment_method"` or `"canceled"` → Return `failed`
   - Other statuses → Return `pending`

**Code Implementation:**

```typescript
async verifyPaymentStatus(
  orderId: string,
  paymentData: PaymentData,
  config: PluginConfig,
): Promise<PaymentStatus> {
  const paymentIntentId = paymentData.paymentIntentId as string;

  if (!paymentIntentId) {
    return {
      status: "failed",
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return {
        status: "paid",
        paymentData: {
          paymentIntentId: paymentIntent.id,
        },
      };
    }

    if (
      paymentIntent.status === "requires_payment_method" ||
      paymentIntent.status === "canceled"
    ) {
      return {
        status: "failed",
        paymentData: {
          paymentIntentId: paymentIntent.id,
        },
      };
    }

    // Payment is still processing
    return {
      status: "pending",
      paymentData: {
        paymentIntentId: paymentIntent.id,
      },
    };
  } catch (error) {
    logger.error("Stripe payment status verification failed", {
      metadata: {
        orderId,
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["payment", "stripe", "error"],
    });

    return {
      status: "failed",
    };
  }
}
```

**Stripe PaymentIntent Status Values:**

| Status | Meaning | Verification Result |
|--------|---------|---------------------|
| `succeeded` | Payment completed successfully | `paid` |
| `requires_payment_method` | Payment method required (failed) | `failed` |
| `requires_confirmation` | Payment needs confirmation | `pending` |
| `requires_action` | Additional action required (3D Secure, etc.) | `pending` |
| `processing` | Payment is being processed | `pending` |
| `requires_capture` | Payment authorized, needs capture | `pending` |
| `canceled` | Payment was canceled | `failed` |

**Usage in Confirmation Pages:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx`

**Process:**

1. Extract `payment_intent` and `payment_intent_client_secret` from query params
2. Verify `redirect_status === "succeeded"`
3. Call Stripe API with client secret:

```typescript
const paymentIntent = await stripe.paymentIntents.retrieve(
  searchParams.payment_intent,
  {
    client_secret: searchParams.payment_intent_client_secret,
  },
);

if (paymentIntent && paymentIntent.status === "succeeded") {
  // Mark order as paid
  await markOrderAsPaidAction({
    orderId: params.orderId,
    checkoutAttributes: JSON.stringify({
      payment_intent: searchParams.payment_intent,
      client_secret: searchParams.payment_intent_client_secret,
    }),
  });
}
```

**Error Handling:**

- **Missing paymentIntentId**: Return `failed` immediately
- **Stripe API error**: Log error with metadata, return `failed`
- **Invalid payment status**: Return `pending` (may resolve later)
- **Network timeout**: Log error, return `failed`

**Security Considerations:**

- PaymentIntent ID validated before API call
- Client secret used for additional verification
- Server-side verification only (never trust client)
- All errors logged with structured metadata

**Files Involved:**

- `src/lib/payment/plugins/stripe-plugin.ts` - Plugin verification method
- `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx` - Confirmation page
- `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx` - Payment confirmation (used for all orders including recharge)

**Testing Checklist:**

- [ ] PaymentIntent retrieval works correctly
- [ ] Status mapping (succeeded → paid) works
- [ ] Failed statuses (canceled, requires_payment_method) handled
- [ ] Pending statuses handled correctly
- [ ] Missing paymentIntentId handled
- [ ] Stripe API errors handled gracefully
- [ ] Error logging includes all metadata
- [ ] Client secret validation works

#### 6.3.2 LINE Pay Verification

**Overview:**

LINE Pay payment verification uses the LINE Pay Payment Details API to check transaction status. The API returns detailed transaction information including payment status, which is used to determine if payment was successful.

**Implementation:**

**Location:** `src/lib/payment/plugins/linepay-plugin.ts`

**Method:** `verifyPaymentStatus`

**Process:**

1. Extract `transactionId` from `paymentData`
2. Get LINE Pay client for store
3. Call LINE Pay API: `linePayClient.paymentDetails.send({ params: { transactionId: [transactionId] } })`
4. Check `returnCode === "0000"` (success)
5. Find transaction in `info` array
6. Check `payStatus`:
   - `"CAPTURE"` or `"PAYMENT"` → Return `paid`
   - `"VOIDED_AUTHORIZATION"` or `"EXPIRED_AUTHORIZATION"` → Return `failed`
   - `"AUTHORIZATION"` → Return `pending`

**Code Implementation:**

```typescript
async verifyPaymentStatus(
  orderId: string,
  paymentData: PaymentData,
  config: PluginConfig,
): Promise<PaymentStatus> {
  const transactionId = paymentData.transactionId as string;

  if (!transactionId) {
    return {
      status: "failed",
    };
  }

  const linePayClient = await this.getLinePayClientForStore(
    config.storeId,
    config,
  );

  if (!linePayClient) {
    return {
      status: "failed",
    };
  }

  try {
    // Check payment status via LINE Pay Payment Details API
    const paymentDetailsResult = await linePayClient.paymentDetails.send({
      params: {
        transactionId: [transactionId],
      },
    });

    if (paymentDetailsResult.body.returnCode === "0000") {
      // Find the transaction in the info array
      const transactionInfo = paymentDetailsResult.body.info?.find(
        (info) => info.transactionId === transactionId,
      );

      if (!transactionInfo) {
        return {
          status: "failed",
        };
      }

      // Check payment status from transaction info
      const payStatus = transactionInfo.payStatus;

      if (payStatus === "CAPTURE" || payStatus === "PAYMENT") {
        return {
          status: "paid",
          paymentData: {
            transactionId,
          },
        };
      }

      if (
        payStatus === "VOIDED_AUTHORIZATION" ||
        payStatus === "EXPIRED_AUTHORIZATION" ||
        payStatus === "CANCEL"
      ) {
        return {
          status: "failed",
          paymentData: {
            transactionId,
          },
        };
      }

      // Payment is still pending (AUTHORIZATION status needs capture)
      return {
        status: "pending",
        paymentData: {
          transactionId,
        },
      };
    }

    return {
      status: "failed",
    };
  } catch (error) {
    logger.error("LINE Pay payment status verification failed", {
      metadata: {
        orderId,
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["payment", "linepay", "error"],
    });

    return {
      status: "failed",
    };
  }
}
```

**LINE Pay Payment Status Values:**

| payStatus | Meaning | Verification Result |
|-----------|---------|---------------------|
| `CAPTURE` | Payment captured (completed) | `paid` |
| `PAYMENT` | Payment completed | `paid` |
| `AUTHORIZATION` | Authorized, needs capture | `pending` |
| `VOIDED_AUTHORIZATION` | Authorization voided | `failed` |
| `EXPIRED_AUTHORIZATION` | Authorization expired | `failed` |
| `CANCEL` | Payment canceled | `failed` |
| `EXPIRED` | Payment expired | `failed` |

**LINE Pay Return Codes:**

- `"0000"`: Success
- Other codes: Various error conditions (see LINE Pay documentation)

**Usage in Confirmation Pages:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx`

**Process:**

1. Extract `transactionId` from query params
2. Verify `transactionId` matches `order.checkoutAttributes`
3. Call LINE Pay Confirm API:

```typescript
const confirmResult = await linePayClient.confirm.send({
  transactionId: transactionId as string,
  body: {
    amount: Number(order.orderTotal),
    currency: order.currency as Currency,
  },
});

if (confirmResult.body.returnCode === "0000") {
  // Mark order as paid
  await markOrderAsPaidAction({
    orderId: order.id,
    checkoutAttributes: order.checkoutAttributes || "",
  });
}
```

**Error Handling:**

- **Missing transactionId**: Return `failed` immediately
- **LINE Pay client not configured**: Return `failed`
- **API returnCode !== "0000"**: Return `failed`
- **Transaction not found in info array**: Return `failed`
- **LINE Pay API error**: Log error with metadata, return `failed`

**Security Considerations:**

- Transaction ID validated before API call
- Transaction ID verified against order `checkoutAttributes`
- Server-side verification only
- Store-specific LINE Pay credentials used
- All errors logged with structured metadata

**Files Involved:**

- `src/lib/payment/plugins/linepay-plugin.ts` - Plugin verification method
- `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx` - Confirmation page
- `src/lib/linePay/line-pay-api/payment-details.ts` - Payment Details API types

**Testing Checklist:**

- [ ] Payment Details API call works correctly
- [ ] Return code "0000" handled correctly
- [ ] Status mapping (CAPTURE/PAYMENT → paid) works
- [ ] Failed statuses (VOIDED, EXPIRED, CANCEL) handled
- [ ] Pending status (AUTHORIZATION) handled correctly
- [ ] Missing transactionId handled
- [ ] Transaction not found in info array handled
- [ ] LINE Pay API errors handled gracefully
- [ ] Error logging includes all metadata
- [ ] Store-specific credentials used correctly

#### 6.3.3 Credit Verification

**Overview:**

Credit payment verification checks the order's payment status directly from the database. Since credit payments are processed immediately and atomically, the order's `isPaid` status is the source of truth.

**Implementation:**

**Location:** `src/lib/payment/plugins/credit-plugin.ts`

**Method:** `verifyPaymentStatus`

**Process:**

1. Query order from database
2. Check `order.isPaid`:
   - `true` → Return `paid`
   - `false` → Return `pending`

**Code Implementation:**

```typescript
async verifyPaymentStatus(
  orderId: string,
  paymentData: PaymentData,
  config: PluginConfig,
): Promise<PaymentStatus> {
  // Credit payments are confirmed immediately
  // If the order is marked as paid, payment is successful
  const order = await sqlClient.storeOrder.findUnique({
    where: { id: orderId },
    select: {
      isPaid: true,
      paymentStatus: true,
    },
  });

  if (!order) {
    return {
      status: "failed",
    };
  }

  if (order.isPaid) {
    return {
      status: "paid",
      paymentData: {
        orderId,
      },
    };
  }

  return {
    status: "pending",
    paymentData: {
      orderId,
    },
  };
}
```

**Credit Payment Processing:**

Credit payments are processed atomically during payment confirmation:

1. **Credit Deduction:**
   - Check customer credit balance
   - Calculate required credit amount
   - Deduct credit in database transaction
   - If deduction succeeds, payment is verified

2. **Order Update:**
   - Mark order as paid (`isPaid = true`)
   - Update payment status (`paymentStatus = Paid`)
   - Create StoreLedger entry

3. **Verification:**
   - Query order `isPaid` status
   - If `true`, payment is verified
   - If `false`, payment is pending or failed

**Credit Payment Flow:**

```typescript
// In processRsvpPrepaidPayment or order payment processing
await sqlClient.$transaction(async (tx) => {
  // 1. Deduct credit
  const newBalance = currentBalance - requiredCredit;
  await tx.customerCredit.upsert({
    where: { storeId_userId: { storeId, userId } },
    update: { point: new Prisma.Decimal(newBalance) },
    create: { storeId, userId, point: new Prisma.Decimal(newBalance) },
  });

  // 2. Create order (if needed)
  const order = await tx.storeOrder.create({
    data: {
      // ... order data
      isPaid: true, // Credit payment is immediate
      paymentStatus: PaymentStatus.Paid,
    },
  });

  // 3. Create ledger entries
  // ... ledger entries
});

// If transaction succeeds, payment is verified
// If transaction fails, payment is not processed
```

**Error Handling:**

- **Order not found**: Return `failed`
- **Credit deduction fails**: Transaction rolls back, order remains unpaid
- **Insufficient credit**: Payment fails before order creation

**Security Considerations:**

- Credit deduction is atomic (transaction)
- Order status is source of truth
- No external API calls needed
- Database transaction ensures consistency

**Files Involved:**

- `src/lib/payment/plugins/credit-plugin.ts` - Plugin verification method
- `src/actions/store/reservation/process-rsvp-prepaid-payment.ts` - RSVP credit payment
- `src/actions/store/credit/process-credit-topup-after-payment.ts` - Credit recharge processing

**Testing Checklist:**

- [ ] Order query works correctly
- [ ] isPaid status checked correctly
- [ ] Order not found handled
- [ ] Paid status returns `paid`
- [ ] Unpaid status returns `pending`
- [ ] Credit deduction atomicity verified
- [ ] Transaction rollback on failure works

#### 6.3.4 Cash/In-Person Verification

**Overview:**

Cash/in-person payment verification checks the order's payment status from the database. Since cash payments are confirmed manually by store staff, the order's `isPaid` status reflects the manual confirmation.

**Implementation:**

**Location:** `src/lib/payment/plugins/cash-plugin.ts`

**Method:** `verifyPaymentStatus`

**Process:**

1. Return `pending` status (delegates to caller)
2. Caller queries order `isPaid` status directly
3. If `isPaid = true`, payment is verified

**Code Implementation:**

```typescript
async verifyPaymentStatus(
  orderId: string,
  paymentData: PaymentData,
  config: PluginConfig,
): Promise<PaymentStatus> {
  // Cash payment status is determined by order.isPaid
  // If order is marked as paid, payment is successful
  // Status check is done by the caller querying the order
  return {
    status: "pending", // Will be updated by caller based on actual order status
    paymentData: {
      orderId,
    },
  };
}
```

**Cash Payment Processing:**

Cash payments are confirmed manually by store staff:

1. **Order Creation:**
   - Order created with `isPaid = false`
   - Payment status: `Pending`
   - Order status: `Pending`

2. **Manual Confirmation:**
   - Store staff confirms payment received
   - Calls `markOrderAsPaidAction` (store admin)
   - Order updated: `isPaid = true`, `paymentStatus = Paid`

3. **Verification:**
   - Query order `isPaid` status
   - If `true`, payment is verified
   - If `false`, payment is pending

**Cash Payment Confirmation Flow:**

```typescript
// Store admin marks cash order as paid
// Location: src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts

const result = await markOrderAsPaidAction(
  storeId,
  {
    orderId: params.orderId,
    checkoutAttributes: JSON.stringify({ paymentMethod: "cash" }),
  },
);

// markOrderAsPaidAction updates:
// - order.isPaid = true
// - order.paymentStatus = PaymentStatus.Paid
// - order.orderStatus = OrderStatus.Processing
// - Creates StoreLedger entry
```

**Verification by Caller:**

Since cash plugin returns `pending`, the caller should query the order directly:

```typescript
// In caller code
const order = await sqlClient.storeOrder.findUnique({
  where: { id: orderId },
  select: { isPaid: true, paymentStatus: true },
});

if (order?.isPaid) {
  // Payment verified
} else {
  // Payment pending
}
```

**Error Handling:**

- **Order not found**: Return `failed` or handle in caller
- **Manual confirmation fails**: Order remains unpaid
- **No external API**: No network errors

**Security Considerations:**

- Manual confirmation requires store admin access
- Order status is source of truth
- No external payment gateway
- Store admin action validates store membership

**Files Involved:**

- `src/lib/payment/plugins/cash-plugin.ts` - Plugin verification method
- `src/actions/storeAdmin/order/mark-order-as-paid.ts` - Store admin mark as paid
- `src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts` - API route

**Testing Checklist:**

- [ ] Plugin returns `pending` status
- [ ] Caller queries order correctly
- [ ] isPaid status checked correctly
- [ ] Manual confirmation works
- [ ] Store admin access validated
- [ ] Order update works correctly

**Common Verification Patterns:**

**1. Plugin-Based Verification:**

```typescript
// Get plugin for payment method
const plugin = getPluginFromOrder(order);

if (plugin) {
  const status = await plugin.verifyPaymentStatus(
    order.id,
    paymentData,
    config,
  );

  if (status.status === "paid") {
    // Payment verified
  }
}
```

**2. Direct Order Query (Cash/Credit):**

```typescript
// For cash/credit, query order directly
const order = await sqlClient.storeOrder.findUnique({
  where: { id: orderId },
  select: { isPaid: true, paymentStatus: true },
});

if (order?.isPaid) {
  // Payment verified
}
```

**3. Confirmation Page Verification:**

```typescript
// In confirmation pages (Stripe/LINE Pay)
// 1. Verify payment gateway status
// 2. If verified, mark order as paid
// 3. Redirect to success page

if (paymentGatewayStatus === "succeeded") {
  await markOrderAsPaidAction({ orderId, checkoutAttributes });
  redirect("/success");
}
```

**Error Handling Best Practices:**

1. **Network Errors:**
   - Log with structured metadata
   - Return `pending` (may resolve on retry)
   - Or return `failed` if critical

2. **API Errors:**
   - Log error code and message
   - Return appropriate status
   - Include error in response metadata

3. **Invalid Data:**
   - Validate payment data before API calls
   - Return `failed` immediately
   - Log validation errors

4. **Retry Logic:**
   - For `pending` status, allow retry
   - Implement exponential backoff
   - Set maximum retry attempts

**Files Involved:**

- `src/lib/payment/plugins/stripe-plugin.ts` - Stripe verification
- `src/lib/payment/plugins/linepay-plugin.ts` - LINE Pay verification
- `src/lib/payment/plugins/credit-plugin.ts` - Credit verification
- `src/lib/payment/plugins/cash-plugin.ts` - Cash verification
- `src/lib/payment/plugins/types.ts` - PaymentStatus interface
- `src/app/(root)/checkout/[orderId]/stripe/confirmed/page.tsx` - Stripe confirmation
- `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx` - LINE Pay confirmation

**Testing Checklist:**

- [ ] All payment methods verify correctly
- [ ] Status mapping works for all methods
- [ ] Error handling works for all methods
- [ ] Network errors handled gracefully
- [ ] Invalid data handled correctly
- [ ] Retry logic works (if implemented)
- [ ] Error logging includes all metadata
- [ ] Security validations work

---

## 7. Security Considerations

### 7.1 Payment Data Security

- **API Keys:** Payment gateway credentials stored as environment variables, never exposed to client
- **Payment Verification:** All payment confirmations verified server-side via payment gateway API
- **Idempotency:** Payment processing checks for existing ledger entries to prevent duplicate charges
  - Checks `order.isPaid` flag before processing
  - Checks for existing `StoreLedger` entry with same `orderId`
  - Database unique constraint on `StoreLedger.orderId` prevents duplicates
- **Transaction Safety:** All payment-related database operations use Prisma transactions

### 7.2 Payment Amount Validation

- All payment amounts validated server-side before processing
- **Order totals validated against cart totals:**
  - `createOrderAction` calculates total from `unitPrice * quantity` for each product
  - Validates provided `total` matches calculated total (0.01 tolerance for floating point)
  - Throws error if mismatch detected
- Credit amounts validated against store limits (min/max purchase)

### 7.3 Payment Retry Protection

- Payment retry uses same order ID to prevent duplicate charges
- Payment status checked before processing confirmation
- Idempotency checks prevent duplicate ledger entries

---

## 8. Performance Requirements

### 8.1 Payment Processing Performance

- **Payment Intent Creation:** < 2 seconds
- **Payment Confirmation:** < 5 seconds (including gateway API verification)
- **Credit Top-Up Processing:** < 2 seconds
- **Order Status Updates:** < 1 second

### 8.2 Database Optimization

- All foreign keys indexed
- Payment status queries use indexed fields
- Store ledger queries optimized with indexes on `storeId`, `type`, `createdAt`

### 8.3 Transaction Safety

- All payment-related operations use database transactions
- Credit deductions are atomic (all-or-nothing)
- Store ledger balance updates are atomic

---

## 9. Error Handling

### 9.1 Payment Gateway Errors

```typescript
try {
  const paymentIntent = await stripe.paymentIntents.retrieve(...);
  // Process payment
} catch (error) {
  logger.error("Stripe payment verification failed", {
    metadata: { orderId, error: error.message },
    tags: ["payment", "stripe", "error"],
  });
  // Return error to user
}
```

### 9.2 Payment Processing Errors

- Payment failures logged with full context (order ID, error details)
- Customer-facing error messages are user-friendly
- Payment failures do not create duplicate orders or charges
- Partial payment states prevented by transaction safety

### 9.3 Credit Processing Errors

- Insufficient credit balance errors returned before processing
- Credit deduction failures roll back entire transaction
- Credit ledger entry creation failures roll back credit deduction

---

## 10. Implementation Notes

### 10.1 Date/Time Handling

**CRITICAL:** All date/time values stored as BigInt epoch time (milliseconds since 1970-01-01 UTC).

- Use `getUtcNowEpoch()` for timestamps (returns BigInt)
- Convert Date objects to BigInt using `dateToEpoch()` before saving
- Convert BigInt to Date objects using `epochToDate()` when reading

### 10.2 JSON Serialization

**CRITICAL:** Always use `transformPrismaDataForJson()` before `JSON.stringify()` when serializing Prisma data.

Prisma returns `BigInt` for epoch time fields and `Decimal` for monetary fields. These types cannot be serialized directly.

### 10.3 Payment Method Plugin Implementation

**Status:** ✅ **IMPLEMENTED**

The payment system implements a true plugin-based architecture where payment methods are installable, configurable plugins.

**Implemented Components:**

1. **Plugin Interface** (`src/lib/payment/plugins/types.ts`):
   - `PaymentMethodPlugin` interface with required methods
   - Supporting types: `PaymentResult`, `PaymentConfirmation`, `PaymentStatus`, `FeeStructure`, `PluginConfig`, etc.

2. **Plugin Registry** (`src/lib/payment/plugins/registry.ts`):
   - Singleton registry for managing plugin instances
   - Methods: `register()`, `get()`, `has()`, `getAll()`, `getIdentifiers()`, `unregister()`, `clear()`

3. **Built-in Plugins**:
   - **Stripe Plugin** (`src/lib/payment/plugins/stripe-plugin.ts`): Stripe payment gateway integration
   - **LINE Pay Plugin** (`src/lib/payment/plugins/linepay-plugin.ts`): LINE Pay service integration
   - **Credit Plugin** (`src/lib/payment/plugins/credit-plugin.ts`): Customer credit balance payments
   - **Cash Plugin** (`src/lib/payment/plugins/cash-plugin.ts`): Cash/in-person payments

4. **Plugin Utilities** (`src/lib/payment/plugins/utils.ts`):
   - Functions to bridge database `PaymentMethod` records with plugin instances
   - Configuration building from platform/store settings
   - Plugin validation and availability checking

5. **Plugin Loader** (`src/lib/payment/plugins/loader.ts`):
   - Plugin registration, validation, and synchronization with database
   - Metadata extraction and plugin discovery

**Plugin Registration:**

Plugins are automatically registered when the module is loaded:

```typescript
// src/lib/payment/plugins/index.ts
import { registerPaymentPlugin } from "./registry";
import { StripePlugin } from "./stripe-plugin";
import { LinePayPlugin } from "./linepay-plugin";
import { CreditPlugin } from "./credit-plugin";
import { CashPlugin } from "./cash-plugin";

// Auto-register built-in plugins
registerPaymentPlugin(new StripePlugin());
registerPaymentPlugin(new LinePayPlugin());
registerPaymentPlugin(new CreditPlugin());
registerPaymentPlugin(new CashPlugin());
```

**Plugin Identifiers (payUrl values):**

- `"stripe"` - Stripe payment gateway
- `"linepay"` - LINE Pay service
- `"credit"` - Credit-based payment
- `"cash"` - Cash/in-person payment

**Usage:**

```typescript
import { getPaymentPlugin } from "@/lib/payment/plugins";

const plugin = getPaymentPlugin("stripe");
if (plugin) {
  const result = await plugin.processPayment(order, config);
}
```

**Future Enhancements:**

- Dynamic plugin loading from external packages
- Plugin marketplace/installation UI
- Plugin versioning and updates
- Plugin-specific configuration UI

---

## 11. Testing Requirements

### 11.1 Unit Tests

- Fee calculation logic
- Payment amount validation
- Credit balance checks
- Payment status verification

### 11.2 Integration Tests

- End-to-end payment flows (Stripe, LINE Pay, Credit, Cash)
- Payment confirmation workflows
- Credit top-up processing
- Store ledger entry creation

### 11.3 Error Scenario Tests

- Payment gateway failures
- Insufficient credit balance
- Invalid payment amounts
- Duplicate payment prevention

---

## Document End
