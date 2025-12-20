# UI Design: Notification System

**Date:** 2025-01-27
**Status:** Design
**Version:** 1.0

**Related Documents:**

- [Functional Requirements: Notification System](./FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)
- [Technical Design: Notification System](./TECHNICAL-DESIGN-NOTIFICATION.md)

---

## 1. Overview

This document describes the user interface design for the Notification System, covering both System Admin and Store Admin interfaces. The UI is designed to be intuitive, efficient, and consistent with the existing platform design patterns.

**Design Principles:**

- **Consistency**: Follow existing admin UI patterns (tables, dialogs, forms)
- **Clarity**: Clear visual hierarchy and information architecture
- **Efficiency**: Minimize clicks and streamline workflows
- **Feedback**: Clear status indicators and error messages
- **Mobile-First**: Responsive design optimized for mobile devices

---

## 2. System Admin UI

### 2.1 System Notification Settings

**Location:** `/sysAdmin/notifications/settings`

**Purpose:** System-wide notification configuration and master controls.

**Components:**

#### 2.1.1 Settings Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  System Notification Settings                           │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  [Master Switch] Enable Notifications System-Wide      │
│  ☑ Enabled                                             │
│                                                         │
│  External Channel Plugins                               │
│  ───────────────────────────────────────────────────  │
│  ☐ LINE Messaging                                       │
│  ☐ WhatsApp Business                                    │
│  ☐ WeChat Official Account                              │
│  ☐ SMS                                                  │
│  ☐ Telegram Bot                                         │
│  ☐ Push Notifications                                   │
│                                                         │
│  Note: Built-in channels (On-Site, Email) are always   │
│  enabled and cannot be disabled.                       │
│                                                         │
│  Queue Configuration                                   │
│  ───────────────────────────────────────────────────  │
│  Max Retry Attempts:        [3]                        │
│  Retry Backoff (ms):        [1000]                     │
│  Queue Batch Size:          [100]                      │
│  Rate Limit (per minute):   [1000]                     │
│                                                         │
│  History & Retention                                     │
│  ───────────────────────────────────────────────────  │
│  History Retention (days):  [90]                        │
│                                                         │
│  [Save Changes]                                         │
└─────────────────────────────────────────────────────────┘
```

**Fields:**

- **Master Switch**: Toggle to enable/disable entire notification system (affects all channels)
- **External Channel Plugins**: Toggles for each external channel plugin:
  - **LINE Messaging**: Enable/disable LINE plugin system-wide
  - **WhatsApp Business**: Enable/disable WhatsApp plugin system-wide
  - **WeChat Official Account**: Enable/disable WeChat plugin system-wide
  - **SMS**: Enable/disable SMS plugin system-wide
  - **Telegram Bot**: Enable/disable Telegram plugin system-wide
  - **Push Notifications**: Enable/disable Push notification plugin system-wide
  - Built-in channels (On-Site, Email) are always enabled and not shown here
  - Only external channel plugins can be enabled/disabled by system admin
- **Max Retry Attempts**: Number of retry attempts for failed notifications (default: 3)
- **Retry Backoff (ms)**: Initial backoff delay in milliseconds (default: 1000)
- **Queue Batch Size**: Number of notifications to process per batch (default: 100)
- **Rate Limit (per minute)**: Maximum notifications per minute (default: 1000)
- **History Retention (days)**: Days to keep notification history (default: 90)

**Implementation:**

- Server component: `src/app/sysAdmin/notifications/settings/page.tsx`
- Client component: `src/app/sysAdmin/notifications/settings/components/client-settings.tsx`
- Form component: `src/app/sysAdmin/notifications/settings/components/settings-form.tsx`
- Server action: `src/actions/sysAdmin/notification/update-system-settings.ts`

### 2.2 Global Template Management

**Location:** `/sysAdmin/mail-templates` (existing, enhanced)

**Purpose:** Manage global notification templates available to all stores.

**Enhancements to Existing UI:**

1. **Template Type Filter**
   - Add filter dropdown: "All Types", "Email", "LINE", "SMS", "WhatsApp", "WeChat", "Telegram", "Push", "On-Site"
   - Filter templates by `templateType` field

2. **Global/Store Filter**
   - Add filter: "All", "Global Only", "Store-Specific"
   - Filter by `isGlobal` field

3. **Store Column**
   - Display store name for store-specific templates
   - Show "Global" for global templates

4. **Template Type Column**
   - Display template type badge (Email, LINE, SMS, etc.)

**Template Edit Dialog Enhancements:**

- **Template Type Dropdown**: Select channel type (Email, LINE, SMS, etc.)
- **Global Template Checkbox**: Mark as global template
- **Store Dropdown**: Select store (only shown when not global)

### 2.3 Notification Queue Monitoring

**Location:** `/sysAdmin/mail-queue` (existing, enhanced)

**Purpose:** Monitor and manage notification queue across all stores.

**Enhancements to Existing UI:**

1. **Store Filter**
   - Add filter dropdown to filter by store
   - Show store name in table

2. **Priority Column**
   - Display priority badge: Normal (0), High (1), Urgent (2)
   - Color coding: Normal (gray), High (yellow), Urgent (red)

3. **Template Column**
   - Display template name if linked
   - Link to template edit page

4. **Notification Column**
   - Display notification ID if linked
   - Link to notification details

5. **Channel Status Indicators**
   - Show delivery status for each channel
   - Color-coded badges: Pending (gray), Sent (blue), Delivered (green), Failed (red)

### 2.4 Message Queue Management

**Location:** `/sysAdmin/message-queue`

**Purpose:** Monitor and manage the central message queue (`MessageQueue` model) for all notification channels across all stores.

**Components:**

#### 2.4.1 Message Queue Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Message Queue                              [1,234]     │
│  ───────────────────────────────────────────────────  │
│  Manage Message Queue. (2025-01-27 14:30:00)          │
│                                                         │
│  [Delete Selected]                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [✓] │ Sender │ Recipient │ Subject │ Type │ ... │  │
│  ├─────┼────────┼───────────┼─────────┼──────┼─────┤  │
│  │ [ ] │ Admin  │ User 1    │ Order   │ order│ ... │  │
│  │     │        │           │ Created │      │     │  │
│  ├─────┼────────┼───────────┼─────────┼──────┼─────┤  │
│  │ [ ] │ System │ User 2    │ Welcome │system│ ... │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Table Columns:**

- **Select**: Checkbox for row selection
- **Sender**: Sender name/email with link to user page
- **Recipient**: Recipient name/email with link to user page
- **Subject**: Notification subject with edit button
- **Type**: Notification type badge (order, reservation, credit, system, etc.)
- **Priority**: Priority badge (Normal, High, Urgent)
- **Read**: Read status indicator (✓ or ✗)
- **Store**: Store name (if applicable)
- **Created**: Creation timestamp
- **Sent**: Sent timestamp (if sent)
- **Actions**: Dropdown menu (Copy ID, Delete)

**Features:**

- **View All Messages**: Display all messages in the `MessageQueue` across all channels
- **Edit Messages**: Edit message details via dialog
- **Delete Messages**: Delete single or multiple messages
- **Filter by Store**: Filter messages by store (future enhancement)
- **Filter by Type**: Filter by notification type (future enhancement)
- **Filter by Status**: Filter by read/unread status (future enhancement)
- **Search**: Search by subject, sender, or recipient (via DataTable search)
- **Sort**: Sortable columns
- **Bulk Actions**: Delete selected messages
- **Real-time Updates**: Current time display updates every 10 seconds

**Implementation:**

- Server component: `src/app/sysAdmin/message-queue/page.tsx`
- Client component: `src/app/sysAdmin/message-queue/components/client-message-queue.tsx`
- Edit dialog: `src/app/sysAdmin/message-queue/components/edit-message-queue.tsx`
- Server actions:
  - `src/actions/sysAdmin/messageQueue/update-message-queue.ts`
  - Delete via API route: `/api/sysAdmin/messageQueue/[id]`

**Key Differences from Mail Queue:**

- **Mail Queue** (`/sysAdmin/mail-queue`): Email-specific queue (`EmailQueue` model)
- **Message Queue** (`/sysAdmin/message-queue`): Central queue for all channels (`MessageQueue` model)
- Message Queue includes notifications from all channels (on-site, email, LINE, WhatsApp, etc.)
- Message Queue tracks sender/recipient relationships and notification metadata
- Mail Queue is specifically for email delivery with SMTP details

### 2.5 System Notification Dashboard

**Location:** `/sysAdmin/notifications/dashboard`

**Purpose:** Overview of notification system health and statistics.

**Components:**

#### 2.5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Notification System Dashboard                         │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  [Stats Cards]                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Total    │  │ Pending  │  │ Failed   │            │
│  │ 1,234    │  │ 45       │  │ 12       │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  Channel Distribution (Last 24 Hours)                  │
│  ───────────────────────────────────────────────────  │
│  [Bar Chart: Email, LINE, SMS, etc.]                  │
│                                                         │
│  Recent Activity                                        │
│  ───────────────────────────────────────────────────  │
│  [Table: Recent notifications with status]            │
│                                                         │
│  System Health                                         │
│  ───────────────────────────────────────────────────  │
│  Queue Size: 45                                        │
│  Average Processing Time: 1.2s                         │
│  Success Rate: 98.5%                                   │
└─────────────────────────────────────────────────────────┘
```

