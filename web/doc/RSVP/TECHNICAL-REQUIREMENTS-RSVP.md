# Technical Requirements: RSVP System

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.0  
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
  status            Int       @default(0) // 0=pending, 1=confirmed, 2=seated, 3=completed, 4=cancelled, 5=no_show
  message           String?
  confirmedByStore  Boolean   @default(false)
  confirmedByCustomer Boolean @default(false)
  signature         String?   // Base64 encoded signature image/data
  signatureTimestamp DateTime?
  source            String?   // e.g., "google_maps", "line", "phone", "walk-in", "online"
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
- `update-rsvp-google-maps.ts` - Update Google Maps integration

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

#### 4.2.3 Google Maps Webhook

**Location:** `src/app/api/webhooks/google-maps/`

- `POST /api/webhooks/google-maps/reservations` - Receive Google Maps webhooks

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
- **Payment Information:** Handled by payment providers (Stripe, LINE Pay)
- **Customer Credit:** Protected by authentication and store isolation

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

### 7.1 Google Maps Reserve API

- **Authentication:** OAuth 2.0 or API key
- **Webhook Endpoint:** Secure webhook receiver with signature validation
- **Sync Strategy:** Real-time for availability, batch for historical data
- **Error Handling:** Retry mechanism with exponential backoff
- **Status Monitoring:** Track sync health and last successful sync

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

- `POSTGRES_PRISMA_URL` - Database connection string
- `NEXT_PUBLIC_API_URL` - API base URL
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
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

```
src/
├── actions/
│   └── storeAdmin/
│       ├── rsvp/              # Reservation actions
│       ├── rsvpSettings/      # Settings actions
│       ├── facilities/        # Facility management
│       ├── rsvpBlacklist/     # Blacklist actions
│       └── rsvpTag/           # Tag actions
├── app/
│   ├── (store)/[storeId]/rsvp/     # Public RSVP page
│   ├── storeAdmin/[storeId]/(routes)/
│   │   ├── rsvp/                    # Reservation management
│   │   ├── rsvp-settings/           # Settings page
│   │   └── facilities/              # Facility management
│   └── api/
│       ├── store/[storeId]/rsvp/    # Public API
│       └── storeAdmin/[storeId]/rsvp/ # Admin API
└── components/
    └── rsvp/                  # RSVP-specific components
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
- **Sync Failures:** Alert on Google Maps sync failures
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
| 1.0 | 2025-01-27 | System | Initial technical requirements document |

---

## End of Document
