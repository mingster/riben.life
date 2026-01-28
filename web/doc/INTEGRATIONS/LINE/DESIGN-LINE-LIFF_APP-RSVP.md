# LINE LIFF App Integration for RSVP System

**Date:** 2025-01-27  
**Status:** Design  
**Version:** 2.0 (LIFF App Architecture)

**Related Documents:**

- [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md)
- [RSVP Functional Requirements](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)
- [LINE Messaging API overview](./LINE%20Messaging%20API%20overview.md)
- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)

---

## 1. Overview

This document describes the design for integrating LINE LIFF (LINE Front-end Framework) app with the RSVP (Reservation/Appointment) system, enabling users to interact with their reservations and book facilities/service staff through a rich web application within the LINE app.

### 1.1 Goals

- Enable users to query their RSVPs via LINE LIFF app
- Allow users to create new reservations (book facilities/service staff) through a web-based interface
- Support reservation management (cancel, confirm, view details) with rich UI
- Provide a native-like web app experience within LINE
- Integrate with existing RSVP system and business rules
- Leverage LINE user profile data for seamless authentication

### 1.2 Scope

**In Scope:**

- LIFF app for RSVP management (web app within LINE)
- Query user's RSVPs (list, details, status) with rich UI
- Create new reservations (facility/service staff booking) with forms and calendar
- Cancel reservations (with business rule validation)
- Confirm reservations
- View facility/service staff availability with calendar view
- Rich menu for quick actions (opens LIFF app)
- Multi-store support (users can interact with multiple stores)
- LINE user profile integration for authentication

**Out of Scope (Future Phases):**

- Recurring reservations
- Waitlist management
- Payment processing via LINE Pay
- Store admin operations via LIFF
- Push notifications for availability (separate from reminder notifications)

---

## 2. User Flows

### 2.1 Opening the LIFF App

**Flow:**

1. User taps rich menu button (e.g., "我的預約", "預約設施") or receives message with LIFF URL
2. LINE opens LIFF app in in-app browser
3. LIFF app initializes:
   - Calls `liff.getProfile()` to get LINE user profile
   - Identifies user via `line_userId` → `User.id`
   - Loads user's RSVPs and available stores
4. App displays main dashboard

**LIFF URL Format:**

```text
https://your-domain.com/liff/rsvp?storeId={storeId}&action={action}
```

**Actions:**

- `list` - View RSVPs (default)
- `book-facility` - Book facility
- `book-staff` - Book service staff
- `details` - View reservation details
- `cancel` - Cancel reservation

### 2.2 Query RSVPs

**Flow:**

1. User opens LIFF app (via rich menu or message link)
2. App shows dashboard with:
   - Upcoming RSVPs (next 30 days)
   - Past RSVPs (last 30 days)
   - Quick actions (Book Facility, Book Service Staff)
3. User taps on a reservation card to view details
4. Details page shows:
   - Store information
   - Date and time
   - Facility/Service Staff
   - Number of people
   - Status (Confirmed, Pending, etc.)
   - Actions (Cancel, Confirm if pending)

**UI Components:**

- Reservation list with cards
- Calendar view option
- Filter by store
- Search functionality

### 2.3 Book Facility

**Flow:**

1. User taps "預約設施" (Book Facility) button
2. App shows store selection (if multiple stores)
3. User selects store
4. App shows facility list with:
   - Facility name, description
   - Pricing information
   - Availability indicator
5. User selects facility
6. App shows calendar with available time slots
7. User selects date and time
8. App shows booking form:
   - Number of adults/children
   - Optional message
   - Cost summary
9. User reviews and confirms
10. App creates reservation via server action
11. App shows confirmation page with reservation details

**UI Components:**

- Facility selection cards
- Calendar component with availability
- Time slot picker
- Booking form
- Confirmation page

### 2.4 Book Service Staff

**Flow:**

1. User taps "預約服務人員" (Book Service Staff) button
2. App shows store selection (if multiple stores)
3. User selects store
4. App shows service staff list with:
   - Staff name and photo
   - Description and specialties
   - Pricing information
   - Availability indicator
5. User selects service staff
6. App shows calendar with available time slots for selected staff
7. User selects date and time
8. App shows booking form (same as facility booking)
9. User reviews and confirms
10. App creates reservation
11. App shows confirmation page

**UI Components:**

- Service staff selection cards with photos
- Calendar component with staff-specific availability
- Time slot picker
- Booking form
- Confirmation page