**Metrics:**

- Total notifications sent (last 24h, 7d, 30d)
- Pending notifications count
- Failed notifications count
- Success rate percentage
- Channel distribution chart
- Queue size and processing time
- Recent activity feed

### 2.6 Send System Notification

**Location:** `/sysAdmin/notifications/send`

**Purpose:** Send system-wide notifications to all users or specific user groups.

**Components:**

#### 2.6.1 Send Notification Form

```
┌─────────────────────────────────────────────────────────┐
│  Send System Notification                               │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  Recipients                                             │
│  ───────────────────────────────────────────────────  │
│  ○ All Users                                           │
│  ● Selected Users                                      │
│     [User Search/Select Component]                     │
│                                                         │
│  Channels                                               │
│  ───────────────────────────────────────────────────  │
│  ☑ On-Site  ☑ Email  ☐ LINE  ☐ SMS                   │
│                                                         │
│  Notification Details                                   │
│  ───────────────────────────────────────────────────  │
│  Subject:        [________________________]            │
│  Message:        [________________________]            │
│                  [________________________]            │
│                                                         │
│  Template:       [Select Template ▼]                   │
│  Priority:      [Normal ▼]                             │
│  Action URL:     [________________________]             │
│                                                         │
│  [Send Notification]  [Save as Draft]                  │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Recipient selection (all users, specific users, user groups)
- Channel selection (multi-select checkboxes)
- Template selection dropdown
- Priority selection (Normal, High, Urgent)
- Action URL for deep linking
- Preview before sending
- Save as draft functionality

---

## 3. Store Admin UI

### 3.1 Store Notification Settings

**Location:** `/storeAdmin/[storeId]/notifications/settings`

**Purpose:** Configure notification channels and preferences for the store.

**Components:**

#### 3.1.1 Settings Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Notification Settings                                   │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  Channel Configuration                                  │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  On-Site Notifications                                  │
│  ───────────────────────────────────────────────────  │
│  ☑ Enabled (Built-in - Always Available)               │
│  (Cannot be disabled - core functionality)             │
│                                                         │
│  Email Notifications                                    │
│  ───────────────────────────────────────────────────  │
│  ☑ Enabled (Built-in - Always Available)               │
│  (Cannot be disabled - uses system SMTP configuration) │
│                                                         │
│  LINE Messaging (Plugin)                                │
│  ───────────────────────────────────────────────────  │
│  System Status: [Disabled by System Admin]              │
│  ☐ Enabled (Store-level - only if enabled by system)   │
│  Channel ID:        [________________________]          │
│  Channel Secret:    [________________________]          │
│  Access Token:      [________________________]          │
│  [Test Connection]                                     │
│  Note: Plugin must be enabled by System Admin first     │
│                                                         │
│  WhatsApp Business (Plugin)                             │
│  ───────────────────────────────────────────────────  │
│  System Status: [Enabled by System Admin]               │
│  ☐ Enabled (Store-level)                                │
│  Phone Number ID:   [________________________]          │
│  Access Token:      [________________________]         │
│  [Test Connection]                                     │
│                                                         │
│  [Save Settings]                                       │
└─────────────────────────────────────────────────────────┘
```

