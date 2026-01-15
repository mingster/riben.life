# Technical Requirements: RSVP System

**Date:** 2025-01-27\
**Status:** Active\
**Version:** 2.5\
**Related Documents:**

* [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)
* [PRD-restaurant-reservation.md](./PRD-restaurant-reservation.md)

***

## 1. Overview

This document specifies the technical architecture, implementation patterns, and technical constraints for the RSVP (Reservation/Appointment) system. It complements the Functional Requirements document by providing technical implementation details.

***

## 2. Architecture

### 2.1 Technology Stack

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (via Prisma ORM)
* **Authentication:** Better Auth
* **Validation:** Zod v4
* **State Management:** React Server Components (default), Client Components with local state
* **Data Fetching:** SWR (client-side), Server Components (server-side)
* **UI Framework:** React 19, Tailwind CSS v4, shadcn/ui, Radix UI
* **Icons:** @tabler/icons-react
* **Package Manager:** Bun

### 2.2 Application Architecture

#### 2.2.1 Server Actions Pattern

All data mutations use Next.js Server Actions with `next-safe-action` wrapper:

```typescript
// Pattern: actions/storeAdmin/rsvp/[action-name].ts
export const [actionName]Action = [actionClient]
  .metadata({ name: "[actionName]" })
  .schema([validationSchema])
  .action(async ({ parsedInput, ctx }) => {
    // Implementation
  });
```

**Action Client Types:**

* `storeActionClient` - For store admin actions (requires store membership in the organization)
* `userRequiredActionClient` - For authenticated user actions
* `adminActionClient` - For system admin actions
* `baseClient` - For public/unauthenticated actions

#### 2.2.2 Component Architecture

* **Server Components (default):** Data fetching, initial rendering
* **Client Components:** Interactive UI, forms, state management
* **Pattern:** Server page → Client component → Server actions

#### 2.2.3 Data Flow

1. Server Components fetch initial data
2. Client Components manage local state and handle interactions
3. Server Actions process mutations
4. Client Components update local state after successful mutations
5. Anonymous users: Local storage for reservation history

***

## 3. Database Schema

### 3.1 Core Models

#### 3.1.1 RsvpSettings

```prisma
model RsvpSettings {
  id              String   @id @default(uuid())
  storeId         String   @unique
  acceptReservation Boolean  @default(true) // turn on/off the reservation system
  singleServiceMode Boolean  @default(false) // for personal shop: only ONE reservation per time slot
  minPrepaidPercentage Int   @default(0) //最低預付百分比；0表示不需預付，100表示全額預付
  canCancel         Boolean  @default(true) //可取消預約
  cancelHours       Int      @default(24) //取消預約時間：小時前可取消
  canReserveBefore  Int      @default(2) //從現在起，可預約幾小時後的時間。 e.g. 現在7PM，只能預約9PM後的時間。
  canReserveAfter   Int      @default(2190) //從現在起，最多可預約未來幾小時。 e.g. ㄧ年後=8760小時; 一個月後=730. 預設值：3個月後。
  defaultDuration   Int      @default(60) //預約時間：60分鐘
  requireSignature   Boolean  @default(false) //需要簽名
  showCostToCustomer Boolean  @default(false) //顯示預約金額
  useBusinessHours   Boolean  @default(true)
  rsvpHours          String? //營業時間：M-F 09:00-18:00
  reminderHours      Int      @default(24) //預約提醒時間：??小時前發送確認通知
  useReminderSMS     Boolean  @default(false) //使用簡訊通知
  useReminderLine    Boolean  @default(false) //使用Line通知
  useReminderEmail   Boolean  @default(false) //使用email通知
  syncWithGoogle     Boolean  @default(false) //同步Google月曆
  syncWithApple      Boolean  @default(false) //同步Apple日曆
  
  // Reserve with Google integration fields
  reserveWithGoogleEnabled     Boolean  @default(false)
  googleBusinessProfileId      String?  // Google Business Profile ID
  googleBusinessProfileName    String?  // Store name in Google Business Profile
  reserveWithGoogleAccessToken String?  // Encrypted OAuth access token
  reserveWithGoogleRefreshToken String? // Encrypted OAuth refresh token
  reserveWithGoogleTokenExpiry BigInt?  // Token expiry timestamp (epoch milliseconds)
  reserveWithGoogleLastSync    BigInt?  // Last successful sync timestamp (epoch milliseconds)
  reserveWithGoogleSyncStatus  String?  // "connected", "error", "disconnected"
  reserveWithGoogleError       String?  // Last error message
  
  createdAt          BigInt  // Epoch milliseconds, not DateTime
  updatedAt          BigInt  // Epoch milliseconds, not DateTime
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
}
```

#### 3.1.2 Rsvp

```prisma
model Rsvp {
  id                String    @id @default(uuid())
  storeId           String
  customerId        String?
  orderId           String?
  facilityId        String?
  numOfAdult        Int       @default(1)
  numOfChild        Int       @default(0)
  rsvpTime          BigInt    // Epoch milliseconds, not DateTime
  arriveTime        BigInt?   // Epoch milliseconds, not DateTime. Can be set during creation or when status changes to Ready
  status            Int       @default(0) // RsvpStatus enum: 0=Pending, 10=ReadyToConfirm, 40=Ready, 50=Completed, 60=Cancelled, 70=NoShow
  alreadyPaid       Boolean   @default(false) //已付款
  referenceId       String?   // reference to the StoreOrder id or CustomerCreditLedger id
  paidAt            BigInt?   // Epoch milliseconds. The time when the reservation was paid
  message           String?
  name              String?   // Name (required for anonymous reservations)
  phone             String?   // Phone number (required for anonymous reservations)
  confirmedByStore  Boolean   @default(false) //店家已確認預約
  confirmedByCustomer Boolean @default(false) //客戶已確認預約
  facilityCost      Decimal?  // The cost that was charged
  facilityCredit    Decimal?  // The credit that was charged
  pricingRuleId     String?   // Reference to the pricing rule used

  serviceStaffId     String?   //optional: if the service staff is selected
  serviceStaffCost   Decimal?  //optional: if the service staff is selected, the cost that was charged
  serviceStaffCredit Decimal?  //optional: if the service staff is selected, the credit that was charged

  createdAt         BigInt    // Epoch milliseconds, not DateTime
  updatedAt         BigInt    // Epoch milliseconds, not DateTime
  createdBy         String?   // userId who created this reservation
  
  Store               Store                @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Customer            User?                @relation(fields: [customerId], references: [id], onDelete: Cascade)
  CreatedBy           User?                @relation("RsvpCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  Order               StoreOrder?          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  Facility            StoreFacility?       @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  ServiceStaff        ServiceStaff?        @relation(fields: [serviceStaffId], references: [id], onDelete: SetNull)
  FacilityPricingRule FacilityPricingRule? @relation(fields: [pricingRuleId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([customerId])
  @@index([createdBy])
  @@index([orderId])
  @@index([facilityId])
  @@index([serviceStaffId])
  @@index([pricingRuleId])
  @@index([rsvpTime])
  @@index([arriveTime])
  @@index([createdAt])
  @@index([updatedAt])
  // Composite indexes for common query patterns
  @@index([storeId, rsvpTime, status]) // For date range queries with status
}
```

#### 3.1.3 StoreFacility

```prisma
model StoreFacility {
  id              String  @id @default(uuid())
  storeId         String
  facilityName    String
  capacity        Int     @default(4) //how many people can use the facility at the same time
  defaultCost     Decimal @default(0) // default cost for using the facility
  defaultCredit   Decimal @default(0) // default credit for using the facility
  defaultDuration Int     @default(60) // default duration for using the facility in minutes
  businessHours   String? //when the facility is available for use
  
  description String? // description of the facility
  location    String? // location of the facility
  travelInfo  String? // travel information of the facility
  
  Store                Store                 @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Rsvp                 Rsvp[]
  FacilityPricingRules FacilityPricingRule[]
  
  @@unique([storeId, facilityName])
  @@index([storeId])
  @@index([facilityName])
}
```

#### 3.1.4 ServiceStaff

```prisma
model ServiceStaff {
  id      String @id @default(uuid())
  storeId String
  userId  String

  capacity        Int     @default(4) //how many people can use the service staff at the same time
  defaultCost     Decimal @default(0) // default cost for using the service staff
  defaultCredit   Decimal @default(0) // default credit for using the service staff
  defaultDuration Int     @default(60) // default duration for using the service staff in minutes
  businessHours   String? //when the service staff is available for use
  isDeleted       Boolean @default(false) // if the service staff is deleted
  description     String? // description of the service staff

  Store Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  Rsvp  Rsvp[]

  @@unique([storeId, userId])
  @@index([storeId])
  @@index([userId])
}
```

#### 3.1.5 CustomerCredit

```prisma
model CustomerCredit {
  id        String   @id @default(uuid())
  storeId   String
  userId    String
  balance   Decimal  @default(0)
  updatedAt BigInt   // Epoch milliseconds, not DateTime
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, userId])
  @@index([storeId])
  @@index([userId])
}
```

#### 3.1.6 RsvpBlacklist

```prisma
model RsvpBlacklist {
  id        String   @id @default(uuid())
  storeId   String
  userId    String
  reason    String?
  createdAt BigInt  // Epoch milliseconds, not DateTime
  updatedAt BigInt   // Epoch milliseconds, not DateTime
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([userId])
}
```

#### 3.1.7 RsvpTag

```prisma
model RsvpTag {
  id        String   @id @default(uuid())
  storeId   String
  name      String
  createdAt BigInt  // Epoch milliseconds, not DateTime
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, name])
  @@index([storeId])
}
```

### 3.2 Database Constraints

* **Unique Constraints:**
  * `RsvpSettings.storeId` - One settings record per store
  * `StoreFacility.storeId + facilityName` - Unique facility names per store
  * `ServiceStaff.storeId + userId` - One service staff record per user per store
  * `CustomerCredit.storeId + userId` - One credit record per customer per store
  * `RsvpTag.storeId + tagName` - Unique tag names per store

