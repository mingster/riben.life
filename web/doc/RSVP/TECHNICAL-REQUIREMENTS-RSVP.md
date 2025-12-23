# Technical Requirements: RSVP System

**Date:** 2025-01-27\
**Status:** Active\
**Version:** 1.5\
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

* **Server Components (default):** Data fetching, initial page rendering
* **Client Components:** Interactive UI, forms, state management
* **Pattern:** Server page → Client component → Server actions

#### 2.2.3 Data Flow

1. **Server Components:** Fetch initial data from database
2. **Client Components:** Manage local state, handle user interactions
3. **Server Actions:** Process mutations, return results
4. **State Updates:** Client components update local state after successful mutations

***

## 3. Database Schema

### 3.1 Core Models

#### 3.1.1 RsvpSettings

```prisma
model RsvpSettings {
  id              String   @id @default(uuid())
  storeId         String   @unique
  acceptReservation Boolean  @default(true) // turn on/off the reservation system
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
  arriveTime        BigInt?   // Epoch milliseconds, not DateTime. The time should be set when status is set to Ready
  status            Int       @default(0) // RsvpStatus enum: 0=Pending, 10=ReadyToConfirm, 40=Ready, 50=Completed, 60=Cancelled, 70=NoShow
  alreadyPaid       Boolean   @default(false) //已付款
  referenceId       String?   // reference to the StoreOrder id or CustomerCreditLedger id
  paidAt            BigInt?   // Epoch milliseconds. The time when the reservation was paid
  message           String?
  email             String?   // Email address (required if not logged in)
  phone             String?   // Phone number (required for anonymous reservations)
  confirmedByStore  Boolean   @default(false) //店家已確認預約
  confirmedByCustomer Boolean @default(false) //客戶已確認預約
  facilityCost      Decimal?  // The cost that was charged
  facilityCredit    Decimal?  // The credit that was charged
  pricingRuleId     String?   // Reference to the pricing rule used
  createdAt         BigInt    // Epoch milliseconds, not DateTime
  updatedAt         BigInt    // Epoch milliseconds, not DateTime
  createdBy         String?   // userId who created this reservation
  
  Store               Store                @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Customer            User?                @relation(fields: [customerId], references: [id], onDelete: Cascade)
  CreatedBy           User?                @relation("RsvpCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  Order               StoreOrder?          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  Facility            StoreFacility?       @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  FacilityPricingRule FacilityPricingRule? @relation(fields: [pricingRuleId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([customerId])
  @@index([createdBy])
  @@index([orderId])
  @@index([facilityId])
  @@index([pricingRuleId])
}
```

#### 3.1.3 StoreFacility

```prisma
model StoreFacility {
  id              String  @id @default(uuid())
  storeId         String
  facilityName    String
  capacity        Int     @default(4)
  defaultCost     Decimal @default(0)
  defaultCredit   Decimal @default(0)
  defaultDuration Int     @default(60)
  
  Store Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Rsvp  Rsvp[]
  
  @@unique([storeId, facilityName])
  @@index([storeId])
  @@index([facilityName])
}
```

#### 3.1.4 CustomerCredit

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

#### 3.1.5 RsvpBlacklist

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

#### 3.1.6 RsvpTag

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
  * `CustomerCredit.storeId + userId` - One credit record per customer per store
  * `RsvpTag.storeId + name` - Unique tag names per store

* **Indexes:**
  * All foreign keys indexed for query performance
  * `Rsvp.rsvpTime` indexed for date range queries
  * `StoreFacility.facilityName` indexed for search

* **Cascade Deletes:**
  * All related records cascade delete when store is deleted
  * User deletion cascades to reservations and credits

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

**Customer Reservation Modification (FR-RSVP-013):**

The `update-reservation.ts` action allows customers to modify their reservations with the following technical requirements:

* **Time Window:** Modification must occur within the allowed cancellation window (`cancelHours` from `RsvpSettings`)
* **Modifiable Fields:**
  * `rsvpTime` (date/time) - Subject to availability validation
  * `facilityId` - Can change to a different facility
  * `numOfAdult` - Party size (adults)
  * `numOfChild` - Party size (children)
  * `message` - Special requests/notes
* **Business Rules:**
  * When a reservation is modified, `confirmedByStore` must be set to `false` (requires re-confirmation by store)
  * Availability validation must check for conflicts with existing reservations
  * Facility availability must be verified for the new date/time
  * Store timezone must be considered when converting date/time inputs
* **Authentication:** Requires user authentication (can modify own reservations only)
* **Authorization:** Customers can only modify reservations where `customerId` matches their user ID

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

* **Authentication:** Required (user must be authenticated)