**Channel Configuration:**

**Built-in Channels (On-Site, Email):**

- Always enabled and cannot be disabled
- No enable/disable toggle shown
- Display status as "Always Available"
- On-Site: No configuration needed
- Email: Uses system SMTP configuration

**Plugin Channels (LINE, WhatsApp, WeChat, SMS, Telegram, Push):**

- **System Status Indicator**: Shows if plugin is enabled/disabled by System Admin
- **Enable/Disable Toggle**: Store-level toggle (only enabled if System Admin has enabled the plugin)
- **Credentials Fields**: Encrypted input fields for API keys/tokens
- **Settings Fields**: Channel-specific configuration
- **Test Connection Button**: Verify credentials work
- **Status Indicator**: Show connection status (Connected, Disconnected, Error)
- **Note**: Store admins can only enable plugins that have been enabled by System Admin

**Implementation:**

- Server component: `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/notifications/settings/page.tsx`
- Client component: `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/notifications/settings/components/client-settings.tsx`
- Form component: `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/notifications/settings/components/channel-config-form.tsx`
- Server action: `src/actions/storeAdmin/notification/update-channel-config.ts`

### 3.2 Store Notification Templates

**Location:** `/storeAdmin/[storeId]/notifications/templates`

**Purpose:** Manage store-specific notification templates.

