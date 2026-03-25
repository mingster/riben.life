# LINE LIFF App Integration for RSVP System

**Date:** 2025-01-28  
**Status:** Design  
**Version:** 3.0 (AI-Enhanced LIFF App Architecture)

**Related Documents:**

- [LIFF phased roadmap (waitlist → RSVP → ordering; `(root)/liff`)](./LIFF-PHASED-ROADMAP.md)
- [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md)
- [RSVP Functional Requirements](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)
- [LINE Messaging API overview](./LINE%20Messaging%20API%20overview.md)
- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)

**Reference Implementation:** [inline AI](https://ai.inline.app) - Restaurant discovery and booking platform

---

## 1. Overview

This document describes the design for integrating LINE LIFF (LINE Front-end Framework) app with the RSVP (Reservation/Appointment) system. The app provides an AI-powered conversational interface for users to discover stores, check availability, and make reservations through a rich web application within the LINE app.

### 1.1 Goals

- **AI-Powered Booking**: Enable natural language queries for availability and booking ("Is Store X available tomorrow for 4 people?")
- **Store Discovery**: Allow users to browse and discover stores by category, popularity, and personalized recommendations
- **Reservation Management**: Query, view, cancel, and confirm RSVPs with rich UI
- **Waitlist/Notify Me**: Allow users to subscribe for notifications when desired time slots become available
- **Saved Stores**: Let users save favorite stores for quick access
- **Native Experience**: Provide a native-like web app experience within LINE
- **Seamless Authentication**: Leverage LINE user profile data for authentication
- **Multi-Channel Support**: Support both direct in-app booking and external booking page flows

### 1.2 Scope

**Phase 1 (MVP):**

- LINE user profile integration for authentication
- Query user's RSVPs (list, details, status) with rich UI
- Rich menu for quick actions (opens LIFF app)
- Basic AI chat for availability queries
- Store details page with booking button

**Phase 2 (Core Features):**

- Store discovery (browse by category, trending, popular)
- AI chat-based booking with natural language
- Saved stores (favorites)
- Notify Me / Waitlist functionality
- Map integration for store locations
- Multi-language support (TW, EN, JP)

**Phase 3 (Advanced):**

- Create new reservations with forms and calendar
- Cancel reservations (with business rule validation)
- Confirm reservations
- View facility/service staff availability with calendar view
- Curated collections and editor's picks
- Personalized recommendations ("Daily For You")

**Out of Scope (Future Phases):**

- Recurring reservations
- Payment processing via LINE Pay
- Store admin operations via LIFF
- Group bookings across multiple stores

---

## 2. Core Features

### 2.1 AI Chat Interface

The primary interaction model is an AI-powered chat interface that understands natural language queries.

**Capabilities:**

| Query Type | Example | Response |
|------------|---------|----------|
| Availability Check | "Is Store X available tomorrow for dinner?" | Shows available time slots with "Book now" buttons |
| Booking Request | "Book a table for 2 at Store Y for Saturday 7pm" | Initiates booking flow or shows booking link |
| Store Search | "Find yakiniku restaurants near me" | Shows filtered store list with availability |
| Recommendation | "Where should I go for a romantic date?" | Shows curated recommendations |
| RSVP Query | "Show my reservations" or "我的預約" | Lists upcoming and past RSVPs |

**Chat UI Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  Hi, {userName}!                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Quick Actions:                                    │   │
│  │ • [Looking for inspiration? Explore stores]          │   │
│  │ • [January picks by editor]                          │   │
│  │ • [Planning a date - nice spots for two?]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔎 [Ask anything about stores or bookings...]       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**AI Response with Store Results:**

When AI finds available stores, it displays:

1. **Store Cards** with:
   - Store name and category
   - Photo/thumbnail
   - Map preview (embedded Google Maps)
   - Availability status
   - "Book now" button

2. **Booking Options:**
   - **Direct booking**: AI completes booking in chat (for stores with simple booking flow)
   - **External booking**: Opens store's booking page (for stores requiring payment/table selection)

### 2.2 Store Discovery

**Browse by Category:**

| Category Type | Examples |
|---------------|----------|
| Dining Type | Hot Pot, Yakiniku, Buffet, Omakase, Fine Dining, Izakaya |
| Cuisine | Japanese, Chinese, Korean, American, Thai, Italian |
| Purpose | Romantic Date, Business Dinner, Family Gathering, Party |
| Price Range | Budget, Mid-Range, Upscale, Luxury |

**Discovery Sections:**

- **Daily For You**: Personalized recommendations based on user history
- **Weekly Trending**: Popular stores this week
- **Popular Stores**: All-time favorites
- **New Stores**: Recently added to platform
- **Editor's Picks**: Curated themed collections (e.g., "January picks", "Brunch spots")
- **In the News**: Featured stores from media

**Filter Options:**

- Booking Availability (date/time)
- Location (area, distance)
- Dining Purpose
- Price Range
- Others (dietary restrictions, facilities)

### 2.3 Saved Stores (Favorites)

Users can save stores for quick access:

**Features:**

- Save/unsave button on store cards and detail pages
- Dedicated "Saved Stores" page accessible from sidebar
- Quick access to saved stores when making reservations
- Notification when saved stores have special availability

**Data Model:**

```typescript
// FavoriteStore (new model or use existing pattern)
{
  userId: string;
  storeId: string;
  createdAt: BigInt; // epoch timestamp
}
```

### 2.4 Notify Me / Waitlist

When desired time slots are unavailable, users can request notifications.

**Flow:**

1. User searches for availability → No slots available
2. App shows "Notify Me" option
3. User specifies:
   - Preferred date range
   - Preferred time range
   - Party size
4. User subscribes to notifications
5. When slot becomes available, user receives LINE push notification
6. Notification includes direct booking link

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  😔 No availability for your selected time                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔔 Notify Me when seats open up                      │   │
│  │                                                       │   │
│  │ Date: [2025-02-01] to [2025-02-07]                   │   │
│  │ Time: [18:00] to [21:00]                             │   │
│  │ Party size: [2]                                       │   │
│  │                                                       │   │
│  │ [Subscribe for Notification]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📌 We'll notify you via LINE when slots become available  │
└─────────────────────────────────────────────────────────────┘
```

**Data Model:**

```prisma
model RsvpNotifyRequest {
  id            String   @id @default(cuid())
  userId        String
  storeId       String
  facilityId    String?
  serviceStaffId String?
  dateFrom      BigInt   // Start of date range (epoch)
  dateTo        BigInt   // End of date range (epoch)
  timeFrom      String   // e.g., "18:00"
  timeTo        String   // e.g., "21:00"
  partySize     Int
  status        String   @default("active") // active, fulfilled, expired, cancelled
  createdAt     BigInt
  updatedAt     BigInt
  notifiedAt    BigInt?  // When notification was sent
  
  user          User     @relation(fields: [userId], references: [id])
  store         Store    @relation(fields: [storeId], references: [id])
}
```

### 2.5 Map Integration

Store locations are displayed with embedded Google Maps:

**Features:**

- Map view of search results
- Individual store location on detail page
- "Open in Google Maps" link
- Distance from user (if location permission granted)

**Implementation:**

```tsx
// components/store-map.tsx
import { GoogleMap, Marker } from "@react-google-maps/api";

export function StoreMap({ stores }: { stores: StoreWithLocation[] }) {
  return (
    <GoogleMap
      center={mapCenter}
      zoom={12}
      options={{ mapTypeControl: false }}
    >
      {stores.map((store) => (
        <Marker
          key={store.id}
          position={{ lat: store.latitude, lng: store.longitude }}
          onClick={() => onStoreSelect(store)}
        />
      ))}
    </GoogleMap>
  );
}
```

---

## 3. User Flows

### 3.1 Opening the LIFF App

**Flow:**

1. User taps rich menu button (e.g., "AI助手", "我的預約", "探索店家") or receives message with LIFF URL
2. LINE opens LIFF app in in-app browser
3. LIFF app initializes:
   - Calls `liff.init()` with LIFF ID
   - Calls `liff.getProfile()` to get LINE user profile
   - Identifies user via `line_userId` → `User.id`
   - Loads personalized content (RSVPs, recommendations, saved stores)
4. App displays main dashboard with AI chat interface

**LIFF URL Format:**

```text
https://your-domain.com/liff/rsvp?action={action}&storeId={storeId}&rsvpId={rsvpId}
```

**Actions:**

- `chat` - AI chat interface (default)
- `discover` - Store discovery/browse
- `list` - View RSVPs
- `book` - Book at specific store
- `details` - View reservation details
- `confirm` - Confirm reservation
- `cancel` - Cancel reservation
- `notify` - Manage notify requests
- `favorites` - View saved stores

### 3.2 AI Chat Booking Flow

**Natural Language Booking:**

1. User types query: "Book a table at Store X for 2 tomorrow dinner"
2. AI parses intent and extracts:
   - Store: "Store X"
   - Party size: 2
   - Date: tomorrow
   - Time: dinner (18:00-21:00)
3. AI checks availability via server action
4. AI responds with available options and store cards
5. User selects time slot or clicks "Book now"
6. **Booking path depends on store settings:**

**Direct Booking (Simple Flow):**

For stores with `RsvpSettings.directBooking = true`:

```
User: "Book 樂在鮨中 for tomorrow 7pm for 2"
AI: "樂在鮨中 has availability at 19:00 for 2.
     Tell me your preferred time (18:00 / 18:30 / 19:00) 
     and any allergies/notes—then I'll confirm before placing it."
User: "19:00, no allergies"
AI: "Confirming: 樂在鮨中, Feb 1, 19:00, 2 people. Shall I book?"
User: "Yes"
AI: "✅ Booked! Reservation #12345. You'll receive a confirmation via LINE."
```

**External Booking (Complex Flow):**

For stores requiring payment, table selection, or other steps:

```
User: "Book 品 Galerie Shina for tomorrow dinner for 2"
AI: "品 Galerie Shina has availability on Feb 1 at 18:00 for 2.
     This restaurant requires table selection and payment.
     Click the link below to complete your booking:
     [Book on store page →] https://store.example.com/book/xxxxx"
```

### 3.3 Query RSVPs ("我的預約")

**Flow:**

1. User opens LIFF app or types "我的預約" in chat
2. App shows RSVP list with:
   - **Upcoming RSVPs** (sorted by date, nearest first)
   - **Past RSVPs** (last 30 days)
   - Filter by store (if multiple)
3. Each RSVP card shows:
   - Store name and logo
   - Date and time
   - Facility/Service Staff name
   - Party size
   - Status badge (Pending, Confirmed, Ready, Completed, Cancelled)
4. User taps card to view details

**RSVP Status Labels:**

| Status | Chinese | Color |
|--------|---------|-------|
| Pending | 待確認 | Yellow |
| Confirmed | 已確認 | Blue |
| Ready | 已報到 | Green |
| Completed | 已完成 | Gray |
| Cancelled | 已取消 | Red |
| NoShow | 未到 | Red |

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  我的預約                                    [Filter ▼]     │
├─────────────────────────────────────────────────────────────┤
│  📅 即將到來                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] 品 Galerie Shina                    已確認    │   │
│  │        2月1日 (六) 18:00 | 2位 | VIP包廂            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] 樂在鮨中                            待確認    │   │
│  │        2月3日 (一) 19:00 | 4位 | 吧檯席            │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  📜 過去預約                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] 鮨洵                                已完成    │   │
│  │        1月28日 (二) 12:00 | 2位                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Book Facility (Form-Based)

**Flow:**

1. User navigates to store page or taps "預約設施" in rich menu
2. App shows store selection (if not pre-selected)
3. App shows facility list with:
   - Facility name, description, photo
   - Capacity (seats)
   - Pricing information
   - Real-time availability indicator
4. User selects facility
5. App shows calendar with available dates highlighted
6. User selects date
7. App shows available time slots for selected date
8. User selects time slot
9. App shows booking form:
   - Number of adults/children
   - Optional message/notes
   - Cost summary (if applicable)
10. User reviews and taps "確認預約"
11. **Two paths based on store settings:**
    - **Direct booking**: App creates reservation via server action
    - **External booking**: App redirects to store's booking page
12. App shows confirmation page with reservation details

### 3.5 Book Service Staff

**Flow:**

1. User navigates to store page or taps "預約服務人員"
2. App shows service staff list with:
   - Staff name and photo
   - Description and specialties
   - Pricing information
   - Availability indicator
3. User selects service staff
4. App shows calendar with staff-specific availability
5. User selects date and time
6. App shows booking form
7. User reviews and confirms
8. App creates reservation or redirects to external page
9. App shows confirmation page

### 3.6 Cancel Reservation

**Flow:**

1. User views reservation details in LIFF app
2. User taps "取消預約" (Cancel Reservation) button
3. App validates cancellation rules:
   - Check `RsvpSettings.canCancel`
   - Check `RsvpSettings.cancelHours` (must be X hours before)
   - Check if already paid (may require refund)
4. If valid, app shows confirmation dialog with:
   - Cancellation terms
   - Refund policy (if applicable)
5. User confirms cancellation
6. App calls server action to cancel reservation
7. App shows success message and updates list
8. If invalid, app shows error message explaining why

### 3.7 Confirm Reservation

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

## 4. Technical Architecture

### 4.1 System Components

```txt
┌─────────────────────────────────────────────────────────────┐
│                    LINE Messaging API                        │
│              (Webhook: POST /api/notifications/webhooks/line)│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Handler                           │
│  (app/api/notifications/webhooks/line/route.ts)             │
│  - Signature verification                                    │
│  - Message/Postback event routing                           │
│  - Staff commands (confirm, complete)                        │
│  - Customer commands (我的預約)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐        ┌───────────────────────────────┐
│   LIFF App         │        │   AI Chat Service              │
│   (Next.js App)    │        │   (lib/ai/chat-service.ts)     │
│                    │        │                                │
│   - React UI       │        │   - Natural language parsing   │
│   - LIFF SDK       │        │   - Intent recognition         │
│   - Forms          │        │   - Availability queries       │
│   - Calendar       │        │   - Booking flow management    │
│   - Map views      │        │   - Store recommendations      │
└────────┬───────────┘        └───────────────┬───────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              LIFF Routes & Client Components                 │
│  (app/liff/rsvp/*.tsx)                                      │
│                                                              │
│  Pages:                          Components:                 │
│  - /liff/rsvp (main)            - AIChat                    │
│  - /liff/rsvp/discover          - StoreDiscovery            │
│  - /liff/rsvp/favorites         - RSVPList                  │
│  - /liff/rsvp/notify            - FacilityBooking           │
│  - /liff/rsvp/book/[storeId]    - ServiceStaffBooking       │
│                                  - StoreCard                 │
│                                  - StoreMap                  │
│                                  - CalendarPicker            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Server Actions                                  │
│  (actions/user/rsvp/*.ts)                                   │
│                                                              │
│  RSVP Actions:                   Discovery Actions:          │
│  - queryMyRsvpsAction            - searchStoresAction        │
│  - createRsvpViaLineAction       - getStoreDetailsAction     │
│  - cancelRsvpViaLineAction       - getFacilitiesAction       │
│  - confirmRsvpViaLineAction      - getServiceStaffAction     │
│  - getAvailabilityAction                                     │
│                                                              │
│  Notify Actions:                 Favorites Actions:          │
│  - createNotifyRequestAction     - saveFavoriteAction        │
│  - cancelNotifyRequestAction     - removeFavoriteAction      │
│  - listNotifyRequestsAction      - listFavoritesAction       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (Prisma)                               │
│                                                              │
│  Core: Rsvp, StoreFacility, ServiceStaff, RsvpSettings      │
│  New:  RsvpNotifyRequest, FavoriteStore, StoreCategory      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

**LIFF App Flow:**

1. **User opens LIFF app** → LINE Platform opens web app
2. **LIFF SDK initializes** → App calls `liff.init()` with LIFF ID
3. **User authentication** → App calls `liff.getProfile()` to get LINE user info
4. **User identification** → App looks up `User.line_userId` → `User.id`
5. **Data fetching** → App calls server actions to get RSVPs/availability
6. **User interaction** → User fills forms, selects options (client-side state)
7. **Reservation creation** → App calls server action to create/update RSVP
8. **Confirmation** → App shows success message

**AI Chat Flow:**

1. **User sends message** → "Book Store X for 2 tomorrow dinner"
2. **AI parses intent** → Extract: store, party size, date, time preference
3. **Availability check** → Call `getAvailabilityAction` with parsed parameters
4. **Response generation** → Format available slots with store cards
5. **User selection** → User clicks "Book now" or provides more details
6. **Booking execution** → 
   - Direct: Call `createRsvpViaLineAction`
   - External: Provide booking URL
7. **Confirmation** → Send LINE message with booking details

**Webhook Flow (for notifications):**

1. **User receives notification** → LINE Platform sends webhook
2. **Webhook handler** verifies signature, identifies store
3. **Notification sent** → Push message with LIFF URL (if applicable)
4. **User taps notification** → Opens LIFF app with specific action

### 4.3 State Management

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

## 5. LIFF App & Rich Menu Integration

### 5.1 App Navigation Structure

The LIFF app follows a sidebar navigation pattern similar to the inline AI reference:

**Sidebar Menu:**

```
┌─────────────────────────────────────┐
│  [New Chat]           ← AI Chat    │
│  [Chat with AI]       ← Active     │
│  [Discover]           ← Browse     │
│  [Notify Me]          ← Waitlist   │
│  [Saved Stores]       ← Favorites  │
│  [My Reservations]    ← RSVPs      │
│  ─────────────────────             │
│  [Terms of Service]                 │
│  [FAQ]                              │
│  [Language ▼]                       │
│  ─────────────────────             │
│  [Log out]                          │
└─────────────────────────────────────┘
```

**Navigation Routes:**

| Menu Item | Route | Action |
|-----------|-------|--------|
| New Chat | `/liff/rsvp?action=chat` | Start new AI conversation |
| Chat with AI | `/liff/rsvp?action=chat&chatId={id}` | Continue conversation |
| Discover | `/liff/rsvp?action=discover` | Browse stores |
| Notify Me | `/liff/rsvp?action=notify` | View/manage waitlists |
| Saved Stores | `/liff/rsvp?action=favorites` | View favorites |
| My Reservations | `/liff/rsvp?action=list` | View RSVPs |

### 5.2 Rich Menu with LIFF URLs

**Design (2x3 Grid):**

```
┌─────────────────────────────────────────────┐
│  [🤖 AI助手]   [🔍 探索店家]   [📅 我的預約]  │
│  [🔔 通知我]   [❤️ 收藏店家]   [❓ 幫助]      │
└─────────────────────────────────────────────┘
```

**Rich Menu Actions:**

```typescript
{
  type: "richmenuswitch",
  richMenuAliasId: "main-menu",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=chat",
        label: "AI助手"
      }
    },
    {
      bounds: { x: 833, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=discover",
        label: "探索店家"
      }
    },
    {
      bounds: { x: 1666, y: 0, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=list",
        label: "我的預約"
      }
    },
    {
      bounds: { x: 0, y: 168, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=notify",
        label: "通知我"
      }
    },
    {
      bounds: { x: 833, y: 168, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=favorites",
        label: "收藏店家"
      }
    },
    {
      bounds: { x: 1666, y: 168, width: 833, height: 168 },
      action: {
        type: "uri",
        uri: "https://liff.line.me/{LIFF_ID}?action=help",
        label: "幫助"
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
- Use LIFF URL format: `https://liff.line.me/{LIFF_ID}?action={action}`

### 5.3 Push Messages with LIFF URLs

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

### 5.4 Postback Events (Optional)

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

## 6. Authentication & Security

### 6.1 LIFF Authentication

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

### 6.2 Store Context

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

### 6.3 Authorization

**Business Rules:**

- User can only query/modify their own RSVPs
- Validate `Rsvp.customerId === User.id` for all operations
- Respect store-level settings (`RsvpSettings.canCancel`, etc.)
- Check blacklist: `RsvpBlacklist` (user cannot book if blacklisted)

### 6.4 Rate Limiting

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

## 7. Implementation Phases

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

## 8. Database Schema Changes

### 8.1 Update NotificationChannelConfig

Add LIFF ID and rich menu ID to settings:

```prisma
// In NotificationChannelConfig model
settings Json? // {
//   "liffId": "liff-xxxxx",           // LIFF app ID
//   "richMenuId": "richmenu-xxx",     // Rich menu ID
//   "liffUrl": "https://liff.line.me/xxxxx" // LIFF app URL
// }
```

### 8.2 New Tables

**RsvpNotifyRequest (Waitlist/Notify Me):**

```prisma
model RsvpNotifyRequest {
  id              String    @id @default(cuid())
  userId          String
  storeId         String
  facilityId      String?
  serviceStaffId  String?
  
  // Request parameters
  dateFrom        BigInt    // Start of preferred date range (epoch)
  dateTo          BigInt    // End of preferred date range (epoch)
  timeFrom        String    // e.g., "18:00"
  timeTo          String    // e.g., "21:00"
  partySize       Int
  
  // Status tracking
  status          String    @default("active") // active, fulfilled, expired, cancelled
  createdAt       BigInt
  updatedAt       BigInt
  notifiedAt      BigInt?   // When notification was sent
  expiresAt       BigInt?   // Auto-expire date
  
  // Relations
  user            User      @relation(fields: [userId], references: [id])
  store           Store     @relation(fields: [storeId], references: [id])
  facility        StoreFacility? @relation(fields: [facilityId], references: [id])
  serviceStaff    ServiceStaff?  @relation(fields: [serviceStaffId], references: [id])
  
  @@index([userId])
  @@index([storeId])
  @@index([status])
  @@index([dateFrom, dateTo])
}
```

**FavoriteStore (Saved Stores):**

```prisma
model FavoriteStore {
  id        String  @id @default(cuid())
  userId    String
  storeId   String
  createdAt BigInt
  
  // Relations
  user      User    @relation(fields: [userId], references: [id])
  store     Store   @relation(fields: [storeId], references: [id])
  
  @@unique([userId, storeId])
  @@index([userId])
  @@index([storeId])
}
```

**StoreCategory (Optional - for store discovery):**

```prisma
model StoreCategory {
  id          String   @id @default(cuid())
  storeId     String
  categoryType String  // "dining_type", "cuisine", "purpose", "price_range"
  categoryValue String // "hot_pot", "japanese", "romantic", "upscale"
  createdAt   BigInt
  
  store       Store    @relation(fields: [storeId], references: [id])
  
  @@index([storeId])
  @@index([categoryType, categoryValue])
}
```

### 8.3 RsvpSettings Updates

Add settings for direct booking vs external booking:

```prisma
// Add to RsvpSettings model
model RsvpSettings {
  // ... existing fields ...
  
  // Booking flow settings
  directBooking     Boolean @default(true)  // Allow direct in-app booking
  externalBookingUrl String?                 // URL for external booking page
  requirePayment    Boolean @default(false) // Booking requires prepayment
  requireTableSelection Boolean @default(false) // User must select table
}
```

---

## 9. API Routes & Server Actions

### 9.1 Webhook Handler Updates

**File:** `src/app/api/notifications/webhooks/line/route.ts`

**Changes:**

- Add message event handler
- Route to `LineBotService.processMessage()`
- Handle postback events

### 9.2 New Server Actions

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

## 10. Error Handling

### 10.1 User-Friendly Error Messages

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

### 10.2 Logging

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

## 11. Testing Strategy

### 11.1 Unit Tests

- LIFF client initialization and authentication
- Component rendering (RSVP list, booking forms)
- Form validation
- Business rule validation
- Server action logic

### 11.2 Integration Tests

- End-to-end booking flows
- LIFF authentication flow
- Server action calls
- Database operations
- LINE API interactions (mocked)

### 11.3 Manual Testing

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

## 12. Internationalization

### 12.1 Supported Languages

- **Traditional Chinese (tw)** - Primary
- **English (en)** - Secondary
- **Japanese (jp)** - Future

### 12.2 Translation Keys

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

## 13. Future Enhancements

### 13.1 Advanced Features

- **Recurring Reservations:** "每週三 14:00 預約"
- **Group Bookings:** Book multiple facilities/staff at once
- **Payment Integration:** Pay via LINE Pay
- **Waitlist:** Join waitlist via bot
- **Notifications:** Proactive notifications for availability

### 13.2 AI/ML Integration

- **Natural Language Understanding:** Better intent recognition
- **Smart Suggestions:** Suggest optimal booking times
- **Personalization:** Learn user preferences

### 13.3 Analytics

- **Usage Tracking:** Bot interaction metrics
- **Conversion Rates:** Booking completion rates
- **User Behavior:** Most common flows, drop-off points

---

## 14. Security Considerations

### 14.1 LIFF App Security

- ✅ ID token verification on server
- ✅ HTTPS only (required by LIFF)
- ✅ Input validation and sanitization
- ✅ CSRF protection (LIFF handles this)
- ✅ Rate limiting per user

### 14.2 Authentication Security

- Verify LINE ID token on every server action call
- Validate `User.line_userId` matches token
- Check user authorization for all operations
- Handle expired tokens gracefully

### 14.3 Data Privacy

- Only request necessary LINE profile data
- Store minimal user data
- Log user interactions (for debugging only)
- Comply with LINE's privacy policy
- Auto-expire sessions after inactivity

### 14.4 Business Logic Security

- Validate all business rules server-side
- Never trust client input
- Check authorization for all operations
- Respect store settings and blacklists
- Validate reservation ownership before modifications

---

## 15. Deployment Checklist

### 15.1 Pre-Deployment

- [ ] LIFF app created in LINE Developers Console
- [ ] LIFF URL configured: `https://your-domain.com/liff/rsvp`
- [ ] LIFF ID stored in `NotificationChannelConfig.settings.liffId`
- [ ] Environment variables configured
- [ ] LINE webhook URL registered (for notifications)
- [ ] Rich menu created and linked (with LIFF URLs)
- [ ] Translation keys added
- [ ] LIFF SDK installed: `@line/liff`

### 15.2 Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing with LINE app (iOS and Android)
- [ ] Test in external browser (fallback)
- [ ] Error scenarios tested
- [ ] Multi-store scenarios tested
- [ ] Authentication flow tested
- [ ] Rich menu buttons tested

### 15.3 Monitoring

- [ ] Logging configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Usage metrics tracking
- [ ] LIFF app analytics
- [ ] Alerting for failures
- [ ] Performance monitoring

---

## 16. References

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
