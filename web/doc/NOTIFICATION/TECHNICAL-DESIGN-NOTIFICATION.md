# Technical Design: Notification System

**Date:** 2025-01-27
**Status:** Design
**Version:** 1.0

**Related Documents:**

- [Functional Requirements: Notification System](./FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)
- [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md)
- [RSVP Technical Requirements](../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)
- [Credit System Design](../CREDIT/DESIGN-CUSTOMER-CREDIT.md)

---

## 1. Technical Overview

The Notification System is a multi-channel notification infrastructure built on Next.js 15 App Router that provides real-time and queued notification delivery across multiple channels. The system is designed to be scalable, extensible, and maintainable, supporting both synchronous and asynchronous notification patterns.

### 1.1 System Architecture

The notification system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                         │
│  (Next.js App Router - Server/Client Components)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Application Layer                         │
│  (Server Actions, Business Logic, Validation)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Service Layer                             │
│  (Notification Service, Queue Manager, Channel Adapters)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Data Layer                                │
│  (Prisma ORM, PostgreSQL, Queue Storage)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    External Services                         │
│  (SMTP, LINE API, WhatsApp API, SMS Providers, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Core Components

1. **Notification Service**: Core service for creating, managing, and sending notifications
2. **Queue Manager**: Handles asynchronous notification processing
3. **Channel Adapters**: Abstraction layer for different notification channels
   - **Built-in Channels**: On-site and Email (always available, cannot be disabled)
   - **Plugin Channels**: LINE, WhatsApp, WeChat, SMS, Telegram, Push (implemented as plugins, can be enabled/disabled)
4. **Plugin System**: Extensible architecture for external notification channels
5. **Template Engine**: Processes notification templates with variable substitution
6. **Preference Manager**: Manages user and store notification preferences
7. **Delivery Tracker**: Monitors and tracks notification delivery status
8. **Real-time Service**: WebSocket/SSE service for on-site notifications

### 1.3 Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 15+ with Prisma ORM v7
- **Authentication:** Better Auth
- **Validation:** Zod v4
- **State Management:** React Server Components (default), Client Components with local state
- **Real-time:** WebSocket or Server-Sent Events (SSE)
- **Queue Processing:** Background job processing (cron jobs or queue workers)
- **Email:** Nodemailer with SMTP
- **External APIs:** LINE Messaging API, WhatsApp Business API, WeChat Official Account API, Telegram Bot API, SMS providers (Twilio, AWS SNS, Vonage), FCM/APNs for push notifications
- **Package Manager:** Bun
- **UI Framework:** React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- **Icons:** @tabler/icons-react

---

## 2. System Architecture and Components

### 2.1 Component Architecture

#### 2.1.1 Notification Service

The Notification Service is the core component that orchestrates notification creation, processing, and delivery.

**Location:** `src/lib/notification/notification-service.ts`

**Responsibilities:**

- Create notifications (on-site, email, external channels)
- Validate notification content and permissions
- Route notifications to appropriate channels
- Manage notification state (pending, sent, failed)
- Coordinate with queue manager for asynchronous delivery
- Handle notification preferences and opt-outs

**Key Methods:**

```typescript
interface NotificationService {
  createNotification(input: CreateNotificationInput): Promise<Notification>;
  sendNotification(notificationId: string): Promise<DeliveryResult>;
  sendBulkNotifications(input: BulkNotificationInput): Promise<BulkResult>;
  getNotificationStatus(notificationId: string): Promise<NotificationStatus>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string, type: 'sender' | 'recipient'): Promise<void>;
}
```

#### 2.1.2 Queue Manager

The Queue Manager handles asynchronous notification processing to avoid blocking user requests.

**Location:** `src/lib/notification/queue-manager.ts`

**Responsibilities:**

- Add notifications to processing queue
- Process queued notifications in batches
- Retry failed notifications with exponential backoff
- Manage queue priorities
- Handle queue persistence and recovery

**Queue Types:**

- **Email Queue**: `EmailQueue` model in database
- **External Channel Queue**: Separate queues per channel (LINE, WhatsApp, SMS, etc.)
- **On-site Queue**: In-memory queue for real-time delivery

**Processing Strategy:**

- Batch processing for performance
- Parallel processing for multiple channels
- Rate limiting to prevent API throttling
- Priority queuing for urgent notifications

#### 2.1.3 Channel Adapters

Channel Adapters provide a unified interface for different notification channels while abstracting channel-specific implementations.

**Location:** `src/lib/notification/channels/`

**Channel Adapter Interface:**

```typescript
interface NotificationChannel {
  name: string;
  send(notification: Notification, config: ChannelConfig): Promise<DeliveryResult>;
  validateConfig(config: ChannelConfig): ValidationResult;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  isEnabled(storeId: string): Promise<boolean>;
}
```

**Channel Types:**

1. **Built-in Channels (Always Available, Cannot Be Disabled):**
   - `OnSiteChannel`: Real-time in-app notifications
   - `EmailChannel`: SMTP email delivery
   - These channels are core functionality and always enabled
   - No plugin system required - implemented directly in the codebase

2. **Plugin Channels (Can Be Enabled/Disabled by System Admin):**
   - `LineChannel`: LINE Messaging API (plugin)
   - `WhatsAppChannel`: WhatsApp Business API (plugin)
   - `WeChatChannel`: WeChat Official Account API (plugin)
   - `SmsChannel`: SMS provider abstraction (Twilio, AWS SNS, etc.) (plugin)
   - `TelegramChannel`: Telegram Bot API (plugin)
   - `PushChannel`: FCM/APNs push notifications (plugin)
   - All external channels must be implemented as plugins
   - System admins can enable/disable plugins system-wide
   - Store admins can enable/disable plugins for their store (only if enabled by system admin)

**Channel Configuration:**

Each channel requires store-specific configuration stored in the database:

```typescript
interface ChannelConfig {
  storeId: string;
  enabled: boolean; // For plugin channels only - built-in channels are always enabled
  credentials: Record<string, string>; // Encrypted API keys/tokens
  settings: Record<string, any>; // Channel-specific settings
}
```

**Built-in Channel Behavior:**

- Built-in channels (on-site, email) are always available
- `isEnabled()` always returns `true` for built-in channels
- No enable/disable configuration exists for built-in channels
- These channels are not registered in the plugin system

**Plugin Channel Behavior:**

- Plugin channels must be registered in the plugin registry
- System admins can enable/disable plugins system-wide
- Store admins can enable/disable plugins for their store (only if system admin has enabled it)
- Plugin channels check both system-wide and store-level enable/disable status

#### 2.1.4 Template Engine

The Template Engine processes notification templates with variable substitution and localization.

**Location:** `src/lib/notification/template-engine.ts`

**Responsibilities:**

- Load templates from database (`MessageTemplate`, `MessageTemplateLocalized`)
- Substitute variables in template content
- Apply localization based on user/store locale
- Validate template syntax
- Support nested templates and inheritance

**Template Processing:**

```typescript
interface TemplateEngine {
  render(templateId: string, locale: string, variables: Record<string, any>): Promise<RenderedTemplate>;
  validateTemplate(template: string): ValidationResult;
  getAvailableVariables(context: NotificationContext): string[];
}
```

**Variable Substitution:**

- `{{user.name}}` - User name
- `{{user.email}}` - User email
- `{{store.name}}` - Store name
- `{{order.id}}` - Order ID
- `{{order.total}}` - Order total
- `{{reservation.date}}` - Reservation date
- Custom variables based on notification context

#### 2.1.5 Preference Manager

The Preference Manager handles user and store notification preferences.

**Location:** `src/lib/notification/preference-manager.ts`

**Responsibilities:**

- Load user notification preferences
- Load store default preferences
- Check if notification should be sent based on preferences
- Merge user and store preferences
- Handle opt-in/opt-out logic

**Preference Hierarchy:**

1. System-wide disable (overrides all)
2. Store-level method enable/disable
3. User preferences
4. Store default preferences

#### 2.1.6 Delivery Tracker

The Delivery Tracker monitors and tracks notification delivery status across all channels.

**Location:** `src/lib/notification/delivery-tracker.ts`

**Responsibilities:**

- Track delivery status (pending, sent, delivered, read, failed)
- Update status in real-time when available
- Store delivery timestamps
- Provide delivery analytics
- Handle delivery callbacks from external services

#### 2.1.7 Real-time Service

The Real-time Service provides WebSocket or SSE connections for on-site notifications.

**Location:** `src/lib/notification/realtime-service.ts`

**Responsibilities:**

- Establish WebSocket/SSE connections with authenticated users
- Push notifications to connected clients in real-time
- Handle connection management (connect, disconnect, reconnect)
- Broadcast notifications to multiple recipients
- Manage connection state and recovery

**Implementation Options:**

- **WebSocket**: Full-duplex communication, better for interactive features
- **Server-Sent Events (SSE)**: Simpler, unidirectional, good for notification-only use case

---

### 2.2 Database Schema

#### 2.2.1 MessageQueue Model

Stores notifications in a queue for processing and delivery across all channels.

```prisma
model MessageQueue {
  id          String  @id @default(uuid())
  senderId    String
  recipientId String
  storeId     String?
  subject     String
  message     String
  createdAt   BigInt  // Epoch milliseconds
  updatedAt   BigInt  // Epoch milliseconds
  sendTries   Int     @default(0)
  sentOn      BigInt? // Epoch milliseconds (null for on-site notifications)
  
  // Notification metadata
  notificationType String?  // e.g., "order", "reservation", "credit", "system"
  actionUrl        String?  // Deep link URL for action buttons
  priority         Int      @default(0) // 0=normal, 1=high, 2=urgent
  
  // Status flags
  isRead               Boolean @default(false)
  isDeletedByAuthor    Boolean @default(false)
  isDeletedByRecipient Boolean @default(false)
  
  // Relations
  Sender    User @relation("NotificationFrom", fields: [senderId], references: [id])
  Recipient User @relation("NotificationTo", fields: [recipientId], references: [id])
  Store     Store? @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@index([storeId])
  @@index([senderId])
  @@index([recipientId])
  @@index([sendTries])
  @@index([createdAt])
  @@index([updatedAt])
  @@index([isRead])
  @@index([notificationType])
  // Composite indexes for common queries
  @@index([recipientId, isRead, createdAt]) // For user notification center
  @@index([storeId, createdAt]) // For store notification history
}
```

**Key Points:**

- `createdAt`, `updatedAt`, `sentOn` use `BigInt` epoch time (milliseconds)
- Soft delete via `isDeletedByAuthor` and `isDeletedByRecipient`
- Supports action URLs for deep linking
- Priority field for urgent notifications
- Used as the central queue for all notification channels (on-site, email, LINE, WhatsApp, SMS, etc.)
- Tracks delivery status across multiple channels via `NotificationDeliveryStatus` relation

#### 2.2.2 EmailQueue Model

Stores email notifications in queue for asynchronous processing.

```prisma
model EmailQueue {
  id          String  @id @default(uuid())
  from        String
  fromName    String  @default("")
  to          String
  toName      String  @default("")
  cc          String  @default("")
  bcc         String  @default("")
  subject     String
  textMessage String
  htmMessage  String
  createdOn   BigInt  // Epoch milliseconds
  sendTries   Int     @default(0)
  sentOn      BigInt? // Epoch milliseconds
  
  // Email metadata
  storeId         String?
  notificationId  String? // Link to MessageQueue if applicable
  templateId      String? // Link to MessageTemplate if applicable
  priority        Int     @default(0)
  
  // Relations
  Store          Store? @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Notification   MessageQueue? @relation(fields: [notificationId], references: [id], onDelete: SetNull)
  Template       MessageTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  
  @@index([sendTries])
  @@index([createdOn])
  @@index([sentOn])
  @@index([from])
  @@index([to])
  @@index([storeId])
  @@index([priority])
  // Composite index for queue processing
  @@index([sendTries, priority, createdOn]) // For queue worker queries
}
```

**Key Points:**

- Supports both plain text and HTML email
- Tracks send attempts for retry logic
- Links to MessageQueue and MessageTemplate for traceability
- Priority field for urgent emails

#### 2.2.3 MessageTemplate and MessageTemplateLocalized Models

Store notification templates with localization support.

```prisma
model MessageTemplate {
  id                       String                     @id @default(uuid())
  name                     String                     // Template identifier (e.g., "order_confirmation")
  templateType             String                     // "email", "line", "sms", "whatsapp", "wechat", "telegram", "push", "onsite"
  isGlobal                 Boolean                    @default(false) // Global template vs store-specific
  storeId                  String?                    // null for global templates
  MessageTemplateLocalized MessageTemplateLocalized[]
  
  Store Store? @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@index([name])
  @@index([templateType])
  @@index([storeId])
  @@unique([name, storeId]) // Unique template name per store (or global)
}

model MessageTemplateLocalized {
  id                String          @id @default(uuid())
  messageTemplateId String
  localeId          String
  bCCEmailAddresses String?         // For email templates
  subject           String         // Subject/title for the notification
  body              String         // Template body with variable placeholders
  isActive          Boolean        @default(true)
  
  Locale          Locale          @relation(fields: [localeId], references: [id], onDelete: Cascade)
  MessageTemplate MessageTemplate @relation(fields: [messageTemplateId], references: [id], onDelete: Cascade)
  
  @@unique([localeId, messageTemplateId])
  @@index([localeId])
  @@index([messageTemplateId])
  @@index([isActive])
}
```

**Key Points:**

- Supports multiple languages per template
- Can be global (system-wide) or store-specific
- Template type indicates which channel it's for
- BCC addresses for email compliance

#### 2.2.4 NotificationPreferences Model (New)

Stores user and store notification preferences.

```prisma
model NotificationPreferences {
  id        String  @id @default(uuid())
  userId    String? // null for store-level preferences
  storeId   String? // null for user-level global preferences
  
  // Channel preferences
  onSiteEnabled    Boolean @default(true)
  emailEnabled     Boolean @default(true)
  lineEnabled      Boolean @default(false)
  whatsappEnabled  Boolean @default(false)
  wechatEnabled    Boolean @default(false)
  smsEnabled       Boolean @default(false)
  telegramEnabled  Boolean @default(false)
  pushEnabled      Boolean @default(false)
  
  // Notification type preferences
  orderNotifications      Boolean @default(true)
  reservationNotifications Boolean @default(true)
  creditNotifications     Boolean @default(true)
  paymentNotifications    Boolean @default(true)
  systemNotifications     Boolean @default(true)
  marketingNotifications  Boolean @default(false)
  
  // Frequency preferences
  frequency String @default("immediate") // "immediate", "daily_digest", "weekly_digest"
  
  createdAt BigInt // Epoch milliseconds
  updatedAt BigInt // Epoch milliseconds
  
  User  User?  @relation(fields: [userId], references: [id], onDelete: Cascade)
  Store Store? @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, storeId]) // One preference record per user-store pair
  @@index([userId])
  @@index([storeId])
}
```

**Key Points:**

- Supports both user-level and store-level preferences
- Per-channel enable/disable
- Per-notification-type preferences
- Frequency control (immediate, digest, weekly)

#### 2.2.5 NotificationChannelConfig Model (New)

Stores store-specific configuration for each external notification channel (plugin channels only).

**Note:** Built-in channels (on-site, email) do not use this model as they are always enabled and cannot be disabled.

```prisma
model NotificationChannelConfig {
  id        String  @id @default(uuid())
  storeId   String
  channel   String  // "line", "whatsapp", "wechat", "sms", "telegram", "push" (plugin channels only)
  enabled   Boolean @default(false) // Store-level enable/disable (only effective if system admin enabled the plugin)
  
  // Encrypted credentials (JSON string, encrypted at application level)
  credentials String? // Encrypted JSON: { apiKey: "...", accessToken: "...", etc. }
  
  // Channel-specific settings (JSON)
  settings   String? // JSON: { phoneNumberId: "...", webhookUrl: "...", etc. }
  
  createdAt  BigInt // Epoch milliseconds
  updatedAt  BigInt // Epoch milliseconds
  
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, channel])
  @@index([storeId])
  @@index([channel])
  @@index([enabled])
}
```

**Key Points:**

- **Only for plugin channels** - Built-in channels (on-site, email) are not stored here
- One record per store per plugin channel
- Credentials stored encrypted
- Settings stored as JSON for flexibility
- Enables store-level plugin channel control
- Store-level `enabled` is only effective if the plugin is enabled system-wide

#### 2.2.6 SystemNotificationSettings Model (New)

Stores system-wide notification settings and plugin enable/disable status.

```prisma
model SystemNotificationSettings {
  id                    String  @id @default(uuid())
  notificationsEnabled  Boolean @default(true) // Master switch (affects all channels)
  
  // Plugin channel enable/disable (system-wide)
  lineEnabled      Boolean @default(false) // LINE plugin enabled
  whatsappEnabled Boolean @default(false) // WhatsApp plugin enabled
  wechatEnabled   Boolean @default(false) // WeChat plugin enabled
  smsEnabled       Boolean @default(false) // SMS plugin enabled
  telegramEnabled Boolean @default(false) // Telegram plugin enabled
  pushEnabled      Boolean @default(false) // Push notification plugin enabled
  
  // Note: Built-in channels (on-site, email) are always enabled and not stored here
  
  maxRetryAttempts      Int     @default(3)
  retryBackoffMs        Int     @default(1000) // Initial backoff in milliseconds
  queueBatchSize        Int     @default(100)
  rateLimitPerMinute    Int     @default(1000)
  historyRetentionDays  Int     @default(90)
  
  updatedAt BigInt // Epoch milliseconds
  updatedBy String // User ID of system admin who last updated
  
  @@unique([id]) // Singleton pattern - only one record
}
```

**Key Points:**

- Singleton pattern (only one record)
- Master switch (`notificationsEnabled`) affects all channels (built-in and plugins)
- Plugin channel enable/disable flags control system-wide plugin availability
- Built-in channels (on-site, email) are always enabled and not stored in this model
- Store admins can only enable/disable plugins for their store if system admin has enabled the plugin
- Configurable retry and rate limiting
- History retention policy

#### 2.2.7 NotificationDeliveryStatus Model (New)

Tracks delivery status for external channel notifications.

```prisma
model NotificationDeliveryStatus {
  id             String  @id @default(uuid())
  notificationId String
  channel        String  // "email", "line", "whatsapp", "sms", etc.
  messageId      String? // External service message ID
  status         String  // "pending", "sent", "delivered", "read", "failed", "bounced"
  errorMessage   String?
  deliveredAt    BigInt? // Epoch milliseconds
  readAt         BigInt? // Epoch milliseconds (if supported by channel)
  createdAt      BigInt  // Epoch milliseconds
  updatedAt      BigInt  // Epoch milliseconds
  
  Notification MessageQueue @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  
  @@index([notificationId])
  @@index([channel])
  @@index([status])
  @@index([createdAt])
  // Composite index for status queries
  @@index([channel, status, createdAt])
}
```

**Key Points:**

- Tracks delivery status per channel per notification
- Stores external service message IDs for status updates
- Supports delivery and read timestamps when available

---

### 2.3 API Design

#### 2.3.1 Server Actions

All notification operations use Next.js Server Actions with `next-safe-action` wrapper.

**Action Client Types:**

- `storeActionClient` - For store admin actions (requires store membership)
- `userRequiredActionClient` - For authenticated user actions
- `adminActionClient` - For system admin actions
- `baseClient` - For public/unauthenticated actions (limited use)

**Action Patterns:**

```typescript
// Pattern: actions/notification/[action-name].ts
export const [actionName]Action = [actionClient]
  .metadata({ name: "[actionName]" })
  .schema([validationSchema])
  .action(async ({ parsedInput, bindArgsClientInputs, ctx }) => {
    // Implementation
  });
```

**Key Actions:**

- `create-notification.ts` - Create and send notification
- `send-bulk-notifications.ts` - Send notifications to multiple recipients
- `mark-notification-read.ts` - Mark notification as read
- `delete-notification.ts` - Delete notification (soft delete)
- `get-notifications.ts` - Get user notifications
- `update-notification-preferences.ts` - Update user preferences
- `enable-disable-channel.ts` - Store admin: enable/disable channel
- `enable-disable-system-notifications.ts` - System admin: master switch
- `get-delivery-status.ts` - Get notification delivery status
- `update-message-queue.ts` - System admin: Create/update message in queue (`/sysAdmin/message-queue`)

#### 2.3.2 API Routes

**Real-time Endpoint:**

- `GET /api/notifications/stream` - SSE endpoint for real-time notifications
- `GET /api/notifications/ws` - WebSocket endpoint (alternative to SSE)

**Webhook Endpoints (for external services):**

- `POST /api/notifications/webhooks/line` - LINE webhook
- `POST /api/notifications/webhooks/whatsapp` - WhatsApp webhook
- `POST /api/notifications/webhooks/telegram` - Telegram webhook
- `POST /api/notifications/webhooks/push` - Push notification callbacks

**Queue Processing:**

- `POST /api/notifications/queue/process` - Process notification queue (called by cron/worker)

**Message Queue Management:**

- `DELETE /api/sysAdmin/messageQueue/[id]` - Delete message from queue (system admin only)

---

### 2.4 Integration Architecture

#### 2.4.1 Channel Architecture

**Built-in Channels (Always Available):**

- **On-site Notifications**: Real-time in-app notifications via WebSocket/SSE
  - Always enabled, cannot be disabled
  - No external service integration required
  - Implemented directly in the codebase

- **Email Notifications**: SMTP email delivery via Nodemailer
  - Always enabled, cannot be disabled
  - Requires SMTP server configuration
  - Implemented directly in the codebase

**Plugin Channels (Can Be Enabled/Disabled):**

All external notification channels are implemented as plugins and can be enabled/disabled by system administrators:

#### 2.4.2 External Service Integration (Plugin Channels)

**LINE Messaging API (Plugin):**

- **Endpoint:** `https://api.line.me/v2/bot/message/push`
- **Authentication:** Bearer token (Channel Access Token)
- **Rate Limits:** 600 messages/second per channel
- **Webhook:** Receives delivery status updates
- **See:** [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md) for user linking (`User.line_userId`), store credentials, templates, and webhook route.

**WhatsApp Business API (Plugin):**

- **Endpoint:** `https://graph.facebook.com/v18.0/{phone-number-id}/messages`
- **Authentication:** Bearer token (Page Access Token)
- **Rate Limits:** 1000 messages/second per phone number
- **Webhook:** Receives delivery and read receipts
- **Implementation:** Plugin-based, can be enabled/disabled by system admin

**WeChat Official Account API (Plugin):**

- **Endpoint:** `https://api.weixin.qq.com/cgi-bin/message/template/send`
- **Authentication:** Access Token (refreshed periodically)
- **Rate Limits:** 100,000 calls/day
- **Webhook:** Receives user interactions
- **Implementation:** Plugin-based, can be enabled/disabled by system admin

**SMS Providers (Plugin):**

- **Twilio:** REST API with account SID and auth token
- **AWS SNS:** AWS SDK with IAM credentials
- **Vonage:** REST API with API key and secret
- **Abstraction:** Unified SMS provider interface
- **Implementation:** Plugin-based, can be enabled/disabled by system admin

**Telegram Bot API (Plugin):**

- **Endpoint:** `https://api.telegram.org/bot{token}/sendMessage`
- **Authentication:** Bot token
- **Rate Limits:** 30 messages/second per bot
- **Webhook:** Receives updates via long polling or webhook
- **Implementation:** Plugin-based, can be enabled/disabled by system admin

**Push Notifications (Plugin):**

- **FCM (Android):** Firebase Cloud Messaging REST API
- **APNs (iOS):** Apple Push Notification Service HTTP/2 API
- **Abstraction:** Unified push notification service
- **Implementation:** Plugin-based, can be enabled/disabled by system admin

#### 2.4.3 Plugin Integration Pattern

All external integrations follow the plugin adapter pattern:

```typescript
// Base channel adapter (for both built-in and plugin channels)
abstract class BaseChannelAdapter implements NotificationChannel {
  abstract name: string;
  abstract send(notification: Notification, config: ChannelConfig): Promise<DeliveryResult>;
  
  protected async validateAndSend(
    notification: Notification,
    config: ChannelConfig
  ): Promise<DeliveryResult> {
    // Common validation
    // Rate limiting
    // Error handling
    // Status tracking
  }
}

// Built-in channel implementations (always available)
class OnSiteChannelAdapter extends BaseChannelAdapter {
  name = 'onsite';
  // Always enabled, no enable/disable check needed
}

class EmailChannelAdapter extends BaseChannelAdapter {
  name = 'email';
  // Always enabled, no enable/disable check needed
}

// Plugin channel implementations (can be enabled/disabled)
class LineChannelAdapter extends BaseChannelAdapter implements NotificationPlugin {
  name = 'line';
  async send(notification: Notification, config: ChannelConfig): Promise<DeliveryResult> {
    // Check if plugin is enabled system-wide and store-level
    if (!await this.isSystemEnabled()) {
      throw new Error('LINE plugin is disabled system-wide');
    }
    if (!await this.isStoreEnabled(config.storeId)) {
      throw new Error('LINE plugin is disabled for this store');
    }
    // LINE-specific implementation
  }
  
  async isSystemEnabled(): Promise<boolean> {
    // Check SystemNotificationSettings.lineEnabled
  }
  
  async isStoreEnabled(storeId: string): Promise<boolean> {
    // Check NotificationChannelConfig for store
  }
}
```

**Plugin Registration:**

```typescript
// Plugin registry
class PluginRegistry {
  private plugins: Map<string, NotificationPlugin> = new Map();
  
  register(plugin: NotificationPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  getPlugin(name: string): NotificationPlugin | undefined {
    return this.plugins.get(name);
  }
  
  getEnabledPlugins(): NotificationPlugin[] {
    // Return only plugins enabled system-wide
  }
}

// Register plugins at startup
const registry = new PluginRegistry();
registry.register(new LineChannelAdapter());
registry.register(new WhatsAppChannelAdapter());
// ... other plugin channels

// Built-in channels are NOT registered as plugins
```

---

### 2.5 Security Architecture

#### 2.5.1 Authentication and Authorization

- **Authentication:** Better Auth (session-based)
- **Authorization:** Role-based access control (RBAC)
  - System Admin: Full platform access
  - Store Admin: Store-scoped access
  - Store Staff: Limited store access
  - User: Own notifications only

#### 2.5.2 Data Protection

- **Encryption:** API keys and tokens encrypted at rest
- **Secrets Management:** Environment variables for sensitive configuration
- **Input Validation:** Zod schemas for all inputs
- **Content Sanitization:** XSS and injection prevention
- **Rate Limiting:** Per-user and per-store rate limits

#### 2.5.3 Audit Trail

All notification operations logged:

- Notification creation
- Notification sending
- Notification deletion
- Preference changes
- Template modifications
- System-wide enable/disable actions
- Store-level channel enable/disable actions

---

### 2.6 Performance Considerations

#### 2.6.1 Queue Processing

- **Batch Size:** Configurable (default: 100 notifications per batch)
- **Parallel Processing:** Multiple channels processed in parallel
- **Priority Queue:** Urgent notifications processed first
- **Rate Limiting:** Per-channel rate limits to prevent API throttling

#### 2.6.2 Caching Strategy

- **Template Cache:** Cache notification templates (invalidate on update)
- **Preference Cache:** Cache user/store preferences (invalidate on update)
- **Channel Config Cache:** Cache channel configurations (invalidate on update)
- **Cache TTL:** 5 minutes default, configurable

#### 2.6.3 Database Optimization

- **Indexes:** Comprehensive indexes on frequently queried fields
- **Composite Indexes:** For common query patterns
- **Partitioning:** Consider partitioning EmailQueue by date for large volumes
- **Archival:** Move old notifications to archive tables

---

### 2.7 Scalability Architecture

#### 2.7.1 Horizontal Scaling

- **Stateless Services:** All services are stateless for horizontal scaling
- **Queue Workers:** Multiple queue workers can process notifications in parallel
- **Database Connection Pooling:** Prisma connection pooling
- **Load Balancing:** For API endpoints and real-time connections

#### 2.7.2 Capacity Planning

- **Target Capacity:** 10,000+ notifications per hour
- **Peak Load Handling:** Auto-scaling queue workers
- **Database Scaling:** Read replicas for notification queries
- **External API Limits:** Respect rate limits and implement queuing

---

### 2.8 Admin Interface Components

#### 2.8.1 System Admin Pages

**Message Queue Management (`/sysAdmin/message-queue`):**

- **Purpose:** Monitor and manage the central message queue (`MessageQueue` model) for all notification channels
- **Server Component:** `src/app/sysAdmin/message-queue/page.tsx`
  - Fetches `MessageQueue` records with `Sender` and `Recipient` relations
  - Fetches stores and users for dropdowns
  - Transforms Prisma data for JSON serialization (BigInt to string)
- **Client Component:** `src/app/sysAdmin/message-queue/components/client-message-queue.tsx`
  - Displays message queue in `DataTableCheckbox` with row selection
  - Columns: Select, Sender, Recipient, Subject, Type, Priority, Read, Store, Created, Sent, Actions
  - Bulk delete functionality
  - Edit dialog integration
- **Edit Dialog:** `src/app/sysAdmin/message-queue/components/edit-message-queue.tsx`
  - Form for editing message details (sender, recipient, subject, message, type, priority, etc.)
  - Uses React Hook Form with Zod validation
  - Handles create and update operations
- **Server Actions:**
  - `src/actions/sysAdmin/messageQueue/update-message-queue.ts` - Create/update message
  - Delete via API route: `DELETE /api/sysAdmin/messageQueue/[id]`

**Key Differences from Mail Queue:**

- **Mail Queue** (`/sysAdmin/mail-queue`): Email-specific queue (`EmailQueue` model) for SMTP email delivery
- **Message Queue** (`/sysAdmin/message-queue`): Central queue (`MessageQueue` model) for all notification channels
- Message Queue includes notifications from all channels (on-site, email, LINE, WhatsApp, WeChat, SMS, Telegram, push)
- Message Queue tracks sender/recipient relationships and notification metadata
- Mail Queue is specifically for email delivery with SMTP details (from, to, subject, HTML/text content)

---

## Summary

This technical design document outlines the architecture for a comprehensive multi-channel notification system. Key design decisions:

1. **Layered Architecture:** Clear separation of concerns across presentation, application, service, and data layers
2. **Channel Adapter Pattern:** Unified interface for different notification channels
3. **Queue-Based Processing:** Asynchronous processing for scalability
4. **Template System:** Flexible template system with localization
5. **Preference Management:** Hierarchical preference system (system → store → user)
6. **Real-time Delivery:** WebSocket/SSE for on-site notifications
7. **Extensibility:** Plugin architecture for adding new channels
8. **Security:** Comprehensive security measures including encryption, validation, and audit trails

The system is designed to be scalable, maintainable, and extensible, supporting current requirements while allowing for future enhancements.

---

**End of Document**