* **Indexes:**
  * All foreign keys indexed for query performance
  * `Rsvp.rsvpTime`, `Rsvp.arriveTime`, `Rsvp.createdAt`, `Rsvp.updatedAt` indexed for date range queries
  * Composite index `[storeId, rsvpTime, status]` for common query patterns
  * `StoreFacility.facilityName` indexed for search
  * `ServiceStaff.storeId` and `ServiceStaff.userId` indexed for lookups

* **Cascade Deletes:**
  * All related records cascade delete when store is deleted
  * User deletion cascades to reservations and credits
  * Service staff deletion uses soft delete (`isDeleted = true`) instead of hard delete
  * Service staff relation in Rsvp uses `onDelete: SetNull` to preserve reservation history

***

## 4. API Design

### 4.1 Server Actions

#### 4.1.1 Reservation Actions

**Store Admin Actions - Location:** `src/actions/storeAdmin/rsvp/`

* `create-rsvp.ts` - Create new reservation (store staff/admin)
* `create-rsvps.ts` - Create multiple recurring reservations
* `update-rsvp.ts` - Update existing reservation (store staff/admin)
* `delete-rsvp.ts` - Delete/cancel reservation
* `confirm-rsvp.ts` - Confirm reservation (store or customer)
* `mark-ready.ts` - Mark reservation as ready (customer arrived)
* `mark-completed.ts` - Mark reservation as completed
* `mark-no-show.ts` - Mark reservation as no-show

**Customer Actions - Location:** `src/actions/store/reservation/`

* `create-reservation.ts` - Create new reservation (customer/public)
* `update-reservation.ts` - Modify reservation (customer) - Implements FR-RSVP-013
* `cancel-reservation.ts` - Cancel reservation (customer) - Implements FR-RSVP-014
* `delete-reservation.ts` - Delete reservation (customer)
* `confirm-reservation.ts` - Confirm reservation (customer) - Implements FR-RSVP-015

**Validation Files:** `[action-name].validation.ts`

**Customer Reservation Creation (FR-RSVP-001, FR-RSVP-003, FR-RSVP-004):**

The `create-reservation.ts` action handles customer-facing reservation creation with the following technical requirements:

* **Authentication:**
  * **Better Auth Anonymous Plugin:** Anonymous users are authenticated via Better Auth anonymous plugin, which creates guest user accounts with emails like `guest-{id}@riben.life`
  * **Session-Based:** Anonymous users have active sessions and user IDs (guest users), allowing them to create reservations, manage credit, and edit/delete reservations
  * **Automatic Session Creation:** Client-side code creates anonymous sessions using `authClient.signIn.anonymous()` when anonymous users create reservations
  * **Phone Number Lookup:** If a user with the provided phone number exists, the reservation is linked to that user instead of creating a new anonymous session
* **Validation:**
  * **Anonymous User Requirements:**
    * **Name is required:** Anonymous users must provide their name (validated with Zod schema)
    * **Phone number is required:** Anonymous users must provide their phone number (validated with Zod schema)
    * Both fields are validated using `.refine()` in the Zod schema to ensure non-empty strings after trimming
    * Validation errors are displayed per field with i18n error messages
  * Reservation time window (`canReserveBefore`, `canReserveAfter`)
  * Business hours validation (priority: `RsvpSettings.rsvpHours` > `StoreSettings.businessHours`)
  * Facility availability (respects `singleServiceMode`)
  * Facility business hours (if facility has its own hours)
* **Prepaid Payment Flow:**
  * **If prepaid NOT required (`minPrepaidPercentage = 0`):**
    * Creates RSVP with `status = ReadyToConfirm`
    * No order is created
    * Returns RSVP data to frontend
  * **If prepaid required (`minPrepaidPercentage > 0`):**
    * Creates unpaid `StoreOrder` with prepaid amount
    * **Currency Handling:** Order currency is set to store's `defaultCurrency` using `store.defaultCurrency` field
    * Payment method selection:
      * If `store.useCustomerCredit = true`: Order created with "creditPoint" payment method (uses `CustomerCredit.point` with `creditExchangeRate`)
      * If `store.useCustomerCredit = false`: Order created with "TBD" payment method
      * **Note**: `CustomerCredit.fiat` (customer's account balance) is always available regardless of `useCustomerCredit` setting
    * **Payment Method Updates:** When marking orders as paid (via `markOrderAsPaidCore`), the system explicitly uses the provided `paymentMethodId` parameter to ensure correct payment method tracking. Payment methods are fetched by `payUrl` identifier and passed to payment processing functions.
    * Shipping method: "digital" (for reservation orders)
    * Order status: `Pending` (unpaid)
    * RSVP created with `status = Pending`, `alreadyPaid = false`
    * RSVP `orderId` linked to created order
    * Returns `orderId` to frontend for checkout redirect
    * **Store Membership:** Customer is automatically added as store member (user role) via `ensureCustomerIsStoreMember()` utility when creating order
* **Checkout Integration:**
  * Frontend redirects to `/checkout/[orderId]` when `orderId` is returned
  * Customer selects payment method at checkout page
  * Payment processing handled by checkout flow (credit, Stripe, LINE Pay, etc.)
  * After payment completion, `processRsvpAfterPaymentAction` is called to process the payment
  * Reservation `alreadyPaid` and `status` are updated based on payment processing
  * Frontend redirects to `/order/[OrderId]`. Customer can review the result of the payment and its order details.
* **HOLD Design Payment Processing:**
  * **Location:** `src/actions/store/reservation/process-rsvp-after-payment.ts`
  * **Purpose:** Processes RSVP payment after order is marked as paid. Uses HOLD design - no StoreLedger entry is created at payment time. Revenue is recognized when RSVP is completed.
  * **Payment Methods and Ledger Entries:**
    * **Credit Points Payment (`payUrl = "creditPoint"`):**
      * Deducts `CustomerCredit.point` balance
      * Creates `CustomerCreditLedger` entry with type `HOLD` (negative amount)
      * No StoreLedger entry created (revenue recognized on completion)
    * **Fiat Balance Payment (`payUrl = "credit"`):**
      * Deducts `CustomerCredit.fiat` balance
      * Creates `CustomerFiatLedger` entry with type `"HOLD"` (string, negative amount)
      * No StoreLedger entry created (revenue recognized on completion)
    * **External Payment (Stripe, LINE Pay, etc.):**
      * Step 1: Credits `CustomerCredit.fiat` balance
      * Step 2: Creates `CustomerFiatLedger` entry with type `"TOPUP"` (string, positive amount)
      * Step 3: Deducts `CustomerCredit.fiat` balance
      * Step 4: Creates `CustomerFiatLedger` entry with type `"HOLD"` (string, negative amount, using `CustomerCreditLedgerType.Hold` enum value)
      * No StoreLedger entry created (revenue recognized on completion)
      * **Payment Method Identifiers:** External payment methods use lowercase identifiers: `"stripe"` for Stripe, `"linepay"` for LINE Pay (not `"linePay"`), `"payPal"` for PayPal, etc.
  * **Status Updates:**
    * If `noNeedToConfirm = true`: Status changes to `Ready (40)`, `confirmedByStore = true`
    * If `noNeedToConfirm = false`: Status changes to `ReadyToConfirm (10)`
    * `alreadyPaid = true`, `paidAt` timestamp set
  * **Note:** Prepaid payment processing should happen during RSVP creation (via `processRsvpPrepaidPaymentUsingCredit`), not during update. The update action should not process prepaid payments.
  * **Account Linking (Anonymous → Registered User):**
    * When an anonymous user chooses to sign-in/up, Better Auth's anonymous plugin automatically calls the `onLinkAccount` callback
    * The callback receives `anonymousUser` (guest user) and `newUser` (newly registered/authenticated user) parameters
    * **Implementation Location:** `src/lib/auth.ts` - `anonymous` plugin configuration's `onLinkAccount` callback
    * **Data Migration Steps (within transaction):**
      1. **Reservations (Rsvp):** Update all reservations where `customerId = anonymousUser.id` to `customerId = newUser.id`
         * Also set `isAnonymous = false` for linked reservations
         * Preserves reservation history and ownership
      2. **Store Orders (StoreOrder):** Update all orders where `userId = anonymousUser.id` to `userId = newUser.id`
         * Ensures order history is transferred to the new account
      3. **Customer Credit (CustomerCredit):** Merge credit accounts
         * If anonymous user has credit account: transfer `point` and `fiat` balances to new user's account (create if doesn't exist, increment if exists)
         * Delete anonymous user's credit account after transfer
         * Uses `upsert` to handle cases where new user already has a credit account
      4. **Credit Ledgers (CustomerCreditLedger, CustomerFiatLedger):** Update all ledger entries where `userId = anonymousUser.id` to `userId = newUser.id`
         * Preserves transaction history and audit trail
         * Maintains referential integrity for historical records
      5. **Addresses (Address):** Update all addresses where `userId = anonymousUser.id` to `userId = newUser.id`
         * Transfers saved shipping/billing addresses
      6. **Store Memberships (Member):** Update all memberships where `userId = anonymousUser.id` to `userId = newUser.id`
         * Preserves store membership and role assignments
         * Ensures user retains access to stores they were members of as anonymous user
      7. **Sessions:** Better Auth automatically handles session migration (no manual update needed)
    * **Transaction Safety:** All updates must be performed within a database transaction to ensure atomicity
    * **Error Handling:** If any step fails, the entire transaction should roll back to prevent partial data migration
    * **Logging:** Log the account linking operation for audit purposes (anonymous user ID, new user ID, records migrated)
  * **Database Storage (Anonymous Users):**
    * Reservations are stored in the database and linked to guest user accounts via `customerId`
    * Anonymous users (guest users) have user IDs and can own reservations, credit accounts, and orders
    * **Reservation Ownership:** Reservations created by anonymous users are linked to their guest user ID via `customerId` field
    * **Name and Phone Storage:** Reservation `name` and `phone` fields store the user-provided information for anonymous reservations
    * **Session Persistence:** Anonymous user sessions persist across browser sessions via Better Auth session management
    * **Cross-Device Access:** Anonymous users can access their reservations from different devices if they use the same browser (session cookie-based)