* **Authorization:** Customer can only cancel their own reservations (verified by `customerId` or email match)

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
      2. If outside window, finds original SPEND ledger entry to determine refund amount
      3. Restores credit to customer balance (`CustomerCredit`)
      4. Creates `CustomerCreditLedger` entry (type: "REFUND", positive amount)
      5. Creates `StoreLedger` entry (revenue reversal, negative amount, type: `CreditUsage`)
      6. Updates `StoreOrder` status to `Refunded` (both `orderStatus` and `paymentStatus`)
    * **Refund Function:** `processRsvpCreditRefund()` - Shared utility function located in `src/actions/store/reservation/process-rsvp-refund.ts`
    * **Transaction Safety:** All refund operations are performed within a database transaction

* **Response:** Returns cancelled reservation object with all relations (including updated Order if refunded)

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
* **Customer Actions:** Must verify user authentication for prepaid reservations
* **Public Actions:** No authentication required for basic reservation creation

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

* **Stripe:** For credit card payments
* **LINE Pay:** For LINE Pay payments
* **Customer Credit:** Internal credit system

### 7.4 Notification Services

* **Email:** SMTP service provider
* **SMS:** SMS service provider API
* **LINE:** LINE Messaging API

***

## 7. Shared Utility Functions

### 7.1 Reservation Validation Utilities

**Location:** `src/actions/store/reservation/`

#### 7.1.1 Business Hours Validation

**Function:** `validateFacilityBusinessHours()`

**File:** `validate-facility-business-hours.ts`

**Purpose:** Validates that a reservation time falls within facility business hours.

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

**Usage:** Used by `create-reservation.ts` and `update-reservation.ts` actions.

#### 7.1.2 Cancellation Window Validation

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

### 7.2 Refund Processing Utilities

**Location:** `src/actions/store/reservation/`

#### 7.2.1 RSVP Refund Processing

**Function:** `processRsvpRefund()`

**File:** `process-rsvp-refund.ts`

**Purpose:** Processes refund for RSVP reservation if it was prepaid. Refunds credit back to customer and reverses revenue recognition.

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