**Components:**

#### 3.2.1 Template List Page

Similar to `/sysAdmin/mail-templates` but:

- Only shows templates for the current store (or global templates)
- Store admins can create/edit store-specific templates
- Store admins can edit global templates - when edited, saves as store's own copy
- Filter by template type
- Filter by global vs store-specific

**Template Edit Dialog:**

- Same fields as system admin template editor
- `isGlobal` field is read-only (always false for store templates)
- `storeId` is automatically set to current store

### 3.3 Send Notification

**Location:** `/storeAdmin/[storeId]/notifications/send`

**Purpose:** Send notifications to customers or staff.

**Components:**

#### 3.3.1 Send Notification Form

```
┌─────────────────────────────────────────────────────────┐
│  Send Notification                                      │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  Recipients                                             │
│  ───────────────────────────────────────────────────  │
│  ○ Single Customer                                     │
│     [Customer Search/Select]                            │
│  ● Multiple Customers                                  │
│     [Customer Multi-Select]                             │
│  ○ All Store Customers                                 │
│                                                         │
│  Channels                                               │
│  ───────────────────────────────────────────────────  │
│  ☑ On-Site  ☑ Email  ☐ LINE  ☐ SMS                   │
│  (Only enabled channels shown)                         │
│                                                         │
│  Notification Details                                   │
│  ───────────────────────────────────────────────────  │
│  Type:          [Order ▼]                               │
│  Subject:       [________________________]              │
│  Message:       [Rich Text Editor]                      │
│                                                         │
│  Template:      [Select Template ▼]                     │
│  Priority:      [Normal ▼]                              │
│  Action URL:    [________________________]              │
│                                                         │
│  [Send Notification]  [Preview]  [Save as Draft]       │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Customer selection (single, multiple, or all)
- Channel selection (only enabled channels)
- Notification type selection (Order, Reservation, Credit, Payment, System, Marketing)
- Template selection with variable preview
- Rich text editor for message content
- Priority selection
- Action URL for deep linking
- Preview before sending
- Save as draft

### 3.4 Notification History

**Location:** `/storeAdmin/[storeId]/notifications/history`

**Purpose:** View sent notifications and their delivery status.

**Components:**

#### 3.4.1 History Table

**Columns:**

- **Date/Time**: When notification was sent
- **Recipient**: Customer name/email
- **Subject**: Notification subject
- **Type**: Notification type badge
- **Channels**: Channel badges with status
- **Status**: Overall delivery status
- **Actions**: View details, Resend, Delete

**Filters:**

- Date range picker
- Recipient search
- Notification type filter
- Status filter (All, Sent, Delivered, Failed)
- Channel filter

**Features:**

- Sortable columns
- Pagination
- Export to CSV
- Bulk actions (resend failed, delete)

### 3.5 Notification Preferences Management

**Location:** `/storeAdmin/[storeId]/notifications/preferences`

**Purpose:** Manage default notification preferences for the store.

**Components:**

#### 3.5.1 Preferences Page

```text
┌─────────────────────────────────────────────────────────┐
│  Store Notification Preferences                         │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  Default Channel Preferences                            │
│  ───────────────────────────────────────────────────  │
│  ☑ On-Site  ☑ Email  ☐ LINE  ☐ SMS                   │
│                                                         │
│  Default Notification Type Preferences                 │
│  ───────────────────────────────────────────────────  │
│  ☑ Order Notifications                                 │
│  ☑ Reservation Notifications                           │
│  ☑ Credit Notifications                                │
│  ☑ Payment Notifications                               │
│  ☑ System Notifications                                │
│  ☐ Marketing Notifications                             │
│                                                         │
│  Default Frequency                                     │
│  ───────────────────────────────────────────────────  │
│  ○ Immediate                                           │
│  ○ Daily Digest                                        │
│  ○ Weekly Digest                                       │
│                                                         │
│  [Save Preferences]                                    │
└─────────────────────────────────────────────────────────┘
```

**Purpose:**

- Set default preferences for new customers
- Customers can override these preferences in their account settings
- Used when customer has no specific preferences set

---

## 4. User-Facing UI

### 4.1 Notification Center (Bell Icon)

**Location:** Global navigation (all authenticated pages) -  `src/components/notification/dropdown-notification.tsx`

**Purpose:** Real-time notification display and management.

**Components:**

#### 4.1.1 Notification Bell Component

**Facebook-style Bell Icon:**

```text
┌─────────────────────────────────────────┐
│  🔔                                      │
│    ●  (small red dot when unread)       │
└─────────────────────────────────────────┘
```

**Visual Design:**

- Clean, minimal bell icon (no visible button background)
- Small red dot/badge at top-right corner when unread notifications exist
- Badge shows count number for counts 10-99, "99+" for counts over 99
- Hover effect: subtle background color change
- Positioned in global navigation header

**Features:**

- Minimal icon design matching Facebook's notification bell
- Small red indicator dot/badge showing unread count
- Click opens notification dropdown
- Real-time updates via SWR polling (every 30 seconds)
- Accessible with proper ARIA labels

#### 4.1.2 Notification Dropdown

```text
┌─────────────────────────────────────────────────────────┐
│  Notifications                              [View All]  │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  ● Order Confirmed                                      │
│    Your order #12345 has been confirmed                 │
│    2 minutes ago                                        │
│                                                         │
│  ○ Reservation Reminder                                 │
│    Your reservation is tomorrow at 2:00 PM              │
│    1 hour ago                                           │
│                                                         │
│  ○ Credit Added                                         │
│    You received 100 credit points                       │
│    3 hours ago                                          │
│                                                         │
│  [Mark All as Read]                                     │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- List of recent notifications (last 10-20)
- Unread indicator (● for unread, ○ for read)
- Timestamp relative to now
- Click notification opens detail or action URL
- "Mark All as Read" button
- "View All" link to full notification center