* **Shared Utilities:**
  * `create-rsvp-store-order.ts` - Creates store order for RSVP prepaid
  * `validate-rsvp-availability.ts` - Validates time slot availability
  * `validate-facility-business-hours.ts` - Validates facility-specific hours

**RSVP Completion and Revenue Recognition:**

The `complete-rsvp.ts` action handles RSVP completion and revenue recognition with the following technical requirements:

* **Location:** `src/actions/storeAdmin/rsvp/complete-rsvp.ts`
* **Core Logic:** `src/actions/storeAdmin/rsvp/complete-rsvp-core.ts`
* **Purpose:** Completes an RSVP reservation and recognizes revenue. Only RSVPs in `Ready (40)` status can be completed.
* **Credit Processing (Three Cases):**
  * **Case 1: Prepaid RSVP with Credit Points (`alreadyPaid = true`, payment method = "creditPoint"):**
    * Converts HOLD to SPEND via `convertHoldToSpend()`
    * Updates existing `CustomerCreditLedger` entry from type `HOLD` to type `SPEND` (amount and balance unchanged)
    * Creates `StoreLedger` entry with type `StorePaymentProvider` (positive amount, revenue recognition)
    * Revenue is recognized at completion time
  * **Case 2: Prepaid RSVP with External Payment (`alreadyPaid = true`, payment method != "creditPoint"):**
    * Converts HOLD to SPEND via `convertFiatTopupToPayment()` (function name is legacy, but implementation converts HOLD to SPEND)
    * Updates existing `CustomerFiatLedger` entry from type `HOLD` to type `SPEND` (using `CustomerCreditLedgerType.Spend` enum value)
    * No need to deduct fiat since it's already held
    * Creates `StoreLedger` entry with type `StorePaymentProvider` (positive amount, revenue recognition)
    * Revenue is recognized at completion time
    * **Note:** External payment methods include Stripe (`payUrl = "stripe"`), LINE Pay (`payUrl = "linepay"`), and other external payment gateways
  * **Case 3: Non-Prepaid RSVP (`alreadyPaid = false`):**
    * Deducts credit for service usage via `deduceCustomerCredit()`
    * Creates `CustomerCreditLedger` entry with type `SPEND` (negative amount)
    * Creates `StoreLedger` entry with type `StorePaymentProvider` (positive amount, revenue recognition)
    * Revenue is recognized at completion time
* **Transaction Safety:** All credit processing happens BEFORE status update to ensure atomicity. If credit processing fails, status update is rolled back.
* **StoreLedger Type:** Revenue recognition uses `StoreLedgerType.StorePaymentProvider` (not `Revenue` - that enum value was removed)
* **Note:** Credit deduction should NOT happen in `update-rsvp.ts`. Only the dedicated `complete-rsvp` action should handle credit deduction and revenue recognition.

**Customer Reservation Modification (FR-RSVP-013):**

The `update-reservation.ts` action allows customers to modify their reservations with the following technical requirements:

* **Time Window:** Modification must occur within the allowed cancellation window (`cancelHours` from `RsvpSettings`)
* **Unpaid Reservation Redirect:** When editing an unpaid reservation (where `orderId` exists and `alreadyPaid = false`), the system automatically redirects the customer to the checkout page (`/checkout/[orderId]`) via client-side `useEffect` hook before allowing modifications.
* **Modifiable Fields:**
  * `rsvpTime` (date/time) - Subject to availability validation
  * `numOfAdult` - Party size (adults)
  * `numOfChild` - Party size (children)
  * `message` - Special requests/notes
* **Non-Modifiable Fields (Customers Cannot Change):**
  * `facilityId` - Cannot be changed by customers
  * `serviceStaffId` - Cannot be changed by customers
  * `facilityCost`, `facilityCredit` - Costs remain as set during creation
  * `serviceStaffCost`, `serviceStaffCredit` - Costs remain as set during creation
  * `pricingRuleId` - Cannot be changed by customers
* **Business Rules:**
  * When a reservation is modified, `confirmedByStore` must be set to `false` (requires re-confirmation by store)
  * Availability validation must check for conflicts with existing reservations
  * Facility availability must be verified for the new date/time
  * Store timezone must be considered when converting date/time inputs
* **Authentication:** Requires user authentication (logged-in users or anonymous users with guest sessions)
* **Authorization:**
  * Customers can only modify reservations where `customerId` matches their session user ID
  * Anonymous users (guest users) can modify reservations linked to their guest user ID
  * Authorization is verified by matching session `userId` to reservation `customerId`

#### 4.1.2 Settings Actions

**Location:** `src/actions/storeAdmin/settings/`

* `update-store-rsvp.ts` - Update RSVP settings
* `update-rsvp-prepaid.ts` - Update prepaid settings
* `update-rsvp-cancellation.ts` - Update cancellation policy
* `update-rsvp-reminders.ts` - Update reminder settings
* `update-rsvp-signature.ts` - Update signature requirements
* `update-rsvp-reserve-with-google.ts` - Update Reserve with Google integration
* `connect-reserve-with-google.ts` - Connect store's Google Business Profile to Reserve with Google
* `disconnect-reserve-with-google.ts` - Disconnect Reserve with Google integration
* `test-reserve-with-google-connection.ts` - Test Reserve with Google connection

#### 4.1.2a Google Integration Actions (Feed-based)

**Location:** `src/actions/storeAdmin/reserveWithGoogle/`

* `generate-google-feed.ts` - Generate appointment/service feed for Google Actions Center
* `submit-google-feed.ts` - Submit feed to Google (sandbox/production)
* `validate-google-feed.ts` - Validate feed before submission
* `track-google-conversion.ts` - Track and report conversions to Google

#### 4.1.3 Facility Management Actions

**Location:** `src/actions/storeAdmin/facilities/`

* `create-facility.ts` - Create new facility
* `create-facilities.ts` - Bulk create facilities
* `update-facility.ts` - Update facility
* `delete-facility.ts` - Delete facility

#### 4.1.3a Service Staff Management Actions

**Location:** `src/actions/storeAdmin/serviceStaff/`

* `create-service-staff.ts` - Create new service staff
* `update-service-staff.ts` - Update service staff
* `delete-service-staff.ts` - Delete service staff (soft delete)
* `get-service-staff.ts` - Get service staff list for store

#### 4.1.4 Blacklist Actions

**Location:** `src/actions/storeAdmin/rsvpBlacklist/`

* `add-to-blacklist.ts` - Add user to blacklist
* `remove-from-blacklist.ts` - Remove user from blacklist
* `get-blacklist.ts` - Get blacklist entries

#### 4.1.5 Tag Actions

**Location:** `src/actions/storeAdmin/rsvpTag/`

* `create-tag.ts` - Create new tag
* `update-tag.ts` - Update tag
* `delete-tag.ts` - Delete tag
* `assign-tag.ts` - Assign tag to reservation

### 4.2 API Routes

#### 4.2.1 Public API Routes

**Location:** `src/app/api/store/[storeId]/rsvp/`

* `POST /api/store/[storeId]/rsvp` - Create reservation (public)
* `GET /api/store/[storeId]/rsvp/availability` - Get availability
* `PATCH /api/store/[storeId]/rsvp/[rsvpId]` - Customer reservation modification (FR-RSVP-013)
* `POST /api/store/[storeId]/rsvp/[rsvpId]/confirm` - Customer confirmation (FR-RSVP-015)
* `POST /api/store/[storeId]/rsvp/[rsvpId]/cancel` - Customer cancellation (FR-RSVP-014)

**Customer Reservation Modification API (FR-RSVP-013):**

* **Endpoint:** `PATCH /api/store/[storeId]/rsvp/[rsvpId]` (via Server Action: `update-reservation.ts`)

* **Authentication:** Required (user must be authenticated)

* **Authorization:** Customer can only modify their own reservations (verified by `customerId` or email match)

* **Request Body:**

  ```typescript
  {
    id: string;
    facilityId: string;
    numOfAdult: number;
    numOfChild: number;
    rsvpTime: Date; // ISO date string or Date object
    message?: string | null; // Optional special requests/notes
  }
  ```

* **Business Rules:**
  * Modification must occur within `cancelHours` window (from `RsvpSettings.cancelHours`, validated before allowing modification)
  * When modified, `confirmedByStore` **must be set to `false`** (requires re-confirmation by store)
  * Date/time conversion must account for store timezone (`Store.defaultTimezone`)
  * Availability validation should check for conflicts with existing reservations (TODO in current implementation)
  * Facility must exist and belong to the store

* **Response:** Returns updated reservation object with all relations

**Customer Reservation Cancellation API (FR-RSVP-014):**

* **Endpoint:** `POST /api/store/[storeId]/rsvp/[rsvpId]/cancel` (via Server Action: `cancel-reservation.ts`)

* **Authentication:** Required (logged-in users or anonymous users with guest sessions)

* **Authorization:**
  * Customer can only cancel their own reservations (verified by `customerId` matching session `userId` or email match)
  * Anonymous users (guest users) can cancel reservations linked to their guest user ID
  * Authorization is verified by matching session `userId` to reservation `customerId`

* **Request Body:**

  ```typescript
  {
    id: string; // Reservation ID
  }
  ```

