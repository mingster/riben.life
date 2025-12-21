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
    const { storeId, creditAmount, rsvpId } = parsedInput;
    
    // Validation: Check store credit system enabled
    // Validation: Check credit amount against min/max limits
    // Calculate dollar amount from credit amount using creditExchangeRate
    // Find Stripe payment method by payUrl
    // Create StoreOrder with:
    //   - paymentMethodId: Stripe payment method ID
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
- Calculates dollar amount: `dollarAmount = creditAmount * creditExchangeRate`
- Finds Stripe payment method by `payUrl = "stripe"`
- Stores `rsvpId` in `checkoutAttributes` JSON for later processing
- Creates order with `paymentStatus = Pending`, `orderStatus = Pending`

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

**Location:** `src/actions/sysAdmin/paymentMethod/`

- `create-payment-method.ts` - Create payment method (System Admin)
- `update-payment-method.ts` - Update payment method (System Admin)
- `delete-payment-method.ts` - Delete payment method (System Admin)

**Location:** `src/actions/storeAdmin/settings/`

- `update-store-payment-methods.ts` - Enable/disable payment methods for store

### 5.2 API Routes

#### 5.2.1 Payment Confirmation Routes

**Stripe Confirmation:**

**Location:** `src/app/(root)/checkout/[orderId]/stripe/confirmed/route.ts`

- Verifies Stripe PaymentIntent status
- Calls `processCreditTopUpAfterPaymentAction` for credit recharges
- Redirects to success page

**Credit Recharge Stripe Confirmation:**

**Location:** `src/app/s/[storeId]/recharge/[orderId]/stripe/confirmed/page.tsx`

- Verifies Stripe PaymentIntent status
- Calls `processCreditTopUpAfterPaymentAction`
- Redirects to success page

**LINE Pay Confirmation:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/confirmed/page.tsx`

- Verifies LINE Pay transaction status
- Calls `mark-order-as-paid` action
- Redirects to success page

#### 5.2.2 Payment Processing Routes

**Stripe Payment Intent:**

**Location:** `src/app/api/payment/stripe/create-payment-intent/route.ts`

- Creates Stripe PaymentIntent
- Returns payment intent to client

**LINE Pay Request:**

**Location:** `src/app/(root)/checkout/[orderId]/linePay/page.tsx`

- Creates LINE Pay payment request
- Redirects to LINE Pay payment page

#### 5.2.3 Store Admin Payment Routes

**Location:** `src/app/api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]/route.ts`

- Mark cash order as paid (store admin)
- Calls `mark-order-as-paid` action

---

## 6. Payment Processing Implementation

### 6.1 Payment Flow

#### 6.1.1 Stripe Payment Flow

1. **Order Creation:**
   - Create `StoreOrder` with `paymentStatus = Pending`
   - Store order ID for payment intent

2. **Payment Intent Creation:**
   - Call Stripe API to create PaymentIntent
   - Store payment intent ID in `checkoutAttributes` or `checkoutRef`

3. **Payment Processing:**
   - Client redirects to Stripe payment page
   - Customer completes payment on Stripe

4. **Payment Confirmation:**
   - Stripe redirects to confirmation page with `payment_intent` parameter
   - Server verifies PaymentIntent status via Stripe API
   - If `status === "succeeded"`, process payment completion

5. **Order Completion:**
   - Update order: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Confirmed`
   - Create `StoreLedger` entry
   - Calculate and record fees

#### 6.1.2 LINE Pay Payment Flow

1. **Order Creation:**
   - Create `StoreOrder` with `paymentStatus = Pending`

2. **Payment Request:**
   - Call LINE Pay API to create payment request
   - Store transaction ID in `checkoutAttributes`
   - Store payment access token in `checkoutRef`

3. **Payment Processing:**
   - Redirect customer to LINE Pay payment page
   - Customer completes payment on LINE Pay

4. **Payment Confirmation:**
   - LINE Pay redirects to confirmation page
   - Server verifies transaction status via LINE Pay API
   - If confirmed, process payment completion