### 4.2 Notification Center Page

**Location:** `/account/notifications`

**Purpose:** Full notification history and management.

**Components:**

#### 4.2.1 Notification Center Layout

```text
┌─────────────────────────────────────────────────────────┐
│  Notifications                              [Settings]  │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  [Filters]                                              │
│  All  Unread  Orders  Reservations  System              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ● Order Confirmed                    [Delete]   │  │
│  │   Your order #12345 has been confirmed          │  │
│  │   2 minutes ago                                   │  │
│  │   [View Order]                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ○ Reservation Reminder               [Delete]   │  │
│  │   Your reservation is tomorrow at 2:00 PM         │  │
│  │   1 hour ago                                      │  │
│  │   [View Reservation]                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Load More]                                            │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Filter by status (All, Unread, Read)
- Filter by type (All, Orders, Reservations, Credit, Payment, System, Marketing)
- Notification cards with:
  - Subject and message preview
  - Timestamp
  - Read/unread indicator
  - Action button (if actionUrl provided)
  - Delete button
- Infinite scroll or pagination
- Mark as read on click
- Bulk actions (Mark all as read, Delete selected)

### 4.3 Notification Preferences

**Location:** `/account/notifications/preferences`

**Purpose:** User notification preference management.

**Components:**

#### 4.3.1 Preferences Page Layout

```text
┌─────────────────────────────────────────────────────────┐
│  Notification Preferences                                │
│  ───────────────────────────────────────────────────  │
│                                                         │
│  Channel Preferences                                    │
│  ───────────────────────────────────────────────────  │
│  ☑ On-Site Notifications                               │
│  ☑ Email Notifications                                 │
│  ☐ LINE Notifications                                  │
│  ☐ WhatsApp Notifications                              │
│  ☐ SMS Notifications                                   │
│  ☐ Push Notifications                                  │
│                                                         │
│  Notification Type Preferences                          │
│  ───────────────────────────────────────────────────  │
│  ☑ Order Notifications                                 │
│  ☑ Reservation Notifications                           │
│  ☑ Credit Notifications                                │
│  ☑ Payment Notifications                               │
│  ☑ System Notifications                                │
│  ☐ Marketing Notifications                             │
│                                                         │
│  Frequency                                              │
│  ───────────────────────────────────────────────────  │
│  ○ Immediate                                           │
│  ○ Daily Digest                                        │
│  ○ Weekly Digest                                       │
│                                                         │
│  Store-Specific Preferences                            │
│  ───────────────────────────────────────────────────  │
│  [Store Name]                                          │
│  ☑ On-Site  ☑ Email  ☐ LINE                           │
│  (Override global preferences for this store)         │
│                                                         │
│  [Save Preferences]                                     │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Global preferences (apply to all stores)
- Store-specific preferences (override global for specific stores)
- Channel enable/disable
- Notification type preferences
- Frequency selection (Immediate, Daily Digest, Weekly Digest)
- Save button with success/error feedback