* **Business Rules:**
  * Customers can cancel without time restriction if `canCancel` is true in `RsvpSettings`
  * If `canCancel` is false in `RsvpSettings`, customers cannot self-cancel (store staff/admin must cancel)
  * **Refund Processing:** If reservation was prepaid (`alreadyPaid = true` and `orderId` exists), refund is processed only if cancellation occurs OUTSIDE the `cancelHours` window (i.e., cancelled more than `cancelHours` hours before the reservation time). If cancellation occurs WITHIN the `cancelHours` window (i.e., less than `cancelHours` hours before the reservation time), no refund is given.
    * **Credit Refund:** If payment method is "credit" and cancellation is outside the cancelHours window, credit is automatically refunded to customer
    * **Refund Process:**
      1. Checks if cancellation is within cancelHours window using `isCancellationWithinCancelHours()` helper
      2. If outside window, finds original HOLD ledger entry (by `orderId`) to determine refund amount
      3. Restores credit to customer balance (`CustomerCredit`)
      4. Creates `CustomerCreditLedger` entry (type: "REFUND", positive amount)
      5. **No `StoreLedger` entry is created** (since no revenue was recognized during hold phase)
      6. Updates `StoreOrder` status to `Refunded` (both `orderStatus` and `paymentStatus`)
    * **Refund Function:** `processRsvpCreditRefund()` - Shared utility function located in `src/actions/store/reservation/process-rsvp-refund.ts`
    * **Transaction Safety:** All refund operations are performed within a database transaction

* **Response:** Returns cancelled reservation object with all relations (including updated Order if refunded)

**Reservation History (Anonymous Users):**

* **Location:** `src/app/s/[storeId]/reservation/history/page.tsx`
* **Access:** Requires authentication (logged-in users or anonymous users with guest sessions)
* **Implementation:**
  * **All Users (Including Anonymous):**
    * Server component fetches reservations from database based on session `customerId` (guest user ID for anonymous users)
    * Uses Prisma query: `sqlClient.rsvp.findMany({ where: { storeId, customerId: sessionUserId } })`
    * For anonymous users, `sessionUserId` is the guest user ID created by Better Auth anonymous plugin
    * Data is transformed using `transformPrismaDataForJson()` before passing to client component
    * If no session exists, displays empty state (no reservations)
  * **No Local Storage:** Reservations are stored in the database and linked to guest user accounts, not local storage
  * **Session-Based Access:** Anonymous users access their reservations via their guest session (session cookie-based)
* **Client Component:** `CustomerReservationHistoryClient` handles both logged-in and anonymous user flows
* **Data Source:**
  * **All Users:** Server component fetches from database via Prisma based on session `userId`, passes to client as `serverData` prop
  * **Anonymous Users:** Same database query as logged-in users, filtered by guest user ID (`customerId`)
  * **Cross-Device:** Anonymous users can access reservations from different devices if session cookies are shared (same browser/device only)

#### 4.2.2 Store Admin API Routes

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/`

* `GET /api/storeAdmin/[storeId]/rsvp` - List reservations
* `GET /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Get reservation details
* `POST /api/storeAdmin/[storeId]/rsvp` - Create reservation (staff)
* `PATCH /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Update reservation
* `DELETE /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Delete reservation
* `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/confirm` - Store confirmation
* `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/ready` - Mark as ready (customer arrived)
* `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/completed` - Mark as completed
* `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/no-show` - Mark as no-show

#### 4.2.3 Reserve with Google Webhook

**Location:** `src/app/api/webhooks/reserve-with-google/`

* `POST /api/webhooks/reserve-with-google/reservations` - Receive Reserve with Google webhooks
* `POST /api/webhooks/reserve-with-google/availability` - Receive availability sync requests from Reserve with Google