5. **Order Completion:**
   - Update order: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Confirmed`
   - Create `StoreLedger` entry
   - Calculate and record fees

#### 6.1.3 Credit-Based Payment Flow

1. **Availability Check:**
   - Verify customer is signed in
   - Verify store has credit system enabled
   - Verify customer has sufficient credit balance

2. **Payment Processing:**
   - Deduct credit from customer balance (atomic transaction)
   - Create `CustomerCreditLedger` entry (type: SPEND)
   - Create `StoreOrder` with credit payment method
   - Mark order as paid immediately

3. **Order Completion:**
   - Order already marked as paid
   - Create `StoreLedger` entry
   - Credit payments have zero fees

#### 6.1.4 Cash/In-Person Payment Flow

1. **Order Creation:**
   - Create `StoreOrder` with cash payment method
   - `paymentStatus = Pending` (or `Paid` if immediate confirmation mode)

2. **Payment Confirmation:**
   - **Option 1 (Immediate):** Order marked as paid immediately upon creation
   - **Option 2 (Manual):** Store staff marks order as paid via admin interface

3. **Order Completion:**
   - Update order: `isPaid = true`, `paymentStatus = Paid`, `paidDate = current timestamp`
   - Create `StoreLedger` entry with zero fees

### 6.2 Fee Calculation

#### 6.2.1 Payment Gateway Fees

```typescript
// Fee calculation logic
const gatewayFee = -(orderTotal * paymentMethod.fee + paymentMethod.feeAdditional);
const feeTax = gatewayFee * 0.05; // 5% tax on fees
const totalGatewayFees = gatewayFee + feeTax;
```

**Conditions:**

- Fees only apply if using platform gateway (`usePlatform = true`)
- Cash payments: `gatewayFee = 0`, `feeTax = 0`
- Credit payments: `gatewayFee = 0`, `feeTax = 0`

#### 6.2.2 Platform Fees

```typescript
// Platform fee calculation
const platformFee = isPro ? 0 : -(orderTotal * 0.01); // 1% for Free stores
```

**Conditions:**

- Only applies to Free-level stores
- Pro-level stores: `platformFee = 0`
- Cash payments: `platformFee = 0` (even for Free stores)

#### 6.2.3 Store Ledger Entry

```typescript
// StoreLedger entry creation
const balance = Number(lastLedger?.balance || 0);
const newBalance = balance + Number(orderTotal) + totalGatewayFees + platformFee;

await sqlClient.storeLedger.create({
  data: {
    storeId: order.storeId,
    orderId: order.id,
    amount: order.orderTotal, // Positive for revenue
    fee: totalGatewayFees, // Negative for fees
    platformFee: platformFee, // Negative for platform fee
    currency: order.currency,
    type: StoreLedgerType.Order, // Or CreditRecharge for credit top-ups
    balance: new Prisma.Decimal(newBalance),
    availability: BigInt(availabilityDate.getTime()), // Based on clearDays
    // ... other fields
  },
});
```

### 6.3 Payment Status Verification

#### 6.3.1 Stripe Verification

```typescript
import { stripe } from "@/lib/stripe/config";

const paymentIntent = await stripe.paymentIntents.retrieve(
  paymentIntentId,
  { client_secret: clientSecret }
);

if (paymentIntent.status === "succeeded") {
  // Process payment completion
}
```

#### 6.3.2 LINE Pay Verification

```typescript
import { linePayClient } from "@/lib/linePay/config";

const confirmResult = await linePayClient.confirm.send({
  transactionId: transactionId,
  body: {
    amount: orderTotal,
    currency: currency,
  },
});

if (confirmResult.body.returnCode === "0000") {
  // Process payment completion
}
```

#### 6.3.3 Credit Verification

Credit payments are verified immediately during deduction:

```typescript
// Credit deduction is atomic - if successful, payment is verified
const newBalance = currentBalance - requiredCredit;

await tx.customerCredit.upsert({
  where: { storeId_userId: { storeId, userId } },
  update: { balance: newBalance },
  create: { storeId, userId, balance: newBalance },
});

// If no error, payment is verified
```

---

## 7. Security Considerations

### 7.1 Payment Data Security

- **API Keys:** Payment gateway credentials stored as environment variables, never exposed to client
- **Payment Verification:** All payment confirmations verified server-side via payment gateway API
- **Idempotency:** Payment processing checks for existing ledger entries to prevent duplicate charges
- **Transaction Safety:** All payment-related database operations use Prisma transactions

### 7.2 Payment Amount Validation

- All payment amounts validated server-side before processing
- Order totals validated against cart totals
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

### 10.3 Payment Method Plugin Implementation (Future)

Current implementation uses hardcoded payment method logic based on `payUrl` field. Future enhancement will implement true plugin architecture:

- Plugin registry system
- Dynamic plugin loading
- Plugin configuration management
- Plugin interface implementation

Current `payUrl` values:
- `"stripe"` - Stripe payment gateway
- `"linepay"` - LINE Pay service
- `"credit"` - Credit-based payment
- `"cash"` - Cash/in-person payment

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

**Document End**

