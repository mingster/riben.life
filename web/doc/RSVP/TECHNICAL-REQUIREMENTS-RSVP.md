# Technical Requirements: RSVP System

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.2  
**Related Documents:**

- [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [PRD-restaurant-reservation.md](./PRD-restaurant-reservation.md)

---

## 1. Overview

This document specifies the technical architecture, implementation patterns, and technical constraints for the RSVP (Reservation/Appointment) system. It complements the Functional Requirements document by providing technical implementation details.

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

- `storeActionClient` - For store admin actions (requires store membership in the organization)
- `userRequiredActionClient` - For authenticated user actions
- `adminActionClient` - For system admin actions
- `baseClient` - For public/unauthenticated actions

#### 2.2.2 Component Architecture

- **Server Components (default):** Data fetching, initial page rendering
- **Client Components:** Interactive UI, forms, state management
- **Pattern:** Server page → Client component → Server actions

#### 2.2.3 Data Flow

1. **Server Components:** Fetch initial data from database
2. **Client Components:** Manage local state, handle user interactions
3. **Server Actions:** Process mutations, return results
4. **State Updates:** Client components update local state after successful mutations

---

## 3. Database Schema

### 3.1 Core Models

#### 3.1.1 RsvpSettings

```prisma
model RsvpSettings {
  id              String   @id @default(uuid())
  storeId         String
  acceptReservation Boolean  @default(true)
  prepaidRequired   Boolean  @default(false)
  prepaidAmount     Decimal? // Can be dollar amount or CustomerCredit amount
  canCancel         Boolean  @default(true)
  cancelHours       Int      @default(24)
  defaultDuration   Int      @default(60)
  requireSignature   Boolean  @default(false)
  showCostToCustomer Boolean  @default(false)
  useBusinessHours   Boolean  @default(true)
  rsvpHours          String?
  reminderHours      Int      @default(24)
  useReminderSMS     Boolean  @default(false)
  useReminderLine    Boolean  @default(false)
  useReminderEmail   Boolean  @default(false)
  syncWithGoogle     Boolean  @default(false)
  syncWithApple      Boolean  @default(false)
  
  // Reserve with Google integration fields
  reserveWithGoogleEnabled     Boolean  @default(false)
  googleBusinessProfileId      String?  // Google Business Profile ID
  googleBusinessProfileName    String?  // Store name in Google Business Profile
  reserveWithGoogleAccessToken String?  // Encrypted OAuth access token
  reserveWithGoogleRefreshToken String? // Encrypted OAuth refresh token
  reserveWithGoogleTokenExpiry DateTime? // Token expiry timestamp
  reserveWithGoogleLastSync    DateTime? // Last successful sync timestamp
  reserveWithGoogleSyncStatus  String?  // "connected", "error", "disconnected"
  reserveWithGoogleError       String?  // Last error message
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
}
```

#### 3.1.2 Rsvp

```prisma
model Rsvp {
  id                String    @id @default(uuid())
  storeId           String
  alreadyPaid       Boolean   @default(false)
  userId            String?
  orderId           String?
  facilityId       String?
  numOfAdult        Int       @default(1)
  numOfChild        Int       @default(0)
  rsvpTime          DateTime
  arriveTime        DateTime?
  status            Int       @default(0) // RsvpStatus enum: 0=Pending, 40=Seated, 50=Completed, 60=Cancelled, 70=NoShow
  message           String?
  confirmedByStore  Boolean   @default(false)
  confirmedByCustomer Boolean @default(false)
  signature         String?   // Base64 encoded signature image/data
  signatureTimestamp DateTime?
  source            String?   // e.g., "reserve_with_google", "line", "phone", "walk-in", "online"
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  Store    Store          @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User     User?          @relation(fields: [userId], references: [id], onDelete: Cascade)
  Order    StoreOrder?    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  Facility StoreFacility? @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([userId])
  @@index([orderId])
  @@index([facilityId])
  @@index([rsvpTime])
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
  updatedAt DateTime @updatedAt
  
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
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
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
  createdAt DateTime @default(now())
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, name])
  @@index([storeId])
}
```

### 3.2 Database Constraints

- **Unique Constraints:**
  - `RsvpSettings.storeId` - One settings record per store
  - `StoreFacility.storeId + facilityName` - Unique facility names per store
  - `CustomerCredit.storeId + userId` - One credit record per customer per store
  - `RsvpTag.storeId + name` - Unique tag names per store

- **Indexes:**
  - All foreign keys indexed for query performance
  - `Rsvp.rsvpTime` indexed for date range queries
  - `StoreFacility.facilityName` indexed for search

- **Cascade Deletes:**
  - All related records cascade delete when store is deleted
  - User deletion cascades to reservations and credits

---

## 4. API Design

### 4.1 Server Actions

#### 4.1.1 Reservation Actions

**Location:** `src/actions/storeAdmin/rsvp/`

- `create-rsvp.ts` - Create new reservation
- `create-rsvps.ts` - Create multiple recurring reservations
- `update-rsvp.ts` - Update existing reservation
- `delete-rsvp.ts` - Delete/cancel reservation
- `confirm-rsvp.ts` - Confirm reservation (store or customer)
- `mark-seated.ts` - Mark reservation as seated
- `mark-completed.ts` - Mark reservation as completed
- `mark-no-show.ts` - Mark reservation as no-show

**Validation Files:** `[action-name].validation.ts`

#### 4.1.2 Settings Actions

**Location:** `src/actions/storeAdmin/settings/`

- `update-store-rsvp.ts` - Update RSVP settings
- `update-rsvp-prepaid.ts` - Update prepaid settings
- `update-rsvp-cancellation.ts` - Update cancellation policy
- `update-rsvp-reminders.ts` - Update reminder settings
- `update-rsvp-signature.ts` - Update signature requirements
- `update-rsvp-reserve-with-google.ts` - Update Reserve with Google integration
- `connect-reserve-with-google.ts` - Connect store's Google Business Profile to Reserve with Google
- `disconnect-reserve-with-google.ts` - Disconnect Reserve with Google integration
- `test-reserve-with-google-connection.ts` - Test Reserve with Google connection

#### 4.1.2a Google Integration Actions (Feed-based)

**Location:** `src/actions/storeAdmin/reserveWithGoogle/`

- `generate-google-feed.ts` - Generate appointment/service feed for Google Actions Center
- `submit-google-feed.ts` - Submit feed to Google (sandbox/production)
- `validate-google-feed.ts` - Validate feed before submission
- `track-google-conversion.ts` - Track and report conversions to Google

#### 4.1.3 Facility Management Actions

**Location:** `src/actions/storeAdmin/facilities/`

- `create-facility.ts` - Create new facility
- `create-facilities.ts` - Bulk create facilities
- `update-facility.ts` - Update facility
- `delete-facility.ts` - Delete facility

#### 4.1.4 Blacklist Actions

**Location:** `src/actions/storeAdmin/rsvpBlacklist/`

- `add-to-blacklist.ts` - Add user to blacklist
- `remove-from-blacklist.ts` - Remove user from blacklist
- `get-blacklist.ts` - Get blacklist entries

#### 4.1.5 Tag Actions

**Location:** `src/actions/storeAdmin/rsvpTag/`

- `create-tag.ts` - Create new tag
- `update-tag.ts` - Update tag
- `delete-tag.ts` - Delete tag
- `assign-tag.ts` - Assign tag to reservation

### 4.2 API Routes

#### 4.2.1 Public API Routes

**Location:** `src/app/api/store/[storeId]/rsvp/`

- `POST /api/store/[storeId]/rsvp` - Create reservation (public)
- `GET /api/store/[storeId]/rsvp/availability` - Get availability
- `POST /api/store/[storeId]/rsvp/[rsvpId]/confirm` - Customer confirmation
- `POST /api/store/[storeId]/rsvp/[rsvpId]/cancel` - Customer cancellation

#### 4.2.2 Store Admin API Routes

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/`

- `GET /api/storeAdmin/[storeId]/rsvp` - List reservations
- `GET /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Get reservation details
- `POST /api/storeAdmin/[storeId]/rsvp` - Create reservation (staff)
- `PATCH /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Update reservation
- `DELETE /api/storeAdmin/[storeId]/rsvp/[rsvpId]` - Delete reservation
- `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/confirm` - Store confirmation
- `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/seated` - Mark as seated
- `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/completed` - Mark as completed
- `POST /api/storeAdmin/[storeId]/rsvp/[rsvpId]/no-show` - Mark as no-show

#### 4.2.3 Reserve with Google Webhook

**Location:** `src/app/api/webhooks/reserve-with-google/`

- `POST /api/webhooks/reserve-with-google/reservations` - Receive Reserve with Google webhooks
- `POST /api/webhooks/reserve-with-google/availability` - Receive availability sync requests from Reserve with Google

#### 4.2.4 Reserve with Google OAuth Callback

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/reserve-with-google/`

- `GET /api/storeAdmin/[storeId]/rsvp/reserve-with-google/oauth/callback` - Handle OAuth callback from Google Business Profile
- `GET /api/storeAdmin/[storeId]/rsvp/reserve-with-google/oauth/connect` - Initiate OAuth connection flow

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

---

## 5. Security Requirements

### 5.1 Authentication & Authorization

- **Store Admin Actions:** Must verify store membership via `storeActionClient` (requires `storeId` in schema and user must be a member of the store's organization)
- **Store Staff Actions:** Must verify store access and staff permissions
- **Customer Actions:** Must verify user authentication for prepaid reservations
- **Public Actions:** No authentication required for basic reservation creation

### 5.2 Data Validation

- **Input Validation:** All inputs validated with Zod schemas
- **Server-side Validation:** Duplicate validation in server actions
- **SQL Injection Prevention:** Prisma ORM with parameterized queries
- **XSS Prevention:** React's built-in escaping, sanitize user inputs

### 5.3 Access Control

- **Store Isolation:** All queries filtered by `storeId`
- **User Data Isolation:** Users can only access their own reservations
- **Staff Permissions:** Configurable permissions per store staff member
- **API Access:** All admin APIs require authentication and authorization

### 5.4 Sensitive Data

- **Signature Storage:** Base64 encoded, stored securely
- **API Credentials:** Encrypted in database, never exposed to client
- **OAuth Tokens:** Reserve with Google OAuth access tokens and refresh tokens encrypted in database
- **Payment Information:** Handled by payment providers (Stripe, LINE Pay)
- **Customer Credit:** Protected by authentication and store isolation
- **Webhook Secrets:** Store webhook verification secrets securely (environment variables)

---

## 6. Performance Requirements

### 6.1 Response Times

- **Reservation Creation:** < 500ms
- **Availability Check:** < 200ms
- **Reservation List (Store Admin):** < 1s for 100 reservations
- **Settings Update:** < 300ms

### 6.2 Database Optimization

- **Indexes:** All foreign keys and frequently queried fields indexed
- **Query Optimization:** Use `select` to limit returned fields
- **Pagination:** Implement pagination for large result sets
- **Caching:** Cache store settings and facility lists

### 6.3 Concurrent Operations

- **Reservation Conflicts:** Use database transactions for availability checks
- **Optimistic Locking:** Version fields for concurrent updates
- **Race Conditions:** Handle double-booking with transaction isolation

---

## 7. Integration Requirements

### 7.1 Reserve with Google / Google Actions Center Integration

The system must establish and maintain connections to Google's reservation services for multiple stores, enabling customers to make reservations directly through Google Search and Google Maps for each store's location.

**Integration Approaches:**

Google provides multiple integration methods for appointments/reservations:

1. **Reserve with Google API** - Direct API integration with OAuth, webhooks, and real-time sync
2. **Google Actions Center Appointments Redirect** - Feed-based integration using data feeds and conversion tracking

The system should support the most appropriate integration method based on Google's requirements and platform capabilities.

**Eligibility Requirements (per [Google Actions Center documentation](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/overview)):**

- Each store must have a physical location with an address that Google can match to Google Maps database
- Any `action_link` provided must point to merchant-specific pages where users perform actions (booking appointments)
- Store addresses must be verifiable in Google Maps

**Multi-Store Architecture:**

- This is a multi-tenant platform serving many stores
- Each store has its own location and Google Business Profile
- Platform-level OAuth credentials (CLIENT_ID, CLIENT_SECRET) are shared across all stores (for API-based integration)
- Store-specific Google Business Profile connections and tokens are stored per store in `RsvpSettings`
- Each store independently connects and manages its own Google integration
- Each store must meet eligibility requirements (physical location, Google Maps verifiable address)

#### 7.1.1 Onboarding and Launch Process

Based on [Google Actions Center integration requirements](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/overview), the system must support the following onboarding workflow:

1. **Setup**
   - Configure platform-level integration settings
   - Set up Partner Portal access
   - Configure merchant matching

2. **Sandbox Environment**
   - Feeds in Sandbox: Submit test data feeds for review
   - Conversion Tracking in Sandbox: Implement and test conversion tracking
   - Sandbox Review: Google reviews integration in sandbox

3. **Production Environment**
   - Feeds in Production: Submit production data feeds
   - Conversion Tracking in Production: Deploy production conversion tracking
   - Production Review: Google reviews production integration

4. **Launch**
   - Go live after successful production review
   - Monitor integration health post-launch

**Store Eligibility Verification:**

- Verify each store has a physical location with Google Maps-verifiable address before onboarding
- Match store addresses to Google Maps database
- Validate action links point to store-specific reservation pages

#### 7.1.2 Connection & Authentication (API-based Integration)

For Reserve with Google API integration:

- **OAuth 2.0 Flow:** Implement OAuth 2.0 authorization flow for Google Business Profile
- **Platform OAuth Application:** Single OAuth application registered with Google (using platform CLIENT_ID/CLIENT_SECRET) used by all stores
- **Per-Store Google Business Profile Connection:**
  - Each store connects its own Google Business Profile through the platform OAuth application
  - Store's Google Business Profile ID and connection details stored in `RsvpSettings`
  - Each store's OAuth tokens stored per store (encrypted in database)
- **Token Management:**
  - Store OAuth access tokens securely (encrypted in database) per store
  - Implement token refresh mechanism using refresh tokens per store
  - Handle token expiration and automatic renewal per store
  - Track token expiry timestamps per store
- **Connection Verification:** Implement connection test endpoint to verify API connectivity per store
- **Store Isolation:** Ensure each store's Google integration connection is isolated and independent

#### 7.1.3 Data Feeds (Feed-based Integration)

For Google Actions Center Appointments Redirect integration:

- **Feed Format:** Generate and submit appointment/service feeds in required format (XML/JSON)
- **Feed Structure:** Include entity, action, and services data per [Google Actions Center feed specifications](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/feeds)
- **Feed Generation:**
  - Generate feeds per store with store-specific data
  - Include availability, services, pricing, and facility information
  - Update feeds when reservation availability changes
- **Feed Submission:**
  - Submit feeds via SFTP or HTTPS to Google's servers
  - Support both sandbox and production feed endpoints
  - Implement feed validation before submission
- **Feed Updates:**
  - Real-time feed updates when reservations are created/modified
  - Periodic full feed refreshes
  - Incremental updates for efficiency

#### 7.1.4 Conversion Tracking

- **Conversion Tracking Implementation:**
  - Implement conversion tracking per [Google Actions Center requirements](https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/conversion-tracking)
  - Track reservation completions from Google Search/Maps referrals
  - Support both sandbox and production tracking environments
- **Action Links:**
  - Each store's action links must point to store-specific reservation pages
  - Action links must include proper tracking parameters
  - Support deep linking to pre-fill reservation context
- **Conversion Events:**
  - Track reservation creation events
  - Track reservation confirmation events
  - Report conversions back to Google

#### 7.1.5 API Integration (API-based Integration)

- **Reserve with Google API Client:**
  - Create service client using Google API libraries
  - Use authenticated requests with OAuth tokens
  - Implement request rate limiting and retry logic
- **Availability Sync:**
  - Real-time sync of reservation availability to Google
  - Send availability updates when reservations are created, modified, or cancelled
  - Handle availability conflicts (double-booking prevention)
- **Reservation Sync:**
  - Accept reservations created via Google (routed to correct store by location/Profile ID)
  - Sync reservation status changes bidirectionally per store
  - Handle reservation modifications from Google per store
  - Process cancellations from Google per store
  - Ensure reservations are correctly associated with the right store based on location/Google Business Profile

#### 7.1.6 Webhook Handling (API-based Integration)

- **Webhook Endpoint:** Secure webhook receiver at `/api/webhooks/reserve-with-google/reservations` (for API-based integration)
- **Signature Validation:** Validate webhook signatures using Google's signature verification
- **Event Processing:**
  - Handle reservation creation events (route to correct store based on Google Business Profile ID/location)
  - Handle reservation update events (route to correct store)
  - Handle reservation cancellation events (route to correct store)
  - Handle availability sync requests (route to correct store)
  - Determine target store from webhook payload (Google Business Profile ID or location)
- **Store Routing:** Webhook events must be correctly routed to the appropriate store based on Google Business Profile ID or location identifier
- **Idempotency:** Ensure webhook events are processed idempotently (prevent duplicate processing) per store
- **Error Handling:** Queue failed webhook events for retry with store context

#### 7.1.7 Sync Strategy

- **Real-time Sync:**
  - Availability updates sent immediately upon reservation changes
  - Reservation creation/updates processed immediately from webhooks
- **Batch Sync (if needed):**
  - Periodic full sync for historical data reconciliation
  - Daily sync of reservation calendar to Google (or feed refresh)
- **Sync Health Monitoring:**
  - Track last successful sync timestamp per store
  - Monitor sync status (connected, error, disconnected) per store
  - Store error messages for debugging per store
  - Alert on sync failures per store

#### 7.1.8 Error Handling

- **Retry Mechanism:** Exponential backoff for failed API requests or feed submissions
- **Error Logging:** Log all integration errors with context (storeId, reservationId, error details)
- **Graceful Degradation:** System continues to accept reservations through other channels if Google integration sync fails
- **Connection Recovery:** Automatic reconnection attempts for lost connections
- **Feed Validation Errors:** Validate feeds before submission and handle Google's validation errors

#### 7.1.9 Facility Mapping

- **Map Facilities:** Map each store's facilities to Google reservation slots/services (per store)
- **capacity Mapping:** Ensure facility capacity aligns with Google slot/service configuration per store
- **Dynamic Mapping:** Support adding/removing facilities without breaking Google integration connection per store
- **Store-Specific Mapping:** Each store maintains its own facility-to-slot/service mapping independent of other stores
- **Feed Mapping:** For feed-based integration, map facilities to feed service entities

### 7.2 LINE Integration

- **LINE Login:** OAuth 2.0 flow
- **LINE Messaging API:** Send notifications and reminders
- **Webhook Handling:** Receive LINE events (future)

### 7.3 Payment Integration

- **Stripe:** For credit card payments
- **LINE Pay:** For LINE Pay payments
- **Customer Credit:** Internal credit system

### 7.4 Notification Services

- **Email:** SMTP service provider
- **SMS:** SMS service provider API
- **LINE:** LINE Messaging API

---

## 8. Error Handling

### 8.1 Error Types

- **Validation Errors:** Returned in `validationErrors` field
- **Business Logic Errors:** Returned in `serverError` field
- **System Errors:** Logged with `logger.error()`, return generic error to client

### 8.2 Error Logging

- **Structured Logging:** Use `logger` utility with metadata
- **Error Context:** Include storeId, userId, reservationId in error logs
- **Stack Traces:** Include in development, sanitize in production

### 8.3 User-Facing Errors

- **Toast Notifications:** Use `toastError()` for user feedback
- **Form Validation:** Inline validation errors in forms
- **Error Messages:** User-friendly, actionable error messages

---

## 9. Testing Requirements

### 9.1 Unit Tests

- **Server Actions:** Test validation, business logic, error handling
- **Utility Functions:** Test date/time utilities, validation helpers
- **Type Safety:** TypeScript compilation ensures type safety

### 9.2 Integration Tests

- **Database Operations:** Test CRUD operations with test database
- **Authentication:** Test access control and authorization
- **API Routes:** Test request/response handling

### 9.3 E2E Tests

- **Reservation Flow:** Test complete reservation creation flow
- **Payment Flow:** Test prepaid reservation flow
- **Staff Interface:** Test staff reservation management

---

## 10. Deployment Requirements

### 10.1 Environment Variables

**Platform-Level Variables (shared across all stores):**

- `POSTGRES_PRISMA_URL` - Database connection string
- `NEXT_PUBLIC_API_URL` - API base URL
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (for maps display)
- `RESERVE_WITH_GOOGLE_CLIENT_ID` - Reserve with Google OAuth client ID (platform-level, shared by all stores)
- `RESERVE_WITH_GOOGLE_CLIENT_SECRET` - Reserve with Google OAuth client secret (platform-level, shared by all stores)
- `RESERVE_WITH_GOOGLE_REDIRECT_URI` - OAuth callback redirect URI (platform-level, routes to correct store)
- `RESERVE_WITH_GOOGLE_ENCRYPTION_KEY` - Key for encrypting OAuth tokens in database

**Note:** OAuth credentials (CLIENT_ID, CLIENT_SECRET) are platform-level and shared by all stores. Each store connects its own Google Business Profile using these platform credentials. Store-specific connection details (tokens, profile IDs) are stored per store in the `RsvpSettings` table in the database.

- `LINE_CHANNEL_ID` - LINE channel ID
- `LINE_CHANNEL_SECRET` - LINE channel secret
- `STRIPE_SECRET_KEY` - Stripe secret key
- `LINE_PAY_ID` - LINE Pay merchant ID
- `LINE_PAY_SECRET` - LINE Pay secret

### 10.2 Database Migrations

- **Prisma Migrations:** Use `prisma migrate dev` for development
- **Production Migrations:** Use `prisma migrate deploy` for production
- **Migration Strategy:** Always test migrations on staging first

### 10.3 Build Requirements

- **TypeScript:** Strict mode enabled
- **Linting:** Biome linter configured
- **Build Time:** < 60s for production build

---

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
│   ├── (store)/[storeId]/rsvp/     # Public RSVP page
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

- **Actions:** `verb-object.ts` (e.g., `create-rsvp.ts`)
- **Validation:** `verb-object.validation.ts`
- **Components:** `kebab-case.tsx`
- **Types:** PascalCase interfaces/types

---

## 12. Data Migration

### 12.1 Initial Data Setup

- **Default Settings:** Create default `RsvpSettings` for existing stores
- **Facility Migration:** Migrate existing `StoreTables` to `StoreFacility`
- **Data Transformation:** Transform `tableName` to `facilityName`

### 12.2 Backward Compatibility

- **API Versioning:** Maintain backward compatibility during migration
- **Data Mapping:** Map old field names to new field names
- **Gradual Rollout:** Feature flags for gradual feature rollout

---

## 13. Monitoring & Observability

### 13.1 Logging

- **Structured Logging:** Use `logger` utility with metadata
- **Log Levels:** info, warn, error, debug
- **Log Context:** Include storeId, userId, reservationId in logs

### 13.2 Metrics

- **Reservation Metrics:** Count of reservations by status
- **Performance Metrics:** Response times for key operations
- **Error Rates:** Track error rates by operation type

### 13.3 Alerts

- **Critical Errors:** Alert on reservation creation failures
- **Sync Failures:** Alert on Reserve with Google sync failures
- **Connection Failures:** Alert on Reserve with Google connection failures
- **Token Expiry:** Alert on OAuth token expiration
- **Payment Failures:** Alert on payment processing errors

---

## 14. Future Technical Considerations

### 14.1 Scalability

- **Database Sharding:** Consider sharding by storeId for large scale
- **Caching Layer:** Redis for frequently accessed data
- **CDN:** Static assets served via CDN

### 14.2 Advanced Features

- **Real-time Updates:** WebSocket support for live reservation updates
- **Queue System:** Background job processing for notifications
- **Analytics:** Data warehouse for advanced analytics

---

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.2 | 2025-01-27 | System | Updated integration requirements based on Google Actions Center Appointments Redirect documentation. Added onboarding/launch process (sandbox/production workflow), eligibility requirements (physical location, Google Maps address verification), feed-based integration support, conversion tracking requirements, and action links specifications. Clarified multiple integration approaches (API-based vs Feed-based). Added feed generation, validation, and submission actions. |
| 1.1 | 2025-01-27 | System | Added comprehensive Reserve with Google integration technical requirements including OAuth 2.0 flow, API client implementation, webhook handling, token management, sync strategy, and security considerations. Updated database schema requirements, API routes, and environment variables. |
| 1.0 | 2025-01-27 | System | Initial technical requirements document |

---

## End of Document