---

## 5. Component Specifications

### 5.1 Notification Card Component

**Location:** `src/components/notification/notification-card.tsx`

**Props:**

```typescript
interface NotificationCardProps {
  notification: {
    id: string;
    subject: string;
    message: string;
    notificationType: string | null;
    actionUrl: string | null;
    createdAt: bigint;
    isRead: boolean;
  };
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}
```

**Features:**

- Displays subject and message
- Shows unread indicator
- Relative timestamp (e.g., "2 minutes ago")
- Action button if actionUrl provided
- Delete button (if showActions)
- Click to mark as read

### 5.2 Notification Bell Component

**Location:** `src/components/notification/notification-bell.tsx`

**Props:**

```typescript
interface NotificationBellProps {
  unreadCount: number;
  onOpen?: () => void;
}
```

**Features:**

- Badge with unread count
- Dropdown with recent notifications
- Real-time updates
- Click outside to close

### 5.3 Channel Status Badge Component

**Location:** `src/components/notification/channel-status-badge.tsx`

**Props:**

```typescript
interface ChannelStatusBadgeProps {
  channel: NotificationChannel;
  status: DeliveryStatus;
  size?: "sm" | "md" | "lg";
}
```

**Features:**

- Color-coded status badges
- Channel icon/name
- Status text (Pending, Sent, Delivered, Failed)
- Tooltip on hover with details

### 5.4 Template Variable Preview Component

**Location:** `src/components/notification/template-variable-preview.tsx`

**Purpose:** Show available variables when editing templates.

**Features:**

- List of available variables based on notification context
- Variable syntax helper ({{variable.name}})
- Preview with sample data
- Copy variable syntax to clipboard

---

## 6. Data Tables

### 6.1 Notification History Table

**Location:** Used in both sysAdmin and storeAdmin

**Columns:**

1. **Date/Time**: Sortable, formatted timestamp
2. **Recipient**: User name/email (link to user profile)
3. **Subject**: Notification subject (truncated with tooltip)
4. **Type**: Badge with notification type
5. **Channels**: Channel status badges
6. **Status**: Overall status badge
7. **Actions**: Dropdown menu (View, Resend, Delete)

**Features:**