#### 4.2.4 Reserve with Google OAuth Callback

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/reserve-with-google/`

* `GET /api/storeAdmin/[storeId]/rsvp/reserve-with-google/oauth/callback` - Handle OAuth callback from Google Business Profile
* `GET /api/storeAdmin/[storeId]/rsvp/reserve-with-google/oauth/connect` - Initiate OAuth connection flow

#### 4.2.5 External Availability Query API

**Location:** `src/app/api/store/[storeId]/rsvp/availability/`

* `GET /api/store/[storeId]/rsvp/availability/slots` - Query available reservation slots (external systems, other stores)

**External Availability Query API:**

* **Endpoint:** `GET /api/store/[storeId]/rsvp/availability/slots`

* **Purpose:** Allow external systems or other stores to query available reservation slots

* **Authentication Options:**
  * **API Key Authentication:** For external systems (via `X-API-Key` header)
  * **Store-to-Store Authentication:** For other stores (via `storeActionClient` with store membership)
  * **Public Access:** Limited availability information (if store allows public availability queries)

* **Query Parameters:**

  ```typescript
  {
    startDate: string;        // ISO 8601 date string (required)
    endDate: string;          // ISO 8601 date string (required)
    facilityId?: string;      // Optional: filter by specific facility
    duration?: number;         // Optional: required duration in minutes (default: facility defaultDuration)
    timezone?: string;         // Optional: timezone for response (default: store defaultTimezone)
  }
  ```

* **Response Format:**

  ```typescript
  {
    storeId: string;
    storeName: string;
    timezone: string;
    availableSlots: Array<{
      facilityId: string;
      facilityName: string;
      date: string;              // ISO 8601 date string
      time: string;              // HH:mm format in store timezone
      available: boolean;
      capacity?: number;          // Available capacity (if facility has capacity limits)
      cost?: number;              // Cost for this slot (if showCostToCustomer is enabled)
      credit?: number;            // Credit cost for this slot (if showCostToCustomer is enabled)
    }>;
    facilities: Array<{
      id: string;
      name: string;
      capacity: number;
      defaultDuration: number;
      defaultCost: number;
      defaultCredit: number;
    }>;
  }
  ```

* **Business Rules:**
  * Only returns slots within the query date range
  * Excludes slots that conflict with existing reservations
  * Respects facility capacity limits (if applicable)
  * Considers business hours (if `useBusinessHours` is enabled)
  * Respects RSVP settings (`acceptReservation` must be true)
  * **Reservation Time Window:** Only returns slots that fall within the allowed reservation window:
    * Slots must be at least `canReserveBefore` hours in the future (e.g., if `canReserveBefore = 2`, current time is 7PM, only slots at 9PM or later are available)
    * Slots must be no more than `canReserveAfter` hours in the future (e.g., if `canReserveAfter = 2190` (3 months), slots beyond 3 months are not available)
  * Time slots are returned in store timezone (or specified timezone)
  * Slot duration matches facility `defaultDuration` or specified `duration` parameter
  * Cost/credit information only included if `showCostToCustomer` is enabled in `RsvpSettings`

* **Rate Limiting:** Recommended rate limiting for external API access (e.g., 100 requests per minute per API key)

* **Error Responses:**
  * `400 Bad Request` - Invalid date range or parameters
  * `401 Unauthorized` - Invalid or missing API key
  * `403 Forbidden` - Store does not allow external availability queries
  * `404 Not Found` - Store not found
  * `429 Too Many Requests` - Rate limit exceeded

### 4.3 Response Format

All server actions return:

```typescript
{
  data?: T;           // Success data
  serverError?: string; // Error message
  validationErrors?: {  // Validation errors
    [field: string]: string[];
  };
}
```

***

## 5. Security Requirements

### 5.1 Authentication & Authorization

* **Store Admin Actions:** Must verify store membership via `storeActionClient` (requires `storeId` in schema and user must be a member of the store's organization)
* **Store Staff Actions:** Must verify store access and staff permissions
* **Customer Actions:** Must verify user authentication (logged-in users or anonymous users with guest sessions)
* **Anonymous Reservations (Better Auth Anonymous Plugin):**
  * **Authentication:** Anonymous users are authenticated via Better Auth anonymous plugin, which creates guest user accounts with emails like `guest-{id}@riben.life`
  * **Session-Based:** Anonymous users have active sessions and user IDs (guest users), allowing them to create reservations, manage credit, and edit/delete reservations
  * **Reservation Ownership:** Reservations are stored in the database and linked to guest user accounts via `customerId` field
  * **Credit Accounts:** Anonymous users can have credit accounts (`CustomerCredit`) linked to their guest user ID
  * **Authorization:** Anonymous users can edit, delete, and cancel reservations linked to their guest user ID (verified by matching session `userId` to reservation `customerId`)
  * **Name and Phone:** Name and phone number are required and validated for anonymous users, stored in reservation `name` and `phone` fields
  * **Session Persistence:** Anonymous user sessions persist across browser sessions via Better Auth session management (session cookie-based)

### 5.2 Data Validation

* **Input Validation:** All inputs validated with Zod schemas
* **Server-side Validation:** Duplicate validation in server actions
* **SQL Injection Prevention:** Prisma ORM with parameterized queries
* **XSS Prevention:** React's built-in escaping, sanitize user inputs

### 5.3 Access Control

* **Store Isolation:** All queries filtered by `storeId`
* **User Data Isolation:** Users can only access their own reservations
* **Staff Permissions:** Configurable permissions per store staff member
* **API Access:** All admin APIs require authentication and authorization

### 5.4 Sensitive Data

* **Signature Storage:** Base64 encoded, stored securely
* **API Credentials:** Encrypted in database, never exposed to client
* **OAuth Tokens:** Reserve with Google OAuth access tokens and refresh tokens encrypted in database
* **Payment Information:** Handled by payment providers (Stripe, LINE Pay)
* **Customer Credit:** Protected by authentication and store isolation
* **Webhook Secrets:** Store webhook verification secrets securely (environment variables)

***

## 6. Performance Requirements

### 6.1 Response Times

* **Reservation Creation:** < 500ms
* **Availability Check:** < 200ms
* **Reservation List (Store Admin):** < 1s for 100 reservations
* **Settings Update:** < 300ms

### 6.2 Database Optimization

* **Indexes:** All foreign keys and frequently queried fields indexed
* **Query Optimization:** Use `select` to limit returned fields
* **Pagination:** Implement pagination for large result sets
* **Caching:** Cache store settings and facility lists

### 6.3 Concurrent Operations

* **Reservation Conflicts:** Use database transactions for availability checks
* **Optimistic Locking:** Version fields for concurrent updates
* **Race Conditions:** Handle double-booking with transaction isolation

***

## 7. Integration Requirements

### 7.1 Reserve with Google / Google Actions Center Integration

The system must establish and maintain connections to Google's reservation services for multiple stores, enabling customers to make reservations directly through Google Search and Google Maps for each store's location.

**Integration Approaches:**

Google provides multiple integration methods for appointments/reservations:

1. **Reserve with Google API** - Direct API integration with OAuth, webhooks, and real-time sync
2. **Google Actions Center Appointments Redirect** - Feed-based integration using data feeds and conversion tracking

The system should support the most appropriate integration method based on Google's requirements and platform capabilities.

**Eligibility Requirements (per [Google Actions Center documentation](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/overview)):**

* Each store must have a physical location with an address that Google can match to Google Maps database
* Any `action_link` provided must point to merchant-specific pages where users perform actions (booking appointments)
* Store addresses must be verifiable in Google Maps

**Multi-Store Architecture:**

* This is a multi-tenant platform serving many stores
* Each store has its own location and Google Business Profile
* Platform-level OAuth credentials (CLIENT\_ID, CLIENT\_SECRET) are shared across all stores (for API-based integration)
* Store-specific Google Business Profile connections and tokens are stored per store in `RsvpSettings`
* Each store independently connects and manages its own Google integration
* Each store must meet eligibility requirements (physical location, Google Maps verifiable address)

#### 7.1.1 Onboarding and Launch Process

Based on [Google Actions Center integration requirements](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/overview), the system must support the following onboarding workflow:

1. **Setup**
   * Configure platform-level integration settings
   * Set up Partner Portal access
   * Configure merchant matching

2. **Sandbox Environment**
   * Feeds in Sandbox: Submit test data feeds for review
   * Conversion Tracking in Sandbox: Implement and test conversion tracking
   * Sandbox Review: Google reviews integration in sandbox

3. **Production Environment**
   * Feeds in Production: Submit production data feeds
   * Conversion Tracking in Production: Deploy production conversion tracking
   * Production Review: Google reviews production integration

4. **Launch**
   * Go live after successful production review
   * Monitor integration health post-launch

**Store Eligibility Verification:**

* Verify each store has a physical location with Google Maps-verifiable address before onboarding
* Match store addresses to Google Maps database
* Validate action links point to store-specific reservation pages

#### 7.1.2 Connection & Authentication (API-based Integration)

For Reserve with Google API integration:

* **OAuth 2.0 Flow:** Implement OAuth 2.0 authorization flow for Google Business Profile
* **Platform OAuth Application:** Single OAuth application registered with Google (using platform CLIENT\_ID/CLIENT\_SECRET) used by all stores
* **Per-Store Google Business Profile Connection:**
  * Each store connects its own Google Business Profile through the platform OAuth application
  * Store's Google Business Profile ID and connection details stored in `RsvpSettings`
  * Each store's OAuth tokens stored per store (encrypted in database)
* **Token Management:**
  * Store OAuth access tokens securely (encrypted in database) per store
  * Implement token refresh mechanism using refresh tokens per store
  * Handle token expiration and automatic renewal per store
  * Track token expiry timestamps per store
* **Connection Verification:** Implement connection test endpoint to verify API connectivity per store
* **Store Isolation:** Ensure each store's Google integration connection is isolated and independent

#### 7.1.3 Data Feeds (Feed-based Integration)

For Google Actions Center Appointments Redirect integration:

* **Feed Format:** Generate and submit appointment/service feeds in required format (XML/JSON)
* **Feed Structure:** Include entity, action, and services data per [Google Actions Center feed specifications](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/feeds)
* **Feed Generation:**
  * Generate feeds per store with store-specific data
  * Include availability, services, pricing, and facility information
  * Update feeds when reservation availability changes
* **Feed Submission:**
  * Submit feeds via SFTP or HTTPS to Google's servers
  * Support both sandbox and production feed endpoints
  * Implement feed validation before submission
* **Feed Updates:**
  * Real-time feed updates when reservations are created/modified
  * Periodic full feed refreshes
  * Incremental updates for efficiency

#### 7.1.4 Conversion Tracking

* **Conversion Tracking Implementation:**
  * Implement conversion tracking per [Google Actions Center requirements](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/conversion-tracking)
  * Track reservation completions from Google Search/Maps referrals
  * Support both sandbox and production tracking environments
* **Action Links:**
  * Each store's action links must point to store-specific reservation pages
  * Action links must include proper tracking parameters
  * Support deep linking to pre-fill reservation context
* **Conversion Events:**
  * Track reservation creation events
  * Track reservation confirmation events
  * Report conversions back to Google

#### 7.1.5 API Integration (API-based Integration)

* **Reserve with Google API Client:**
  * Create service client using Google API libraries
  * Use authenticated requests with OAuth tokens
  * Implement request rate limiting and retry logic
* **Availability Sync:**
  * Real-time sync of reservation availability to Google
  * Send availability updates when reservations are created, modified, or cancelled
  * Handle availability conflicts (double-booking prevention)
* **Reservation Sync:**
  * Accept reservations created via Google (routed to correct store by location/Profile ID)
  * Sync reservation status changes bidirectionally per store
  * Handle reservation modifications from Google per store
  * Process cancellations from Google per store
  * Ensure reservations are correctly associated with the right store based on location/Google Business Profile

#### 7.1.6 Webhook Handling (API-based Integration)

* **Webhook Endpoint:** Secure webhook receiver at `/api/webhooks/reserve-with-google/reservations` (for API-based integration)
* **Signature Validation:** Validate webhook signatures using Google's signature verification
* **Event Processing:**
  * Handle reservation creation events (route to correct store based on Google Business Profile ID/location)
  * Handle reservation update events (route to correct store)
  * Handle reservation cancellation events (route to correct store)
  * Handle availability sync requests (route to correct store)
  * Determine target store from webhook payload (Google Business Profile ID or location)
* **Store Routing:** Webhook events must be correctly routed to the appropriate store based on Google Business Profile ID or location identifier
* **Idempotency:** Ensure webhook events are processed idempotently (prevent duplicate processing) per store
* **Error Handling:** Queue failed webhook events for retry with store context

#### 7.1.7 Sync Strategy

* **Real-time Sync:**
  * Availability updates sent immediately upon reservation changes
  * Reservation creation/updates processed immediately from webhooks
* **Batch Sync (if needed):**
  * Periodic full sync for historical data reconciliation
  * Daily sync of reservation calendar to Google (or feed refresh)
* **Sync Health Monitoring:**
  * Track last successful sync timestamp per store
  * Monitor sync status (connected, error, disconnected) per store
  * Store error messages for debugging per store
  * Alert on sync failures per store

#### 7.1.8 Error Handling

* **Retry Mechanism:** Exponential backoff for failed API requests or feed submissions
* **Error Logging:** Log all integration errors with context (storeId, reservationId, error details)
* **Graceful Degradation:** System continues to accept reservations through other channels if Google integration sync fails
* **Connection Recovery:** Automatic reconnection attempts for lost connections
* **Feed Validation Errors:** Validate feeds before submission and handle Google's validation errors

#### 7.1.9 Facility Mapping

* **Map Facilities:** Map each store's facilities to Google reservation slots/services (per store)
* **capacity Mapping:** Ensure facility capacity aligns with Google slot/service configuration per store
* **Dynamic Mapping:** Support adding/removing facilities without breaking Google integration connection per store
* **Store-Specific Mapping:** Each store maintains its own facility-to-slot/service mapping independent of other stores
* **Feed Mapping:** For feed-based integration, map facilities to feed service entities

### 7.2 LINE Integration

* **LINE Login:** OAuth 2.0 flow
* **LINE Messaging API:** Send notifications and reminders
* **Webhook Handling:** Receive LINE events (future)

### 7.3 Payment Integration

* **Stripe:** For credit card payments (`payUrl = "stripe"`)
* **LINE Pay:** For LINE Pay payments (`payUrl = "linepay"` - lowercase)
* **Customer Credit:** Internal credit system (`payUrl = "creditPoint"` for credit points, `payUrl = "credit"` for fiat account balance)
* **Payment Method Routes:** Payment method routes use lowercase identifiers to avoid case-sensitivity issues on deployment (e.g., `/checkout/[orderId]/linepay/confirmed` instead of `/checkout/[orderId]/linePay/confirmed`)

### 7.4 Notification Services

* **Email:** SMTP service provider
* **SMS:** SMS service provider API
* **LINE:** LINE Messaging API

***

## 8. Shared Utility Functions

### 8.1 Reservation Validation Utilities

**Location:** `src/actions/store/reservation/`

#### 8.1.1 Business Hours Validation

**Function:** `validateRsvpTimeAgainstHours()` (Client-side) / Server-side validation in actions

**File:** `admin-edit-rsvp-dialog.tsx`, `reservation-form.tsx` (client-side validation)

**Purpose:** Validates that a reservation time (`rsvpTime`) falls within configured business hours based on priority rules.

**Priority Rules:**

1. **If `RsvpSettings.useBusinessHours = true`:** Validate `rsvpTime` against `RsvpSettings.rsvpHours`
2. **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = true`:** Validate `rsvpTime` against `StoreSettings.businessHours`
3. **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = false`:** No validation (all times allowed)

**Client-Side Validation (UI):**

* Real-time validation when user selects/changes `rsvpTime` in the form
* Displays error message below the time input field
* Prevents form submission if time is invalid

**Server-Side Validation:**

* Validates `rsvpTime` before creating/updating reservation
* Returns error toast if validation fails
* Uses same priority rules as client-side validation

**Parameters (Client-side function):**

* `rsvpTime: Date | null | undefined` - Selected reservation time
* `rsvpSettings.useBusinessHours: boolean | null` - Whether to use RSVP-specific hours
* `rsvpSettings.rsvpHours: string | null` - RSVP-specific business hours JSON
* `storeSettings.businessHours: string | null` - Store general business hours JSON
* `storeUseBusinessHours: boolean | null` - Whether store uses business hours
* `storeTimezone: string` - Store timezone string (e.g., "Asia/Taipei")

**Behavior:**

* If no hours are configured for the selected source, validation passes (all times allowed)
* Converts UTC time to store timezone for checking
* Validates day of week and time range
* Handles time ranges spanning midnight (e.g., 22:00 to 02:00)
* Returns error message string if invalid, `null` if valid
* Gracefully handles JSON parse errors (logs error, allows reservation)

**Usage:** Used in both customer-facing (`reservation-form.tsx`) and admin (`admin-edit-rsvp-dialog.tsx`) reservation forms for real-time validation and form submission validation.

#### 8.1.1a Facility Business Hours Validation (Legacy)

**Function:** `validateFacilityBusinessHours()`

**File:** `validate-facility-business-hours.ts`

**Purpose:** Validates that a reservation time falls within facility-specific business hours (if facility has its own business hours configured).

**Note:** This is separate from the RSVP/Store business hours validation above. Facilities can have their own business hours that override store/RSVP hours.

**Parameters:**

* `businessHours: string | null | undefined` - JSON string containing facility business hours schedule
* `rsvpTimeUtc: Date` - UTC Date object representing the reservation time
* `storeTimezone: string` - Store timezone string (e.g., "Asia/Taipei")
* `facilityId?: string` - Facility ID for logging purposes

**Behavior:**

* If no business hours are configured, validation passes (facility always available)
* Converts UTC time to store timezone for checking
* Validates day of week and time range
* Handles time ranges spanning midnight (e.g., 22:00 to 02:00)
* Throws `SafeError` if time is outside business hours
* Gracefully handles JSON parse errors (logs warning, allows reservation)

**Usage:** Used by `create-reservation.ts` and `update-reservation.ts` actions for facility-specific business hours validation.

#### 8.1.2 Facility Availability Filtering (UI)

**Location:** `admin-edit-rsvp-dialog.tsx`, `reservation-form.tsx`

**Purpose:** Dynamically filters available facilities in the reservation form based on the selected time slot and existing reservations.

**Behavior:**

* Filters facilities that are already booked at the selected time slot
* **Calendar Day Filtering:** Facilities are only filtered if existing reservations fall on the same calendar day (in store timezone) as the selected time slot. Reservations on different calendar days do not affect facility availability. This prevents incorrect filtering when selecting time slots on different days.
* **Timezone Handling:** Date components are extracted in store timezone using `Intl.DateTimeFormat` with `timeZone` option, ensuring correct calendar day comparison regardless of UTC representation.
* **If `singleServiceMode` is `true`:** If any reservation exists for the time slot on the same calendar day, all facilities are filtered out
* **If `singleServiceMode` is `false` (default):** Only facilities with existing reservations on the same calendar day are filtered out
* When editing an existing reservation, the current facility is always included even if it would normally be filtered out
* Also filters by facility business hours (if facility has its own business hours configured)

**Implementation:**

* Uses `useMemo` to compute `availableFacilities` based on:
  * Selected `rsvpTime`
  * Existing reservations (`rsvps` array)
  * `singleServiceMode` setting
  * `defaultDuration` for overlap detection
  * Facility business hours

**Usage:** Used in both customer-facing (`reservation-form.tsx`) and admin (`admin-edit-rsvp-dialog.tsx`) reservation forms to prevent users from selecting facilities that are already booked.

#### 8.1.3 Cancellation Window Validation

**Function:** `isCancellationWithinCancelHours()`

**File:** `validate-cancel-hours.ts`

**Purpose:** Checks if cancellation is within the cancelHours window (for refund determination). Returns `true` if cancellation is within the window (no refund), `false` if outside the window (refund allowed).

**Parameters:**

* `rsvpSettings: RsvpSettingsForValidation | null | undefined` - RsvpSettings object containing `canCancel` and `cancelHours`
* `rsvpTime: bigint` - BigInt epoch time (milliseconds) representing the reservation time

**Returns:**

* `boolean` - `true` if cancellation is within cancelHours window (no refund), `false` if outside window (refund allowed)

**Behavior:**

* Only checks if `canCancel` is enabled and `cancelHours` is set
* Calculates hours until reservation time
* Returns `false` (refund allowed) if cancellation is not enabled, `cancelHours` is not set, or if hoursUntilReservation >= cancelHours
* Returns `true` (no refund) if hoursUntilReservation < cancelHours

**Usage:** Used by `cancel-reservation.ts` to determine if refund should be processed.

#### 8.1.4 Date/Time Conversion Utilities

**Location:** `src/utils/datetime-utils.ts`

**Function:** `dayAndTimeSlotToUtc()`

**Purpose:** Converts a day Date object and time slot string to UTC Date, handling timezone conversions correctly. Used by calendar components when users click on time slots to create reservation times.

**Parameters:**

* `day: Date` - Date object representing the day
* `timeSlot: string` - Time slot in "HH:mm" format
* `storeTimezone: string` - Store timezone string (e.g., "Asia/Taipei")

**Returns:**

* `Date` - UTC Date object representing the reservation time

**Behavior:**

* **Timezone-Aware Date Extraction:** Extracts date components (year, month, day) from the day Date object in store timezone using `Intl.DateTimeFormat` with `timeZone` option and "en-CA" locale (which returns "YYYY-MM-DD" format directly), rather than UTC methods. This ensures the correct calendar day is used regardless of the Date object's UTC representation.
* Creates datetime-local string in store timezone format ("YYYY-MM-DDTHH:mm")
* Converts to UTC Date using `convertToUtc()` function
* **Fixed One-Day-Off Issue:** Previously used UTC methods (`getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`) which caused date to be off by one day when the Date object represented a different day in UTC than in store timezone. For example, if a Date object represents 12/29 00:00 in store timezone (UTC+8), it's actually 12/28 16:00 in UTC. Using UTC methods would extract 28 instead of 29, causing the one-day-off issue. Now uses store timezone extraction to ensure correct calendar day.

**Usage:** Used by calendar components (`slot-picker.tsx`, `customer-week-view-calendar.tsx`) when user clicks on a time slot to create reservation time. Also used in `weekDays` creation to ensure day objects represent correct calendar days in store timezone.

### 8.3 Order Creation Utilities

**Location:** `src/actions/store/reservation/`

#### 8.3.1 RSVP Store Order Creation

**Function:** `createRsvpStoreOrder()`

**File:** `create-rsvp-store-order.ts`

**Purpose:** Creates a store order for RSVP reservation prepaid payment. Used by customer reservation creation and admin RSVP creation flows.

**Parameters:**

* `tx` - Prisma transaction client
* `storeId` - Store ID
* `customerId` - Customer user ID
* `orderTotal` - Prepaid amount (cash value in store currency)
* `currency` - Store currency code (fetched from `store.defaultCurrency` to ensure consistency)
* `paymentMethodPayUrl` - Payment method identifier ("creditPoint" or "TBD")
* `note` - Optional order note (includes RSVP details: RSVP ID, facility name, formatted reservation time in store timezone)
* `isPaid` - Whether order is already paid (default: `false` for checkout flow)

**Returns:**

* `string` - Created store order ID

**Behavior:**

* Finds "digital" shipping method (preferred) or falls back to default shipping method
* Finds payment method by `payUrl` identifier
* Ensures "Reservation Prepaid" system product exists for the store
* Creates `StoreOrder` with:
  * Order status: `Pending` if unpaid, `Confirmed` if paid
  * Payment status: `Pending` if unpaid, `Paid` if paid
  * Shipping method: "digital"
  * Payment method: Based on `paymentMethodPayUrl` parameter
* Creates `OrderItem` linking to "Reservation Prepaid" system product
* Creates `OrderNote` if note is provided

**Usage:** Used by `create-reservation.ts` (customer) and `create-rsvp.ts` (admin) to create orders for prepaid reservations.

**Function:** `validateCancelHoursWindow()`

**File:** `validate-cancel-hours.ts`

**Purpose:** Validates that a reservation modification occurs within the allowed cancellation window (blocks modification if too close to reservation time).

**Parameters:**

* `rsvpSettings: RsvpSettingsForValidation | null | undefined` - RsvpSettings object containing `canCancel` and `cancelHours`
* `rsvpTime: bigint` - BigInt epoch time (milliseconds) representing the reservation time
* `action: "modify"` - Action being performed (for error message customization)

**Behavior:**

* Only validates if `canCancel` is enabled and `cancelHours` is set
* Calculates hours until reservation time
* Throws `SafeError` if modification occurs within the cancellation window (too close to reservation time)
* Returns early (no validation) if cancellation is not enabled or `cancelHours` is not set

**Usage:** Used by `update-reservation.ts` (action: "modify") to enforce time restrictions on modifications.

### 8.2 Refund Processing Utilities

**Location:** `src/actions/store/reservation/`

#### 8.2.1 RSVP Refund Processing

**Function:** `processRsvpCreditPointsRefund()`

**File:** `process-rsvp-refund-credit-point.ts`

**Purpose:** Processes refund for RSVP reservation if it was prepaid with credit points. Handles both HOLD refunds (RSVP not completed) and SPEND refunds (RSVP was completed, then cancelled).

**Parameters:**

* `rsvpId: string` - Reservation ID
* `storeId: string` - Store ID
* `customerId: string | null` - Customer user ID (required for refund)
* `orderId: string | null` - Store order ID (required for refund)
* `refundReason?: string` - Optional refund reason for ledger notes

**Returns:**

* `ProcessRsvpRefundResult`:
  * `refunded: boolean` - Whether refund was processed
  * `refundAmount?: number` - Credit points refunded (if refunded)

**Behavior:**

* **Refund Types:**
  * **HOLD Refund:** RSVP was prepaid but not yet completed. No revenue was recognized, so no StoreLedger entry is created.
  * **SPEND Refund:** RSVP was completed (revenue recognized), then cancelled. StoreLedger entry is created to reverse revenue.

* **Refund Process:**
  1. Determines refund type by checking for HOLD vs SPEND ledger entries
  2. Calculates refund amount from ledger entry
  3. Gets current customer credit balance
  4. Calculates new balance (current + refund amount)
  5. Gets store credit exchange rate for cash value calculation
  6. **Transaction Processing:**
     * Updates `CustomerCredit` balance (adds refund amount, restores credit)
     * Creates `CustomerCreditLedger` entry:
       * Type: "REFUND"
       * Amount: positive (credit restored)
       * `referenceId`: original order ID
       * `note`: refund reason or default message
     * **StoreLedger Entry (SPEND refunds only):**
       * Creates `StoreLedger` entry with type `StorePaymentProvider` (negative amount, revenue reversal)
       * Only created for SPEND refunds (when RSVP was completed before cancellation)
       * **No StoreLedger entry for HOLD refunds** (no revenue was recognized)
     * Updates `StoreOrder`:
       * `refundAmount`: cash value of refund
       * `orderStatus`: `Refunded`
       * `paymentStatus`: `Refunded`

**Transaction Safety:** All refund operations are performed within a single database transaction to ensure data consistency.

**Error Handling:**

* Throws `SafeError` if store not found
* All database operations are wrapped in transaction (rollback on error)
* Returns gracefully if refund conditions are not met (no error thrown)

**Usage:** Used by `cancel-reservation.ts` action when `alreadyPaid = true` and `orderId` exists.

***

## 9. Error Handling

### 9.1 Error Types

* **Validation Errors:** Returned in `validationErrors` field
* **Business Logic Errors:** Returned in `serverError` field
* **System Errors:** Logged with `logger.error()`, return generic error to client

### 9.2 Error Logging

* **Structured Logging:** Use `logger` utility with metadata
* **Error Context:** Include storeId, userId, reservationId in error logs
* **Stack Traces:** Include in development, sanitize in production

### 9.3 User-Facing Errors

* **Toast Notifications:** Use `toastError()` for user feedback
* **Form Validation:** Inline validation errors in forms
* **Error Messages:** User-friendly, actionable error messages

***

## 10. Testing Requirements

### 10.1 Unit Tests

* **Server Actions:** Test validation, business logic, error handling
* **Utility Functions:** Test date/time utilities, validation helpers
* **Type Safety:** TypeScript compilation ensures type safety

### 10.2 Integration Tests

* **Database Operations:** Test CRUD operations with test database
* **Authentication:** Test access control and authorization
* **API Routes:** Test request/response handling

### 10.3 E2E Tests

* **Reservation Flow:** Test complete reservation creation flow
* **Payment Flow:** Test prepaid reservation flow
* **Staff Interface:** Test staff reservation management

***

## 11. Deployment Requirements

### 11.1 Environment Variables

**Platform-Level Variables (shared across all stores):**

* `POSTGRES_PRISMA_URL` - Database connection string
* `NEXT_PUBLIC_API_URL` - API base URL
* `GOOGLE_MAPS_API_KEY` - Google Maps API key (for maps display)
* `RESERVE_WITH_GOOGLE_CLIENT_ID` - Reserve with Google OAuth client ID (platform-level, shared by all stores)
* `RESERVE_WITH_GOOGLE_CLIENT_SECRET` - Reserve with Google OAuth client secret (platform-level, shared by all stores)
* `RESERVE_WITH_GOOGLE_REDIRECT_URI` - OAuth callback redirect URI (platform-level, routes to correct store)
* `RESERVE_WITH_GOOGLE_ENCRYPTION_KEY` - Key for encrypting OAuth tokens in database

**Note:** OAuth credentials (CLIENT\_ID, CLIENT\_SECRET) are platform-level and shared by all stores. Each store connects its own Google Business Profile using these platform credentials. Store-specific connection details (tokens, profile IDs) are stored per store in the `RsvpSettings` table in the database.

* `LINE_CHANNEL_ID` - LINE channel ID
* `LINE_CHANNEL_SECRET` - LINE channel secret
* `STRIPE_SECRET_KEY` - Stripe secret key
* `LINE_PAY_ID` - LINE Pay merchant ID
* `LINE_PAY_SECRET` - LINE Pay secret

### 11.2 Database Migrations

* **Prisma Migrations:** Use `prisma migrate dev` for development
* **Production Migrations:** Use `prisma migrate deploy` for production
* **Migration Strategy:** Always test migrations on staging first

### 11.3 Build Requirements

* **TypeScript:** Strict mode enabled
* **Linting:** Biome linter configured
* **Build Time:** < 60s for production build

***

## 12. Code Organization

### 12.1 Directory Structure

```plaintext
src/
├── actions/
│   └── storeAdmin/
│       ├── rsvp/              # Reservation actions
│       ├── rsvpSettings/      # Settings actions
│       ├── facilities/        # Facility management
│       ├── rsvpBlacklist/     # Blacklist actions
│       ├── rsvpTag/           # Tag actions
│       └── reserveWithGoogle/ # Reserve with Google integration actions
├── app/
│   ├── s/[storeId]/
│   │   ├── reservation/             # Public reservation page
│   │   │   ├── page.tsx             # Reservation creation page
│   │   │   ├── history/
│   │   │   │   └── page.tsx         # Reservation history (supports anonymous users)
│   │   │   └── components/
│   │   │       ├── reservation-form.tsx  # Reservation form (saves to local storage for anonymous)
│   │   │       └── customer-reservation-history-client.tsx  # History client (reads local storage)
│   ├── storeAdmin/[storeId]/(routes)/
│   │   ├── rsvp/                    # Reservation management
│   │   ├── rsvp-settings/           # Settings page
│   │   └── facilities/              # Facility management
│   └── api/
│       ├── store/[storeId]/rsvp/    # Public API
│       ├── storeAdmin/[storeId]/rsvp/ # Admin API
│       │   └── reserve-with-google/    # Reserve with Google OAuth
│       └── webhooks/
│           └── reserve-with-google/    # Reserve with Google webhooks
└── components/
    └── rsvp/                  # RSVP-specific components