### 2.5 Cancel Reservation

**Flow:**

1. User views reservation details
2. User taps "取消預約" (Cancel Reservation) button
3. App validates cancellation rules:
   - Check `RsvpSettings.canCancel`
   - Check `RsvpSettings.cancelHours` (must be X hours before)
   - Check if already paid (may require refund)
4. If valid, app shows confirmation dialog
5. User confirms cancellation
6. App calls server action to cancel reservation
7. App shows success message and updates list
8. If invalid, app shows error message explaining why

**UI Components:**

- Confirmation dialog
- Error message display
- Updated reservation list

### 2.6 Confirm Reservation

**Flow:**

1. User receives reminder notification (via existing system)
2. Notification includes LIFF URL with `action=confirm&rsvpId={id}`
3. User taps notification
4. LIFF app opens to confirmation page
5. User reviews reservation details
6. User taps "確認預約" (Confirm Reservation) button
7. App updates `Rsvp.confirmedByCustomer = true`
8. App shows confirmation success message

---

## 3. Technical Architecture

### 3.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                    LINE Messaging API                        │
│              (Webhook: POST /api/notifications/webhooks/line)│
└──────────────────────┬──────────────────────────────────────┘
                       │
┌───────▼────────┐          ┌────────▼──────────────┐
│   LIFF App      │          │  Webhook Handler      │
│  (Next.js App)  │          │  (route.ts)           │
│                 │          │                       │
│  - React UI     │          │  - Message events     │
│  - LIFF SDK     │          │  - Postback events    │
│  - Forms        │          │  - Signature verify   │
│  - Calendar     │          └──────────┬────────────┘
└───────┬─────────┘                     │
        │                               │
        │                               │