* **Early Returns:** Returns `{ refunded: false }` if:
  * No `orderId` or `customerId` provided (reservation wasn't prepaid)
  * Order not found (might have been deleted)
  * Payment method is not "credit" (only credit refunds are supported)
  * Order is already refunded
  * No SPEND ledger entry found (might not have been paid with credit)

* **Refund Process (if conditions met):**
  1. Finds original SPEND ledger entry by `orderId` to determine refund amount
  2. Calculates refund amount (absolute value of SPEND entry amount)
  3. Gets current customer credit balance
  4. Calculates new balance (current + refund amount)
  5. Gets store credit exchange rate for cash value calculation
  6. **Transaction Processing:**
     * Updates `CustomerCredit` balance (adds refund amount)
     * Creates `CustomerCreditLedger` entry:
       * Type: "REFUND"
       * Amount: positive (credit restored)
       * `referenceId`: original order ID
       * `note`: refund reason or default message
     * Creates `StoreLedger` entry:
       * Type: `CreditUsage` (same as original credit usage)
       * Amount: negative (revenue reversal)
       * `orderId`: original order ID
       * `balance`: decreases by refund cash amount
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

## 8. Error Handling

### 8.1 Error Types

* **Validation Errors:** Returned in `validationErrors` field
* **Business Logic Errors:** Returned in `serverError` field
* **System Errors:** Logged with `logger.error()`, return generic error to client

### 8.2 Error Logging

* **Structured Logging:** Use `logger` utility with metadata
* **Error Context:** Include storeId, userId, reservationId in error logs
* **Stack Traces:** Include in development, sanitize in production

### 8.3 User-Facing Errors

* **Toast Notifications:** Use `toastError()` for user feedback
* **Form Validation:** Inline validation errors in forms
* **Error Messages:** User-friendly, actionable error messages

***

## 9. Testing Requirements

### 9.1 Unit Tests

* **Server Actions:** Test validation, business logic, error handling
* **Utility Functions:** Test date/time utilities, validation helpers
* **Type Safety:** TypeScript compilation ensures type safety

### 9.2 Integration Tests

* **Database Operations:** Test CRUD operations with test database
* **Authentication:** Test access control and authorization
* **API Routes:** Test request/response handling

### 9.3 E2E Tests

* **Reservation Flow:** Test complete reservation creation flow
* **Payment Flow:** Test prepaid reservation flow
* **Staff Interface:** Test staff reservation management

***

## 10. Deployment Requirements

### 10.1 Environment Variables

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

### 10.2 Database Migrations

* **Prisma Migrations:** Use `prisma migrate dev` for development
* **Production Migrations:** Use `prisma migrate deploy` for production
* **Migration Strategy:** Always test migrations on staging first

### 10.3 Build Requirements

* **TypeScript:** Strict mode enabled
* **Linting:** Biome linter configured
* **Build Time:** < 60s for production build

***

## 11. Code Organization

### 11.1 Directory Structure

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
│   ├── s/[storeId]/rsvp/           # Public RSVP page
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

### 11.2 Naming Conventions

* **Actions:** `verb-object.ts` (e.g., `create-rsvp.ts`)
* **Validation:** `verb-object.validation.ts`
* **Components:** `kebab-case.tsx`
* **Types:** PascalCase interfaces/types

***

## 12. Data Migration

### 12.1 Initial Data Setup

* **Default Settings:** Create default `RsvpSettings` for existing stores
* **Facility Migration:** Migrate existing `StoreTables` to `StoreFacility`
* **Data Transformation:** Transform `tableName` to `facilityName`

### 12.2 Backward Compatibility

* **API Versioning:** Maintain backward compatibility during migration
* **Data Mapping:** Map old field names to new field names
* **Gradual Rollout:** Feature flags for gradual feature rollout

***

## 13. Monitoring & Observability

### 13.1 Logging

* **Structured Logging:** Use `logger` utility with metadata
* **Log Levels:** info, warn, error, debug
* **Log Context:** Include storeId, userId, reservationId in logs

### 13.2 Metrics

* **Reservation Metrics:** Count of reservations by status
* **Performance Metrics:** Response times for key operations
* **Error Rates:** Track error rates by operation type

### 13.3 Alerts

* **Critical Errors:** Alert on reservation creation failures
* **Sync Failures:** Alert on Reserve with Google sync failures
* **Connection Failures:** Alert on Reserve with Google connection failures
* **Token Expiry:** Alert on OAuth token expiration
* **Payment Failures:** Alert on payment processing errors

***

## 14. Future Technical Considerations

### 14.1 Scalability

* **Database Sharding:** Consider sharding by storeId for large scale
* **Caching Layer:** Redis for frequently accessed data
* **CDN:** Static assets served via CDN

### 14.2 Advanced Features

* **Real-time Updates:** WebSocket support for live reservation updates
* **Queue System:** Background job processing for notifications
* **Analytics:** Data warehouse for advanced analytics

***

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.6 | 2025-01-27 | System | Updated RsvpSettings schema documentation: Added `canReserveBefore` and `canReserveAfter` fields to control reservation time window (minimum hours in advance and maximum hours in future). Updated all timestamp fields from DateTime to BigInt (epoch milliseconds) to match actual schema. Fixed field names (`minPrepaidAmount` instead of `prepaidAmount`, `customerId` instead of `userId` in Rsvp model). Added reservation time window business rules to External Availability Query API section. Updated all model schemas to reflect BigInt timestamps. |
| 1.5 | 2025-01-27 | System | Added refund processing documentation for customer reservation cancellation (FR-RSVP-014): Documented automatic refund functionality when prepaid reservations are cancelled. Added `processRsvpRefund()` shared utility function details, refund flow (credit restoration, ledger entries, order status updates), transaction safety, and integration with `cancel-reservation.ts` action. Updated Customer Reservation Cancellation API section with refund business rules and technical requirements. |
| 1.4 | 2025-01-27 | System | Added External Availability Query API (Section 4.2.5): New endpoint `GET /api/store/[storeId]/rsvp/availability/slots` for external systems and other stores to query available reservation slots. Supports API key authentication, store-to-store authentication, and public access. Includes query parameters (date range, facility, duration, timezone), response format with available slots, business rules (conflict checking, capacity limits, business hours), and error handling. |
| 1.3 | 2025-01-27 | System | Added customer reservation modification technical requirements (FR-RSVP-013): Documented `update-reservation.ts` action, API endpoint, business rules including `confirmedByStore` reset requirement, time window validation (`cancelHours`), status constraints (Pending only), and authorization requirements. Separated customer actions from store admin actions in API design section. |
| 1.2 | 2025-01-27 | System | Updated integration requirements based on Google Actions Center Appointments Redirect documentation. Added onboarding/launch process (sandbox/production workflow), eligibility requirements (physical location, Google Maps address verification), feed-based integration support, conversion tracking requirements, and action links specifications. Clarified multiple integration approaches (API-based vs Feed-based). Added feed generation, validation, and submission actions. |
| 1.1 | 2025-01-27 | System | Added comprehensive Reserve with Google integration technical requirements including OAuth 2.0 flow, API client implementation, webhook handling, token management, sync strategy, and security considerations. Updated database schema requirements, API routes, and environment variables. |
| 1.0 | 2025-01-27 | System | Initial technical requirements document |

***

## End of Document