├── lib/
│   └── reserve-with-google/   # Reserve with Google API client library
```

### 12.2 Naming Conventions

* **Actions:** `verb-object.ts` (e.g., `create-rsvp.ts`)
* **Validation:** `verb-object.validation.ts`
* **Components:** `kebab-case.tsx`
* **Types:** PascalCase interfaces/types

***

## 13. Data Migration

### 13.1 Initial Data Setup

* **Default Settings:** Create default `RsvpSettings` for existing stores
* **Facility Migration:** Migrate existing `StoreTables` to `StoreFacility`
* **Data Transformation:** Transform `tableName` to `facilityName`

### 13.2 Backward Compatibility

* **API Versioning:** Maintain backward compatibility during migration
* **Data Mapping:** Map old field names to new field names
* **Gradual Rollout:** Feature flags for gradual feature rollout

***

## 14. Monitoring & Observability

### 14.1 Logging

* **Structured Logging:** Use `logger` utility with metadata
* **Log Levels:** info, warn, error, debug
* **Log Context:** Include storeId, userId, reservationId in logs

### 14.2 Metrics

* **Reservation Metrics:** Count of reservations by status
* **Performance Metrics:** Response times for key operations
* **Error Rates:** Track error rates by operation type

### 14.3 Alerts

* **Critical Errors:** Alert on reservation creation failures
* **Sync Failures:** Alert on Reserve with Google sync failures
* **Connection Failures:** Alert on Reserve with Google connection failures
* **Token Expiry:** Alert on OAuth token expiration
* **Payment Failures:** Alert on payment processing errors

***

## 15. Future Technical Considerations

### 15.1 Scalability

* **Database Sharding:** Consider sharding by storeId for large scale
* **Caching Layer:** Redis for frequently accessed data
* **CDN:** Static assets served via CDN

### 15.2 Advanced Features

* **Real-time Updates:** WebSocket support for live reservation updates
* **Queue System:** Background job processing for notifications
* **Analytics:** Data warehouse for advanced analytics

***

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.5 | 2025-01-27 | System | Updated payment method identifiers and route paths: (1) **LINE Pay Payment Method** - Changed payment method identifier from `"linePay"` to `"linepay"` (lowercase) to avoid case-sensitivity issues on deployment. Updated all references in documentation. (2) **Route Paths** - Updated route paths from `/checkout/[orderId]/linePay/` to `/checkout/[orderId]/linepay/` to match lowercase directory naming. (3) **Case 2 Completion Flow** - Clarified that Case 2 (prepaid RSVP with external payment) converts HOLD to SPEND (not TOPUP to PAYMENT). The `convertFiatTopupToPayment()` function name is legacy, but implementation correctly converts HOLD to SPEND using `CustomerCreditLedgerType.Spend` enum value. (4) **Payment Integration** - Updated payment integration section to document lowercase payment method identifiers and route paths. Updated Sections 4.1.1 (RSVP Completion and Revenue Recognition), 4.1.1 (HOLD Design Payment Processing), and 7.3 (Payment Integration) to reflect these changes. |
| 2.4 | 2025-01-27 | System | Updated RSVP payment processing and completion flow documentation: (1) **HOLD Design Payment Processing** - Documented the three payment methods (credit points, fiat balance, external payment) and their ledger entry creation in `process-rsvp-after-payment.ts`. External payments create both TOPUP and HOLD entries. No StoreLedger entry is created at payment time (revenue recognized on completion). (2) **RSVP Completion and Revenue Recognition** - Documented the three cases handled by `complete-rsvp-core.ts`: prepaid with credit points (HOLD to SPEND), prepaid with external payment (HOLD to SPEND), and non-prepaid (deduct credit). Revenue recognition uses `StoreLedgerType.StorePaymentProvider` (not `Revenue` - that enum value was removed). (3) **Prepaid Payment Processing** - Clarified that prepaid payment processing happens during RSVP creation (via `processRsvpPrepaidPaymentUsingCredit`) or after checkout payment (via `processRsvpAfterPaymentAction`), NOT during update. (4) **Credit Deduction** - Clarified that credit deduction should NOT happen in `update-rsvp.ts`. Only the dedicated `complete-rsvp` action handles credit deduction and revenue recognition. (5) **Customer Reservation Modification** - Updated to document that customers cannot change `facilityId`, `serviceStaffId`, or cost/credit fields. (6) **Refund Processing** - Updated to distinguish between HOLD refunds (no StoreLedger entry) and SPEND refunds (StoreLedger entry for revenue reversal). Updated Sections 4.1.1 (Customer Reservation Creation), 4.1.1 (RSVP Completion and Revenue Recognition), 4.1.1 (Customer Reservation Modification), and 8.2.1 (RSVP Refund Processing) to reflect these changes. |
| 2.3 | 2025-01-27 | System | Redesigned anonymous reservation architecture to use Better Auth anonymous plugin: (1) **Authentication** - Anonymous users are authenticated via Better Auth anonymous plugin, which creates guest user accounts with emails like `guest-{id}@riben.life`. Anonymous users have active sessions and user IDs (guest users). (2) **Database Storage** - Reservations are stored in the database and linked to guest user accounts via `customerId` field. No longer using local storage as primary mechanism. (3) **Credit Accounts** - Anonymous users can have credit accounts (`CustomerCredit`) linked to their guest user ID. (4) **Edit/Delete/Cancel** - Anonymous users can edit, delete, and cancel reservations linked to their guest user ID (authorized by matching session `userId` to reservation `customerId`). (5) **Reservation History** - Reservation history is fetched from database based on session `customerId` (guest user ID for anonymous users). Updated Sections 4.1.1 (Customer Reservation Creation), 4.1.1 (Customer Reservation Modification), 4.2.1 (Reservation History), and 5.1 (Authentication & Authorization) to reflect the new architecture. |
| 2.2 | 2025-01-27 | System | Updated database schema documentation: (1) **ServiceStaff Model** - Added complete ServiceStaff model schema documentation (Section 3.1.4) with all fields including capacity, defaultCost, defaultCredit, defaultDuration, businessHours, isDeleted, and description. (2) **StoreFacility Model** - Updated to include businessHours, description, location, and travelInfo fields, plus FacilityPricingRules relation. (3) **Rsvp Model** - Updated to include ServiceStaff relation and all indexes (rsvpTime, arriveTime, createdAt, updatedAt, and composite index [storeId, rsvpTime, status]). (4) **Service Staff Actions** - Added service staff management actions section (4.1.3a) documenting create, update, delete, and get actions. (5) **Database Constraints** - Updated to include ServiceStaff unique constraint and soft delete behavior. (6) **Service Staff Availability** - Enhanced documentation of service staff filtering and validation in reservation creation flow. |
| 2.1 | 2025-01-27 | System | Added anonymous reservation workflow technical requirements: (1) **Name and Phone Validation** - Anonymous users must provide both name and phone number (validated with Zod schema using `.refine()`). Updated Rsvp model schema to include `name` field. (2) **Local Storage Implementation** - Anonymous reservation data saved to browser local storage (key: `rsvp-${storeId}`) after successful creation. Stored data includes reservation ID, store ID, name, phone, reservation details, status, and payment information. (3) **Checkout Flow for Anonymous Users** - After payment completion, anonymous users are redirected to order confirmation page which prompts phone number confirmation. (4) **Reservation History for Anonymous Users** - `/s/[storeId]/reservation/history` page allows anonymous access and displays reservations from local storage. No redirect to sign-in for anonymous users. Updated Sections 3.1.2 (Rsvp model), 4.1.1 (Customer Reservation Creation), and 4.2.1 (Public API Routes) to document these features. |
| 2.0 | 2025-01-27 | System | Updated authentication requirements and enhanced reservation system: (1) Clarified that no sign-in is required to create reservations - anonymous users can create reservations without authentication, even when prepaid is required (`minPrepaidPercentage > 0`). (2) Fixed facility filtering - facilities are only filtered if existing reservations fall on the same calendar day (in store timezone) as the selected time slot, preventing incorrect filtering across different days. Updated `dayAndTimeSlotToUtc()` to extract date components in store timezone using `Intl.DateTimeFormat` instead of UTC methods, fixing one-day-off issue. (3) Improved payment method handling - `markOrderAsPaidCore` now explicitly uses provided `paymentMethodId` parameter, ensuring correct payment method tracking. Payment methods are fetched by `payUrl` identifier in all payment flows (Stripe, LINE Pay, credit, cash). (4) Currency consistency - orders use store's `defaultCurrency` consistently across creation and refund processes. Refund processing uses order's `currency` field instead of store's default currency. (5) Auto store membership - `ensureCustomerIsStoreMember()` utility automatically adds customers as store members (user role) when they create orders. (6) Order notes display - `DisplayOrder` component now supports `showOrderNotes` prop (default: false) to conditionally display order notes. (7) Fiat balance badge - customer menu displays fiat balance badge when balance > 0. (8) Checkout success UX - `SuccessAndRedirect` component displays brief success message before redirecting. (9) Unpaid RSVP redirect - reservation form redirects to checkout page when editing unpaid reservations. (10) Date/time display - reservation form uses display-only field for `rsvpTime` in create mode, formatted using `formatUtcDateToDateTimeLocal()` for correct timezone display. Updated Sections 4.1.1, 8.1.2, and 8.3.1 to reflect these enhancements. |
| 1.9 | 2025-01-27 | System | Updated customer-facing RSVP creation flow with checkout integration: (1) Modified `create-reservation.ts` to create unpaid store orders and redirect to checkout instead of processing payment immediately. (2) Updated `create-rsvp-store-order.ts` to accept `paymentMethodPayUrl` parameter ("credit" or "TBD") instead of hardcoding payment method. (3) Payment method selection: Orders created with "credit" if `store.useCustomerCredit = true`, otherwise "TBD". (4) Customer credit deduction: No longer deducted at reservation creation; only deducted when customer completes payment using credit at checkout. (5) Added documentation for customer reservation creation flow and checkout integration in Section 4.1.1. (6) Added `createRsvpStoreOrder()` utility function documentation in Section 8.3.1. (7) Updated payment integration section (7.3) to document unified checkout flow. |
| 1.8 | 2025-01-27 | System | Enhanced reservation validation and UI improvements: (1) Added detailed business hours validation logic with priority rules (RsvpSettings.useBusinessHours vs Store.useBusinessHours) - validation occurs both client-side (real-time UI feedback) and server-side (form submission). Updated Section 8.1.1 to document the new validation function and priority rules. (2) Implemented dynamic facility filtering in reservation forms (both customer-facing and admin) - facilities already booked at the selected time slot are automatically filtered out from the dropdown, with special handling for singleServiceMode and edit mode. Added Section 8.1.2 to document facility availability filtering. |
| 1.7 | 2025-01-27 | System | Added `singleServiceMode` field to RsvpSettings model: Boolean field (default: `false`) for personal shops where only ONE reservation per time slot is allowed across all facilities. When enabled, availability checking blocks any reservation if another reservation exists for the same time slot, regardless of facility. When disabled (default), multiple reservations can exist on the same time slot as long as they use different facilities. Updated availability rules and functional requirements to document this behavior. |
| 1.6 | 2025-01-27 | System | Updated RsvpSettings schema documentation: Added `canReserveBefore` and `canReserveAfter` fields to control reservation time window (minimum hours in advance and maximum hours in future). Updated all timestamp fields from DateTime to BigInt (epoch milliseconds) to match actual schema. Fixed field names (`minPrepaidPercentage` for prepaid, `customerId` instead of `userId` in Rsvp model). Added reservation time window business rules to External Availability Query API section. Updated all model schemas to reflect BigInt timestamps. |
| 1.5 | 2025-01-27 | System | Added refund processing documentation for customer reservation cancellation (FR-RSVP-014): Documented automatic refund functionality when prepaid reservations are cancelled. Added `processRsvpRefund()` shared utility function details, refund flow (credit restoration, ledger entries, order status updates), transaction safety, and integration with `cancel-reservation.ts` action. Updated Customer Reservation Cancellation API section with refund business rules and technical requirements. |
| 1.4 | 2025-01-27 | System | Added External Availability Query API (Section 4.2.5): New endpoint `GET /api/store/[storeId]/rsvp/availability/slots` for external systems and other stores to query available reservation slots. Supports API key authentication, store-to-store authentication, and public access. Includes query parameters (date range, facility, duration, timezone), response format with available slots, business rules (conflict checking, capacity limits, business hours), and error handling. |
| 1.3 | 2025-01-27 | System | Added customer reservation modification technical requirements (FR-RSVP-013): Documented `update-reservation.ts` action, API endpoint, business rules including `confirmedByStore` reset requirement, time window validation (`cancelHours`), status constraints (Pending only), and authorization requirements. Separated customer actions from store admin actions in API design section. |
| 1.2 | 2025-01-27 | System | Updated integration requirements based on Google Actions Center Appointments Redirect documentation. Added onboarding/launch process (sandbox/production workflow), eligibility requirements (physical location, Google Maps address verification), feed-based integration support, conversion tracking requirements, and action links specifications. Clarified multiple integration approaches (API-based vs Feed-based). Added feed generation, validation, and submission actions. |
| 1.1 | 2025-01-27 | System | Added comprehensive Reserve with Google integration technical requirements including OAuth 2.0 flow, API client implementation, webhook handling, token management, sync strategy, and security considerations. Updated database schema requirements, API routes, and environment variables. |
| 1.0 | 2025-01-27 | System | Initial technical requirements document |

***

## End of Document