- Search by recipient, subject
- Filter by type, status, channel
- Sortable columns
- Pagination
- Row selection for bulk actions
- Export to CSV

### 6.2 Template List Table

**Location:** `/sysAdmin/mail-templates` and `/storeAdmin/[storeId]/notifications/templates`

**Columns:**

1. **Name**: Template name (editable inline)
2. **Type**: Template type badge
3. **Global**: Global/Store indicator
4. **Store**: Store name (if store-specific)
5. **Localized Count**: Number of localized versions
6. **Actions**: Edit, Delete, Copy

**Features:**

- Filter by type, global/store
- Search by name
- Sortable columns
- Inline editing for name
- Bulk operations

---

## 7. Forms and Dialogs

### 7.1 Send Notification Dialog

**Pattern:** Follows existing dialog pattern (Drawer on mobile, Dialog on desktop)

**Sections:**

1. **Recipient Selection**
   - Single customer search/select
   - Multiple customer multi-select
   - All customers option

2. **Channel Selection**
   - Checkboxes for enabled channels
   - Disabled channels shown but grayed out

3. **Notification Details**
   - Type dropdown
   - Subject input
   - Message rich text editor
   - Template selector
   - Priority selector
   - Action URL input

4. **Actions**
   - Send button
   - Preview button
   - Save as draft button
   - Cancel button

### 7.2 Channel Configuration Dialog

**Pattern:** Drawer/Dialog for editing channel credentials

**Sections:**

1. **Enable/Disable Toggle**
2. **Credentials Fields** (encrypted inputs)
3. **Settings Fields** (channel-specific)
4. **Test Connection Button**
5. **Status Indicator**

**Validation:**

- Required fields validation
- Credential format validation
- Connection test before save

### 7.3 Template Edit Dialog

**Pattern:** Existing template edit dialog (enhanced)

**New Fields:**

- Template Type dropdown
- Global Template checkbox
- Store dropdown (conditional)

**Validation:**

- Template name uniqueness (per store or global)
- Template type required
- Store required if not global

---

## 8. Real-time Updates

### 8.1 WebSocket/SSE Integration

**Implementation:**

- Notification bell updates in real-time
- Notification center page auto-refreshes
- Delivery status updates in admin pages

**Connection Management:**

- Auto-reconnect on disconnect
- Heartbeat to keep connection alive
- Fallback to polling if WebSocket unavailable

### 8.2 Notification Badge Updates

**Behavior:**

- Badge count updates immediately when new notification arrives
- Badge count decreases when notification marked as read
- Visual animation on new notification

---

## 9. Mobile Optimization

### 9.1 Responsive Design

**Breakpoints:**

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**

- Drawer instead of dialog for forms
- Stacked form fields
- Touch-friendly button sizes (44x44px minimum)
- Swipe actions on notification cards
- Bottom sheet for notification details

### 9.2 Touch Interactions

- Swipe left on notification card to delete
- Swipe right to mark as read
- Pull to refresh in notification center
- Long press for bulk selection

---

## 10. Accessibility

### 10.1 ARIA Labels

- Notification bell: `aria-label="Notifications"`, `aria-live="polite"`
- Unread badge: `aria-label="X unread notifications"`
- Notification cards: `role="article"`, `aria-label="Notification"`
- Action buttons: Descriptive labels

### 10.2 Keyboard Navigation

- Tab through notification cards
- Enter/Space to open notification
- Escape to close dialogs
- Arrow keys to navigate notification list

### 10.3 Screen Reader Support

- Announce new notifications
- Describe notification content
- Indicate read/unread status
- Announce actions (mark as read, delete)

---

## 11. Error Handling

### 11.1 Error States

**Connection Errors:**

- Show error message: "Unable to connect to notification service"
- Retry button
- Fallback to polling

**Send Errors:**

- Show specific error message
- Highlight problematic fields
- Suggest fixes
- Allow retry

**Permission Errors:**

- Show: "You don't have permission to perform this action"
- Link to contact admin

### 11.2 Loading States

- Skeleton loaders for notification lists
- Spinner for send operations
- Progress indicator for bulk operations
- Disabled state during operations

---

## 12. Implementation Checklist

### 12.1 System Admin UI