┌───────▼───────────────────────────────▼──────────────┐
│              LIFF API Routes                           │
│  (app/liff/rsvp/page.tsx)                            │
│  - Main LIFF app page                                 │
│  - Authentication via LIFF profile                    │
│  - Route handling (list, book, details, etc.)         │
└───────┬───────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│              Client Components                          │
│  (app/liff/rsvp/components/*.tsx)                     │
│  - RSVPList                                            │
│  - FacilityBooking                                     │
│  - ServiceStaffBooking                                 │
│  - ReservationDetails                                  │
│  - CalendarPicker                                      │
└───────┬───────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│              Server Actions                             │
│  (actions/user/rsvp/*.ts)                             │
│  - queryMyRsvpsAction                                 │
│  - createRsvpViaLineAction                            │
│  - cancelRsvpViaLineAction                            │
│  - confirmRsvpViaLineAction                           │
│  - getAvailabilityAction                              │
└───────┬───────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Database (Prisma)                               │
│  - Rsvp, StoreFacility, ServiceStaff, RsvpSettings          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

**LIFF App Flow:**

1. **User opens LIFF app** → LINE Platform opens web app
2. **LIFF SDK initializes** → App calls `liff.init()` with LIFF ID
3. **User authentication** → App calls `liff.getProfile()` to get LINE user info
4. **User identification** → App looks up `User.line_userId` → `User.id`
5. **Data fetching** → App calls server actions to get RSVPs/availability
6. **User interaction** → User fills forms, selects options (client-side state)
7. **Reservation creation** → App calls server action to create/update RSVP
8. **Confirmation** → App shows success message

**Webhook Flow (for notifications):**

1. **User receives notification** → LINE Platform sends webhook
2. **Webhook handler** verifies signature, identifies store
3. **Notification sent** → Push message with LIFF URL (if applicable)
4. **User taps notification** → Opens LIFF app with specific action

### 3.3 State Management

**LIFF App State:**

- **Client-side state** (React state) for form data and UI state
- **URL parameters** for navigation and context (`?action=book-facility&storeId={id}`)
- **Server actions** for data fetching and mutations
- **No server-side conversation state needed** (LIFF apps are stateful web apps)

**State Flow Example (Booking):**

```typescript
// Client component state
const [selectedStore, setSelectedStore] = useState<string | null>(null);
const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [selectedTime, setSelectedTime] = useState<string | null>(null);
const [formData, setFormData] = useState({ numOfAdult: 1, numOfChild: 0 });

// Navigation via URL
router.push(`/liff/rsvp?action=book-facility&storeId=${selectedStore}`);
```

---

## 4. LIFF App & Rich Menu Integration

### 4.1 Rich Menu with LIFF URLs

**Design:**

```
┌─────────────────────────────────────┐
│  [我的預約]  [預約設施]  [預約服務人員] │
│  [幫助]     [設定]                  │
└─────────────────────────────────────┘
```

**Rich Menu Actions:**

Each button opens the LIFF app with a specific action:

```typescript
{
  type: "richmenuswitch",
  richMenuAliasId: "main-menu",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://your-domain.com/liff/rsvp?action=list",
        label: "我的預約"
      }
    },
    {
      bounds: { x: 833, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://your-domain.com/liff/rsvp?action=book-facility",
        label: "預約設施"
      }
    },
    {
      bounds: { x: 1666, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://your-domain.com/liff/rsvp?action=book-staff",
        label: "預約服務人員"
      }
    }
  ]
}
```

**Implementation:**

- Create rich menu via LINE Messaging API: `POST /v2/bot/richmenu`
- Upload rich menu image: `POST /v2/bot/richmenu/{richMenuId}/content`
- Set as default: `POST /v2/bot/user/all/richmenu/{richMenuId}`
- Store rich menu ID in `NotificationChannelConfig.settings.richMenuId`

### 4.2 Push Messages with LIFF URLs

**Reservation Reminders:**

When sending reminder notifications, include LIFF URL for quick access:

```typescript
{
  type: "flex",
  altText: "預約提醒",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "📅 預約提醒", weight: "bold", size: "xl" },
        { type: "text", text: "您的預約即將開始" },
        { type: "text", text: "📅 2025-02-15 14:00" },
        { type: "text", text: "🏪 [Store Name]" }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            uri: "https://your-domain.com/liff/rsvp?action=details&rsvpId={rsvpId}",
            label: "查看詳情"
          }
        },
        {
          type: "button",
          action: {
            type: "uri",
            uri: "https://your-domain.com/liff/rsvp?action=confirm&rsvpId={rsvpId}",
            label: "確認預約"
          }
        }
      ]
    }
  }
}
```

### 4.3 Postback Events (Optional)

**For Quick Actions:**

If users send text messages, we can still respond with LIFF URLs:

```typescript
// Webhook handler for text messages
if (event.type === "message" && event.message.type === "text") {
  const text = event.message.text;
  
  if (text.includes("預約") || text.includes("reservation")) {
    // Send message with LIFF URL
    await sendPushMessage(lineUserId, {
      type: "text",
      text: "點擊下方連結查看您的預約：",
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "uri",
              uri: "https://your-domain.com/liff/rsvp?action=list",
              label: "我的預約"
            }
          }
        ]
      }
    });
  }
}
```

---

## 5. Authentication & Security

### 5.1 LIFF Authentication

**Flow:**

1. **LIFF App Initialization:**
   - App calls `liff.init({ liffId })`
   - If not logged in, `liff.login()` redirects to LINE login
   - After login, app gets access to LINE user profile

2. **User Identification:**
   - App calls `liff.getProfile()` to get LINE user ID
   - Server verifies ID token: `liff.getIDToken()`
   - Lookup: `User.line_userId === lineUserId`
   - If found, user is authenticated
   - If not found, prompt user to link account

3. **Account Linking:**
   - If user not found, show account linking page in LIFF app
   - Redirect to: `https://your-domain.com/account?linkLine=true&lineUserId={lineUserId}`
   - After linking, redirect back to LIFF app
   - User can now use the app

**LIFF Authentication Code:**

```typescript
// app/liff/rsvp/lib/liff-auth.ts
import liff from "@line/liff";
import { verifyIdToken } from "@line/liff";

export async function authenticateUser(liffId: string) {
  // Initialize LIFF
  await liff.init({ liffId });
  
  // Check if logged in
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  
  // Get LINE profile
  const profile = await liff.getProfile();
  const idToken = liff.getIDToken();
  
  // Verify on server
  const verified = await verifyLineUser(idToken);
  if (!verified) {
    throw new Error("Invalid ID token");
  }
  
  return {
    lineUserId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  };
}

async function verifyLineUser(idToken: string) {
  // Call server action to verify
  const result = await verifyLineIdTokenAction({ idToken });
  return result.data?.user || null;
}
```

### 5.2 Store Context

**Multi-Store Support:**

- User may have reservations at multiple stores
- LIFF app needs to identify which store user is interacting with
- Store context passed via URL parameter: `?storeId={storeId}`
- If not provided, app shows store selector

**Store Selection UI:**

```tsx
// components/store-selector.tsx
export function StoreSelector({ stores, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <h2>請選擇店家</h2>
      {stores.map((store) => (
        <button
          key={store.id}
          onClick={() => onSelect(store.id)}
          className="store-card"
        >
          <img src={store.logo} alt={store.name} />
          <div>
            <h3>{store.name}</h3>
            <p>{store.address}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**URL Parameters:**

- `?action=list` - View RSVPs (default)
- `?action=book-facility&storeId={id}` - Book facility for specific store
- `?action=book-staff&storeId={id}` - Book service staff for specific store
- `?action=details&rsvpId={id}` - View reservation details
- `?action=confirm&rsvpId={id}` - Confirm reservation
- `?action=cancel&rsvpId={id}` - Cancel reservation

### 5.3 Authorization

**Business Rules:**

- User can only query/modify their own RSVPs
- Validate `Rsvp.customerId === User.id` for all operations
- Respect store-level settings (`RsvpSettings.canCancel`, etc.)
- Check blacklist: `RsvpBlacklist` (user cannot book if blacklisted)

### 5.4 Rate Limiting

**Protection:**

- Limit reservation creation: 5 reservations/hour per user
- Limit server action calls: 30 requests/minute per user
- Use Next.js rate limiting middleware
- Store rate limits in Redis or database

**Implementation:**

```typescript
// middleware.ts or server action
import { rateLimit } from "@/lib/rate-limit";

export async function createRsvpViaLineAction(...) {
  const userId = ctx.user.id;
  const limited = await rateLimit.check(userId, "create-rsvp", {
    limit: 5,
    window: 3600, // 1 hour
  });
  
  if (!limited.allowed) {
    return { serverError: "Too many requests. Please try again later." };
  }
  
  // ... create reservation
}
```

---

## 6. Implementation Phases

### Phase 1: Basic Query (MVP)

**Features:**

- Query user's RSVPs
- View reservation details
- Simple text-based interface

**Deliverables:**

- `LineBotService` class
- `QueryRSVPHandler`
- Basic message parsing
- Database schema for conversation state

**Timeline:** 2-3 weeks

### Phase 2: Booking (Core Functionality)

**Features:**

- Book facility
- Book service staff
- Multi-step conversation flow
- Availability checking

**Deliverables:**

- `BookFacilityHandler`
- `BookServiceStaffHandler`
- Conversation state management
- Availability query logic

**Timeline:** 3-4 weeks

### Phase 3: Management (Enhanced)

**Features:**

- Cancel reservations
- Confirm reservations
- Rich menu
- Template/Flex messages

**Deliverables:**

- `CancelReservationHandler`
- `ConfirmReservationHandler`
- Rich menu setup
- Enhanced message formatting

**Timeline:** 2-3 weeks

### Phase 4: Advanced Features

**Features:**

- Multi-store context switching
- Payment reminders
- Waitlist notifications
- Analytics and usage tracking

**Timeline:** 2-3 weeks

---

## 7. Database Schema Changes

### 7.1 Update NotificationChannelConfig

Add LIFF ID and rich menu ID to settings:

```prisma
// In NotificationChannelConfig model
settings Json? // {
//   "liffId": "liff-xxxxx",           // LIFF app ID
//   "richMenuId": "richmenu-xxx",     // Rich menu ID
//   "liffUrl": "https://your-domain.com/liff/rsvp" // LIFF app URL
// }
```

**No new tables needed** - LIFF app uses:

- URL parameters for navigation and context
- Client-side React state for form data
- Server actions for data operations
- No server-side conversation state required

---

## 8. API Routes & Server Actions

### 8.1 Webhook Handler Updates

**File:** `src/app/api/notifications/webhooks/line/route.ts`

**Changes:**

- Add message event handler
- Route to `LineBotService.processMessage()`
- Handle postback events

### 8.2 New Server Actions

**File:** `src/actions/user/rsvp/query-my-rsvps.ts`

```typescript
export const queryMyRsvpsAction = userRequiredActionClient
  .schema(z.object({ storeId: z.string().optional() }))
  .action(async ({ parsedInput, ctx }) => {
    // Query user's RSVPs
  });
```

**File:** `src/actions/user/rsvp/create-rsvp-via-line.ts`

```typescript
export const createRsvpViaLineAction = userRequiredActionClient
  .schema(createRsvpSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Create RSVP (reuse existing logic)
  });
```

---

## 9. Error Handling

### 9.1 User-Friendly Error Messages

**LIFF App Error Display:**

- Show errors in UI with clear messages and actions
- Use toast notifications for transient errors
- Use error pages for critical errors (authentication failures)

**Error Messages:**

- "找不到您的帳號，請先連結 LINE 帳號" (Account not found, please link LINE account)
  - Show account linking page with instructions
- "此時間已被預約，請選擇其他時間" (Time slot unavailable)
  - Highlight unavailable slots in calendar, show message
- "無法取消：距離預約時間不足24小時" (Cannot cancel: less than 24 hours before)
  - Show error dialog with explanation
- "您已被加入黑名單，無法預約" (You are blacklisted)
  - Show error page with contact information

**Error UI Components:**

```tsx
// components/error-message.tsx
export function ErrorMessage({ error, onRetry }: Props) {
  return (
    <Alert variant="destructive">
      <AlertTitle>錯誤</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {onRetry && <Button onClick={onRetry}>重試</Button>}
    </Alert>
  );
}
```

### 9.2 Logging

**Log all LIFF app interactions:**

- Page views and navigation
- Form submissions
- Server action calls
- Errors and exceptions
- Business rule violations

**Use structured logging:**

```typescript
logger.info("LIFF app action", {
  metadata: {
    lineUserId,
    storeId,
    action,
    rsvpId,
    success: true,
  },
  tags: ["liff", "rsvp"],
});

logger.error("LIFF app error", {
  metadata: {
    lineUserId,
    storeId,
    action,
    error: error.message,
    stack: error.stack,
  },
  tags: ["liff", "rsvp", "error"],
});
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

- LIFF client initialization and authentication
- Component rendering (RSVP list, booking forms)
- Form validation
- Business rule validation
- Server action logic

### 10.2 Integration Tests

- End-to-end booking flows
- LIFF authentication flow
- Server action calls
- Database operations
- LINE API interactions (mocked)

### 10.3 Manual Testing

**LIFF App Testing:**

- Test in LINE app (iOS and Android)
- Test in external browser (fallback)
- Test all user flows:
  - View RSVPs
  - Book facility
  - Book service staff
  - Cancel reservation
  - Confirm reservation
- Test error scenarios:
  - Authentication failures
  - Network errors
  - Invalid inputs
  - Business rule violations
- Test edge cases:
  - No availability
  - Blacklisted users
  - Multi-store scenarios
  - Expired sessions

**Rich Menu Testing:**

- Test all rich menu buttons
- Verify LIFF URLs open correctly
- Test in different LINE app versions

---

## 11. Internationalization

### 11.1 Supported Languages

- **Traditional Chinese (tw)** - Primary
- **English (en)** - Secondary
- **Japanese (jp)** - Future

### 11.2 Translation Keys

Add to `src/app/i18n/locales/*/translation.json`:

```json
{
  "line_bot_my_rsvps": "我的預約",
  "line_bot_book_facility": "預約設施",
  "line_bot_book_service_staff": "預約服務人員",
  "line_bot_cancel_rsvp": "取消預約",
  "line_bot_help": "幫助",
  "line_bot_select_store": "請選擇店家",
  "line_bot_select_facility": "請選擇設施",
  "line_bot_select_service_staff": "請選擇服務人員",
  "line_bot_select_date_time": "請選擇日期和時間",
  "line_bot_number_of_people": "人數？",
  "line_bot_optional_message": "備註？",
  "line_bot_rsvp_created": "預約已建立！",
  "line_bot_rsvp_cancelled": "預約已取消",
  "line_bot_no_rsvps": "您目前沒有預約",
  "line_bot_time_unavailable": "此時間已被預約，請選擇其他時間",
  "line_bot_cannot_cancel": "無法取消：距離預約時間不足{{hours}}小時"
}
```

---

## 12. Future Enhancements

### 12.1 Advanced Features

- **Recurring Reservations:** "每週三 14:00 預約"
- **Group Bookings:** Book multiple facilities/staff at once
- **Payment Integration:** Pay via LINE Pay
- **Waitlist:** Join waitlist via bot
- **Notifications:** Proactive notifications for availability

### 12.2 AI/ML Integration

- **Natural Language Understanding:** Better intent recognition
- **Smart Suggestions:** Suggest optimal booking times
- **Personalization:** Learn user preferences

### 12.3 Analytics

- **Usage Tracking:** Bot interaction metrics
- **Conversion Rates:** Booking completion rates
- **User Behavior:** Most common flows, drop-off points

---

## 13. Security Considerations

### 13.1 LIFF App Security

- ✅ ID token verification on server
- ✅ HTTPS only (required by LIFF)
- ✅ Input validation and sanitization
- ✅ CSRF protection (LIFF handles this)
- ✅ Rate limiting per user

### 13.2 Authentication Security

- Verify LINE ID token on every server action call
- Validate `User.line_userId` matches token
- Check user authorization for all operations
- Handle expired tokens gracefully

### 13.3 Data Privacy

- Only request necessary LINE profile data
- Store minimal user data
- Log user interactions (for debugging only)
- Comply with LINE's privacy policy
- Auto-expire sessions after inactivity

### 13.4 Business Logic Security

- Validate all business rules server-side
- Never trust client input
- Check authorization for all operations
- Respect store settings and blacklists
- Validate reservation ownership before modifications

---

## 14. Deployment Checklist

### 14.1 Pre-Deployment

- [ ] LIFF app created in LINE Developers Console
- [ ] LIFF URL configured: `https://your-domain.com/liff/rsvp`
- [ ] LIFF ID stored in `NotificationChannelConfig.settings.liffId`
- [ ] Environment variables configured
- [ ] LINE webhook URL registered (for notifications)
- [ ] Rich menu created and linked (with LIFF URLs)
- [ ] Translation keys added
- [ ] LIFF SDK installed: `@line/liff`

### 14.2 Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing with LINE app (iOS and Android)
- [ ] Test in external browser (fallback)
- [ ] Error scenarios tested
- [ ] Multi-store scenarios tested
- [ ] Authentication flow tested
- [ ] Rich menu buttons tested

### 14.3 Monitoring

- [ ] Logging configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Usage metrics tracking
- [ ] LIFF app analytics
- [ ] Alerting for failures
- [ ] Performance monitoring

---

## 15. References

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Bot Design Guidelines](https://developers.line.biz/en/docs/messaging-api/design-guidelines/)
- [LINE Rich Menu API](https://developers.line.biz/en/reference/messaging-api/#rich-menu)
- [RSVP Functional Requirements](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)

---

## Appendix A: Example User Flows

### A.1 Book Facility Flow (LIFF App)

**Steps:**

1. User taps "預約設施" in rich menu
2. LIFF app opens: `https://your-domain.com/liff/rsvp?action=book-facility`
3. App shows store selector (if multiple stores)
4. User selects store
5. App shows facility list with cards:
   - Facility name, description
   - Pricing information
   - Availability indicator
6. User taps facility card
7. App shows calendar with available dates highlighted
8. User selects date
9. App shows available time slots for selected date
10. User selects time slot
11. App shows booking form:
    - Number of adults/children
    - Optional message
    - Cost summary
12. User reviews and taps "確認預約" (Confirm)
13. App creates reservation via server action
14. App shows confirmation page with reservation details

**UI Flow:**

```
Rich Menu → LIFF App → Store Selector → Facility List → 
Calendar → Time Slots → Booking Form → Confirmation
```

### A.2 Query RSVPs Flow (LIFF App)

**Steps:**

1. User taps "我的預約" in rich menu
2. LIFF app opens: `https://your-domain.com/liff/rsvp?action=list`
3. App loads and displays:
   - Upcoming RSVPs (next 30 days)
   - Past RSVPs (last 30 days)
   - Filter by store (if multiple)
4. User taps on a reservation card
5. App shows reservation details page:
   - Store information
   - Date and time
   - Facility/Service Staff
   - Number of people
   - Status
   - Actions (Cancel, Confirm if pending)
6. User can tap "取消預約" to cancel
7. App shows confirmation dialog
8. User confirms cancellation
9. App updates list and shows success message

**UI Flow:**

```
Rich Menu → LIFF App → RSVP List → Reservation Details → 
Cancel Confirmation → Updated List
```

### A.3 Notification Flow with LIFF

**Steps:**

1. User receives reminder notification (via existing system)
2. Notification includes Flex message with buttons:
   - "查看詳情" → Opens LIFF: `?action=details&rsvpId={id}`
   - "確認預約" → Opens LIFF: `?action=confirm&rsvpId={id}`
3. User taps "確認預約"
4. LIFF app opens to confirmation page
5. User reviews reservation details
6. User taps "確認預約" button
7. App updates reservation status
8. App shows success message
9. User can close app or view other reservations

---

**End of Document**
