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
  orderNum          Int?            @default(autoincrement()) @unique
  orderTotal        Decimal         @default(0)
  currency          String          @default("twd")
  currencyRate      Decimal         @default(1)
  discount          Decimal         @default(0)
  paymentMethodId   String? // Optional payment method
  shippingMethodId  String
  pickupCode        String?
  isPaid            Boolean         @default(false)
  paidDate          BigInt? // Epoch milliseconds
  paymentStatus     Int             @default(10) // PaymentStatus enum (10 = Pending)
  orderStatus       Int             @default(10) // OrderStatus enum (10 = Pending)
  paymentCost       Decimal         @default(0) // Total fees (gateway fees + platform fees)
  refundAmount      Decimal         @default(0)
  returnStatus      Int             @default(0)
  shippingAddress   String          @default("")
  shippingCost      Decimal         @default(0)
  shippingStatus    Int             @default(10)
  taxRate           Decimal         @default(0)
  orderTax          Decimal         @default(0)
  checkoutAttributes String         @default("") // JSON string for plugin-specific data (e.g., rsvpId, payment intent IDs)
  checkoutRef       String          @default("") // Reference ID from payment gateway (e.g., transaction ID)
  createdAt         BigInt // Epoch milliseconds
  updatedAt         BigInt // Epoch milliseconds
  // Note: RSVP relationship is reverse - Rsvp.orderId references StoreOrder.id

  Store           Store           @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User            User?           @relation(fields: [userId], references: [id])
  PaymentMethod   PaymentMethod?  @relation(fields: [paymentMethodId], references: [id])
  ShippingMethod  ShippingMethod  @relation(fields: [shippingMethodId], references: [id])
  Rsvp            Rsvp[]          // Reverse relation: RSVPs linked via Rsvp.orderId
  OrderNotes      OrderNote[]
  OrderItems      OrderItem[]
  OrderItemView   OrderItemView[]
  StoreLedger     StoreLedger[]
  Shipment        Shipment[]

  @@index([storeId])
  @@index([userId])
  @@index([paymentMethodId])
  @@index([paymentStatus])
  @@index([orderStatus])
  @@index([isPaid])
  @@index([createdAt])
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
  orderId     String?
  amount      Decimal  // Positive for revenue, negative for fees/refunds
  fee         Decimal  @default(0) // Payment gateway fee (negative)
  platformFee Decimal  @default(0) // Platform fee (negative, Free stores only)
  currency    String
  type        Int      // StoreLedgerType enum
  balance     Decimal  // Running balance after this transaction
  description String?
  note        String?
  availability BigInt  // Epoch milliseconds - when funds become available
  createdAt   BigInt   // Epoch milliseconds

  Store Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Order StoreOrder? @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([storeId])
  @@index([orderId])
  @@index([type])
  @@index([createdAt])
  @@index([availability])
}
```

**Payment-Related Types:**

- `type = 0`: PlatformPayment (代收) - Platform payment processing
- `type = 1`: StorePaymentProvider - Store's own payment provider (if store uses own gateway)
- `type = 2`: CreditRecharge - Customer credit recharge (unearned revenue - liability)
- `type = 3`: CreditUsage - Credit usage (revenue recognition)
- Other types as defined in `StoreLedgerType` enum

**Fee Fields:**

- `fee`: Payment gateway fee (negative amount)
- `platformFee`: Platform fee (negative amount, Free stores only)
- `amount`: Order amount (positive) or refund amount (negative)

### 3.2 Database Constraints

- **Unique Constraints:**
  - `PaymentMethod.name` - Unique payment method names
  - `StorePaymentMethodMapping.storeId + methodId` - One mapping per store per payment method
  - `StoreOrder.orderNum` - Unique order numbers (auto-incrementing integer)

- **Indexes:**
  - All foreign keys indexed for query performance
  - `PaymentMethod.payUrl` indexed for plugin lookup
  - `StoreOrder.paymentStatus` and `orderStatus` indexed for status queries
  - `StoreLedger.type` indexed for filtering by transaction type
  - `StoreLedger.availability` indexed for revenue recognition queries

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

#### 5.1.2 Credit Recharge Actions

**Location:** `src/actions/store/credit/`

- `create-recharge-order.ts` - Create credit recharge order
- `process-credit-topup-after-payment.ts` - Process credit top-up after payment confirmation

**Validation Files:** `[action-name].validation.ts`

**Create Recharge Order Action:**

```typescript
// create-recharge-order.ts
export const createRechargeOrderAction = userRequiredActionClient
  .metadata({ name: "createRechargeOrder" })
  .schema(createRechargeOrderSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, creditAmount, rsvpId } = parsedInput;
    
    // Validation: Check store credit system enabled
    // Validation: Check credit amount against min/max limits
    // Calculate dollar amount from credit amount
    // Create StoreOrder with checkoutAttributes containing rsvpId
    
    return { order: createdOrder };
  });
```

**Process Credit Top-Up After Payment:**

```typescript
// process-credit-topup-after-payment.ts
export const processCreditTopUpAfterPaymentAction = baseClient
  .metadata({ name: "processCreditTopUpAfterPayment" })
  .schema(processCreditTopUpAfterPaymentSchema)
  .action(async ({ parsedInput }) => {
    const { orderId } = parsedInput;
    
    // Check idempotency (existing ledger entry)
    // Calculate credit amount and bonuses
    // Update customer credit balance
    // Create CustomerCreditLedger entry
    // Mark order as paid
    // Create StoreLedger entry (type: CreditRecharge)
    // Process RSVP prepaid payment if rsvpId present
    
    return { success: true, ... };
  });
```

#### 5.1.3 RSVP Prepaid Payment Actions

**Location:** `src/actions/store/reservation/`

- `process-rsvp-prepaid-payment.ts` - Process RSVP prepaid payment using customer credit

**Shared Function:**

```typescript
// process-rsvp-prepaid-payment.ts
export async function processRsvpPrepaidPayment(
  params: ProcessRsvpPrepaidPaymentParams
): Promise<ProcessRsvpPrepaidPaymentResult> {
  // Check customer credit balance
  // Calculate required credit amount
  // Create StoreOrder with credit payment method
  // Deduct credit from customer balance (transaction)
  // Create CustomerCreditLedger entry
  // Create StoreLedger entry
  // Return result with orderId and status
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