- [x] System notification settings page
- [ ] Enhanced global template management
- [ ] Enhanced mail queue monitoring
- [x] Message queue management (`/sysAdmin/message-queue`)
- [x] Notification dashboard
- [x] Send system notification page
- [ ] Server actions for all operations

### 12.2 Store Admin UI

- [ ] Store notification settings page
- [ ] Channel configuration forms
- [ ] Store template management
- [ ] Send notification page
- [ ] Notification history page
- [ ] Preferences management page
- [ ] Server actions for all operations

### 12.3 User-Facing UI

- [ ] Notification bell component
- [ ] Notification dropdown
- [ ] Notification center page
- [ ] Notification preferences page
- [ ] Notification card component
- [ ] Real-time updates integration

### 12.4 Shared Components

- [ ] Channel status badge
- [ ] Template variable preview
- [ ] Notification filters
- [ ] Notification table columns
- [ ] Common dialogs and forms

---

## 13. Design Patterns

### 13.1 Follow Existing Patterns

**Reference Implementations:**

- Tables: `/storeAdmin/[storeId]/tables` (canonical CRUD pattern)
- Settings: `/storeAdmin/[storeId]/settings` (settings form pattern)
- Templates: `/sysAdmin/mail-templates` (template management pattern)
- Email Queue: `/sysAdmin/mail-queue` (email queue monitoring pattern)
- Message Queue: `/sysAdmin/message-queue` (central message queue pattern)

### 13.2 Component Reuse

**Reusable Components:**

- `DataTable` for notification lists
- `DataTableCheckbox` for bulk selection
- `EditDialog` pattern for forms
- `Filter` component for filtering
- `Badge` for status indicators
- `Button` with loading states

### 13.3 State Management

**Pattern:**

- Server components for data fetching
- Client components for interactivity
- Local state for UI state (open/closed, selected items)
- Server actions for mutations
- Callbacks for parent-child communication

---

## 14. API Integration

### 14.1 Server Actions

**System Admin:**

- `updateSystemNotificationSettings`
- `sendSystemNotification`
- `getNotificationStatistics`

**Store Admin:**

- `updateChannelConfig`
- `sendNotification`
- `getNotificationHistory`
- `updateStorePreferences`

**User:**

- `markNotificationAsRead`
- `deleteNotification`
- `updateUserPreferences`

### 14.2 API Routes

**Real-time:**

- `/api/notifications/stream` - SSE endpoint
- `/api/notifications/ws` - WebSocket endpoint

**Callbacks:**

- `/api/notifications/callback/line` - LINE webhook
- `/api/notifications/callback/whatsapp` - WhatsApp webhook
- `/api/notifications/callback/sms` - SMS provider webhook

---

## 15. Testing Considerations

### 15.1 UI Testing

- Form validation
- Error handling
- Loading states
- Real-time updates
- Mobile responsiveness
- Accessibility

### 15.2 Integration Testing

- Send notification flow
- Channel configuration
- Template rendering
- Preference application
- Delivery tracking

---

## 16. Future Enhancements

### 16.1 Advanced Features

- Notification scheduling UI
- Bulk notification composer
- Notification analytics dashboard
- A/B testing for notification content
- Notification templates marketplace

### 16.2 UX Improvements

- Notification grouping (e.g., "3 new order notifications")
- Smart notification prioritization
- Notification snooze functionality
- Custom notification sounds
- Desktop push notifications

---

## Summary

This UI design document provides comprehensive specifications for implementing the notification system user interfaces across System Admin, Store Admin, and User-facing pages. All components follow existing design patterns and coding standards, ensuring consistency and maintainability.

**Key Design Decisions:**

1. **Consistency**: Reuse existing table, form, and dialog patterns
2. **Efficiency**: Minimize clicks with inline editing and bulk actions
3. **Clarity**: Clear visual hierarchy and status indicators
4. **Mobile-First**: Responsive design with touch-friendly interactions
5. **Accessibility**: Full ARIA support and keyboard navigation
6. **Real-time**: WebSocket/SSE for live updates
7. **Extensibility**: Component-based architecture for easy enhancement

The implementation should follow the existing CRUD patterns and component structures established in the codebase, particularly the tables and settings management patterns.
