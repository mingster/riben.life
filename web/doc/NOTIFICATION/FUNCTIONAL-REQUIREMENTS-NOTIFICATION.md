# Functional Requirements: Notification System

**Date:** 2025-01-27
**Status:** Active
**Version:** 1.0

**Related Documents:**

- [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md)
- [RSVP Functional Requirements](./RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [Credit System Functional Requirements](./CREDIT/FUNCTIONAL-REQUIREMENTS-CREDIT.md)
- [Design: Customer Credit System](./CREDIT/DESIGN-CUSTOMER-CREDIT.md)

---

## 1. Overview

The Notification System provides a comprehensive multi-channel notification infrastructure that enables the platform to communicate with users through on-site notifications, email, and external messaging systems (LINE, WhatsApp, WeChat, SMS, Telegram, and push notifications). The system supports both real-time and queued notifications, template-based messaging, user preferences, delivery tracking, and integration with various business events across the platform.

**Channel Architecture:**

- **Built-in Channels (Always Available):**
  - On-site in-app notifications with real-time updates (cannot be disabled)
  - Email notifications with queue management and retry logic (cannot be disabled)
  
- **External Channels (Plugin-based, Enable/Disable by System Admin):**
  - LINE (popular in Taiwan/Japan) - implemented as plugin
  - WhatsApp Business API (global reach) - implemented as plugin
  - WeChat Official Account (Taiwan/China market) - implemented as plugin
  - SMS (universal reach) - implemented as plugin
  - Telegram Bot API - implemented as plugin
  - Push notifications (iOS/Android mobile apps) - implemented as plugin

**Key Features:**

- Built-in channels (on-site, email) are always available and cannot be disabled
- External channels are implemented as plugins and can be enabled/disabled by system administrators
- Plugin architecture allows for easy addition of new notification channels
- Template-based message generation with localization support
- User notification preferences and channel selection
- Delivery tracking and status monitoring
- Notification history and audit trail
- Bulk notification capabilities
- Scheduled and triggered notifications
- Rich notification content (text, HTML, media, attachments)

---

## 2. System Actors

### 2.1 Customer

- Registered users with accounts
- Can receive notifications from stores and system
- Can configure notification preferences
- Can view notification history
- Can mark notifications as read/unread
- Can delete notifications
- Must be authenticated to receive on-site notifications

### 2.2 Store Admin

- Store owners and administrators
- Can enable/disable external notification channels (LINE, WhatsApp, WeChat, SMS, Telegram, push) for their store (if enabled by system admin)
- Cannot disable built-in channels (on-site, email) - these are always available
- Can send notifications to customers and staff
- Can configure notification templates
- Can view notification delivery status
- Can manage notification preferences for their store
- Can schedule bulk notifications
- Full administrative access to notification settings

### 2.3 Store Staff

- Store employees with operational permissions
- Can send notifications to customers (as configured by Store Admin)
- Can view sent notifications
- Limited access to notification settings (as configured by Store Admin)

### 2.4 System Admin

- Platform administrators
- Can enable/disable the notification system system-wide
- Can enable/disable external notification channels (LINE, WhatsApp, WeChat, SMS, Telegram, push) system-wide
- Cannot disable built-in channels (on-site, email) - these are always available
- Can send system-wide notifications
- Can manage global notification templates
- Can configure external system integrations (LINE, SMS providers) via plugin system
- Can install/uninstall notification channel plugins
- Can monitor notification delivery across the platform
- Can manage notification queue and retry policies

---

## 2.5 Access Control Summary

### Store Staff Permissions (Operational Access)

Store Staff can:

- Send notifications to customers (if enabled by Store Admin)
- View notifications sent from their store
- View notification delivery status for their sent notifications
- Use notification templates (but not create/manage)

Store Staff cannot:

- Configure notification templates
- Configure external system integrations (LINE, SMS)
- Configure notification preferences for the store
- Send bulk notifications
- Schedule notifications
- View system-wide notification statistics

### Store Admin Permissions (Full Administrative Access)

Store Admins have all Store Staff permissions, plus:

- Enable/disable external notification channels for their store (LINE, WhatsApp, WeChat, SMS, Telegram, push notifications) - only if enabled by system admin
- Built-in channels (on-site, email) are always available and cannot be disabled
- Configure all notification settings for their store
- Create and manage notification templates
- Configure external system integrations (LINE, SMS) for their store
- Set notification preferences and defaults
- Send bulk notifications
- Schedule notifications
- View comprehensive notification statistics and analytics
- Configure Store Staff notification permissions

### System Admin Permissions (Platform-Wide Access)

System Admins have all Store Admin permissions, plus:

- Enable/disable the notification system system-wide (master switch)
- Send system-wide notifications to all users
- Manage global notification templates
- Configure platform-wide external system integrations
- Monitor and manage notification queue across all stores
- Configure retry policies and delivery settings
- Access platform-wide notification analytics
- Manage notification system infrastructure

---

## 3. Core Functional Requirements

### 3.1 On-Site Notifications

#### 3.1.1 Notification Display

**FR-NOTIF-001:** The system must display on-site notifications to authenticated users in real-time.

**FR-NOTIF-002:** On-site notifications must be displayed in a notification center accessible from the user interface.

**FR-NOTIF-003:** The notification center must show:

- Notification subject/title
- Notification message/content
- Sender information (name, avatar)
- Timestamp (creation time and last update time)
- Read/unread status indicator
- Store context (if applicable)
- Action buttons (if applicable)

**FR-NOTIF-004:** The system must display a notification badge/counter showing the number of unread notifications.

**FR-NOTIF-005:** The notification badge must update in real-time when new notifications arrive.

**FR-NOTIF-006:** The system must support notification grouping by:

- Store (for store-specific notifications)
- Type/category (e.g., order updates, RSVP confirmations, credit transactions)
- Date (today, yesterday, this week, older)

#### 3.1.2 Notification Management

**FR-NOTIF-007:** Users must be able to mark individual notifications as read.

**FR-NOTIF-008:** Users must be able to mark all notifications as read.

**FR-NOTIF-009:** Users must be able to delete individual notifications.

**FR-NOTIF-010:** Users must be able to delete all read notifications.

**FR-NOTIF-011:** The system must support soft delete for notifications:

- Notifications deleted by recipient are hidden from recipient's view
- Notifications deleted by sender are hidden from sender's view
- Notifications remain in database for audit purposes

**FR-NOTIF-012:** The system must preserve notification history even after deletion (for audit trail).

#### 3.1.3 Notification Actions

**FR-NOTIF-013:** Notifications must support action buttons/links that navigate to relevant pages:

- Order notifications → Order detail page
- RSVP notifications → Reservation detail page
- Credit notifications → Credit transaction history
- Payment notifications → Payment detail page

**FR-NOTIF-014:** The system must track notification click-through rates for analytics.

**FR-NOTIF-015:** The system must support deep linking from notifications to specific content within the application.

#### 3.1.4 Real-Time Updates

**FR-NOTIF-016:** The system must support real-time notification delivery using WebSocket or Server-Sent Events (SSE).

**FR-NOTIF-017:** New notifications must appear in the notification center without requiring page refresh.

**FR-NOTIF-018:** The notification badge count must update automatically when notifications are read or deleted.

**FR-NOTIF-019:** The system must handle connection failures gracefully and queue notifications for delivery when connection is restored.

---

### 3.2 Email Notifications

#### 3.2.1 Email Queue Management

**FR-NOTIF-020:** The system must use an email queue (`EmailQueue`) for all email notifications.

**FR-NOTIF-021:** All email notifications must be added to the queue before sending.

**FR-NOTIF-022:** The system must support asynchronous email processing to avoid blocking user requests.

**FR-NOTIF-023:** The email queue must track:

- Sender information (from, fromName)
- Recipient information (to, toName)
- CC and BCC recipients
- Subject line
- Text message content
- HTML message content
- Creation timestamp
- Send attempts count
- Sent timestamp (when successfully sent)

**FR-NOTIF-024:** The system must support email queue management:

- View pending emails
- View failed emails
- Retry failed emails
- Cancel queued emails (if not yet sent)

#### 3.2.3 Message Queue Management

**FR-NOTIF-037:** The system must provide a message queue management interface at `/sysAdmin/message-queue` for system administrators.

**FR-NOTIF-038:** System admins must be able to view all messages in the `MessageQueue` model across all notification channels.

**FR-NOTIF-039:** The message queue interface must display:

- Sender information (name/email with link to user page)
- Recipient information (name/email with link to user page)
- Notification subject
- Notification type (order, reservation, credit, system, etc.)
- Priority level (Normal, High, Urgent)
- Read status (read/unread)
- Store association (if applicable)
- Creation timestamp
- Sent timestamp (if sent)

**FR-NOTIF-040:** System admins must be able to edit message details via a dialog interface.

**FR-NOTIF-041:** System admins must be able to delete single or multiple messages from the queue.

**FR-NOTIF-042:** The message queue interface must support:

- Row selection with checkboxes
- Bulk delete operations
- Search functionality (by subject, sender, or recipient)
- Sortable columns
- Real-time timestamp updates

**FR-NOTIF-043:** The message queue must be distinct from the email queue:

- **Email Queue** (`/sysAdmin/mail-queue`): Email-specific queue (`EmailQueue` model) for SMTP email delivery
- **Message Queue** (`/sysAdmin/message-queue`): Central queue (`MessageQueue` model) for all notification channels
- Message Queue includes notifications from all channels (on-site, email, LINE, WhatsApp, WeChat, SMS, Telegram, push)
- Message Queue tracks sender/recipient relationships and notification metadata

#### 3.2.2 Email Delivery

**FR-NOTIF-025:** The system must send emails using SMTP with configurable server settings.

**FR-NOTIF-026:** The system must support retry logic for failed email deliveries:

- Maximum retry attempts (default: 3)
- Exponential backoff between retries
- Configurable retry intervals

**FR-NOTIF-027:** The system must track email delivery status:

- Pending (queued, not yet sent)
- Sent (successfully delivered)
- Failed (delivery failed after all retries)

**FR-NOTIF-028:** The system must log email delivery failures with error details for debugging.

**FR-NOTIF-029:** The system must support HTML and plain text email formats.

**FR-NOTIF-030:** The system must support email attachments (future enhancement).

#### 3.2.4 Email Templates

**FR-NOTIF-044:** The system must support email templates using `MessageTemplate` and `MessageTemplateLocalized`.

**FR-NOTIF-045:** Email templates must support localization:

- Multiple language versions per template
- Locale-specific content
- Locale-specific formatting

**FR-NOTIF-033:** Email templates must support variable substitution:

- User information (name, email, etc.)
- Store information (name, contact info, etc.)
- Order/reservation details
- Dynamic content based on context

**FR-NOTIF-034:** The system must support template activation/deactivation per locale.

**FR-NOTIF-035:** Email templates must support BCC addresses for compliance and tracking.

#### 3.2.4 Email Preferences

**FR-NOTIF-036:** Users must be able to configure email notification preferences:

- Enable/disable email notifications
- Select notification types to receive via email
- Set email frequency (immediate, daily digest, weekly digest)

**FR-NOTIF-037:** Store admins must be able to configure default email preferences for their store.

**FR-NOTIF-038:** The system must respect user email preferences when sending notifications.

---

### 3.3 External System Integration

#### 3.3.1 LINE Integration

For a consolidated description of how LINE is used in the notification system (plugin model, user linking, store config, webhooks), see [LINE and Notification System Integration](./LINE-NOTIFICATION-INTEGRATION.md).

**FR-NOTIF-039:** The system must support LINE messaging integration for notifications.

**FR-NOTIF-053:** LINE notifications must be sent through the LINE Messaging API.

**FR-NOTIF-054:** The system must support LINE notification types:

- Text messages
- Rich messages (buttons, images, carousels)
- Push notifications
- Broadcast messages (for store announcements)

**FR-NOTIF-042:** Users must be able to link their LINE account to receive notifications.

**FR-NOTIF-043:** The system must store LINE user IDs for notification delivery.

**FR-NOTIF-044:** Store admins must be able to configure LINE integration settings:

- LINE Channel ID
- LINE Channel Secret
- LINE Channel Access Token
- Enable/disable LINE notifications for their store

**FR-NOTIF-045:** The system must support LINE notification templates with variable substitution.

**FR-NOTIF-046:** The system must handle LINE API rate limits and errors gracefully.

**FR-NOTIF-047:** The system must track LINE notification delivery status.

**FR-NOTIF-048:** Users must be able to opt-in/opt-out of LINE notifications.

#### 3.3.2 WhatsApp Business API Integration

**FR-NOTIF-049:** The system must support WhatsApp Business API integration for notifications.

**FR-NOTIF-050:** WhatsApp notifications must be sent through the WhatsApp Business API.

**FR-NOTIF-051:** The system must support WhatsApp notification types:

- Text messages
- Rich media (images, documents, videos)
- Interactive messages (buttons, lists)
- Template messages (for business-initiated conversations)
- Quick replies

**FR-NOTIF-052:** Users must be able to link their WhatsApp number to receive notifications.

**FR-NOTIF-053:** The system must store WhatsApp phone numbers for notification delivery.

**FR-NOTIF-054:** Store admins must be able to configure WhatsApp Business API settings:

- WhatsApp Business Account ID
- API Access Token
- Phone Number ID
- Business Verification Status
- Enable/disable WhatsApp notifications for their store

**FR-NOTIF-055:** The system must support WhatsApp notification templates with variable substitution.

**FR-NOTIF-056:** The system must handle WhatsApp API rate limits and errors gracefully.

**FR-NOTIF-057:** The system must track WhatsApp notification delivery status (sent, delivered, read).

**FR-NOTIF-058:** Users must be able to opt-in/opt-out of WhatsApp notifications.

**FR-NOTIF-059:** The system must comply with WhatsApp Business Policy and messaging windows.

#### 3.3.3 WeChat Integration

**FR-NOTIF-060:** The system must support WeChat Official Account integration for notifications (important for Taiwan/China market).

**FR-NOTIF-061:** WeChat notifications must be sent through the WeChat Official Account API.

**FR-NOTIF-062:** The system must support WeChat notification types:

- Text messages
- Rich media messages (images, articles, cards)
- Template messages
- Menu-based interactions
- QR code generation for customer linking

**FR-NOTIF-063:** Users must be able to link their WeChat account by scanning QR code or following the Official Account.

**FR-NOTIF-064:** The system must store WeChat OpenIDs for notification delivery.

**FR-NOTIF-065:** Store admins must be able to configure WeChat Official Account settings:

- AppID and AppSecret
- Access Token management
- Template message configuration
- Enable/disable WeChat notifications for their store

**FR-NOTIF-066:** The system must support WeChat notification templates with variable substitution.

**FR-NOTIF-067:** The system must handle WeChat API rate limits and access token refresh.

**FR-NOTIF-068:** The system must track WeChat notification delivery status.

**FR-NOTIF-069:** Users must be able to opt-in/opt-out of WeChat notifications.

#### 3.3.4 SMS Integration

**FR-NOTIF-070:** The system must support SMS notification integration.

**FR-NOTIF-071:** SMS notifications must be sent through configurable SMS providers:

- Twilio
- AWS SNS (Simple Notification Service)
- Vonage (formerly Nexmo)
- Local SMS gateways (for Taiwan/Asia markets)
- Other configurable providers

**FR-NOTIF-072:** The system must support SMS notification templates with character limits (160 characters for standard SMS, 1600 for concatenated).

**FR-NOTIF-073:** Users must be able to configure SMS notification preferences.

**FR-NOTIF-074:** Store admins must be able to configure SMS provider settings:

- Provider selection
- API credentials
- Sender ID/Phone number
- Enable/disable SMS notifications for their store

**FR-NOTIF-075:** The system must support SMS delivery status tracking (sent, delivered, failed).

**FR-NOTIF-076:** The system must handle SMS provider rate limits and errors gracefully.

**FR-NOTIF-077:** The system must support international SMS formatting and country code handling.

#### 3.3.5 Push Notifications (Mobile Apps)

**FR-NOTIF-078:** The system must support push notifications for mobile applications (iOS and Android).

**FR-NOTIF-079:** Push notifications must be sent through:

- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNs) for iOS
- Unified push notification service

**FR-NOTIF-080:** The system must support push notification types:

- Alert notifications
- Silent notifications (background data updates)
- Rich notifications (images, actions, sounds)
- Interactive notifications (action buttons)

**FR-NOTIF-081:** Users must be able to register their device tokens for push notifications.

**FR-NOTIF-082:** The system must store device tokens (FCM tokens, APNs tokens) for notification delivery.

**FR-NOTIF-083:** Store admins must be able to configure push notification settings:

- FCM Server Key
- APNs Certificate/Key
- Enable/disable push notifications for their store

**FR-NOTIF-084:** The system must support push notification templates with variable substitution.

**FR-NOTIF-085:** The system must handle push notification delivery status (sent, delivered, failed).

**FR-NOTIF-086:** Users must be able to opt-in/opt-out of push notifications per device.

**FR-NOTIF-087:** The system must support push notification scheduling and timezone awareness.

#### 3.3.6 Telegram Bot Integration

**FR-NOTIF-088:** The system must support Telegram Bot API integration for notifications.

**FR-NOTIF-089:** Telegram notifications must be sent through the Telegram Bot API.

**FR-NOTIF-090:** The system must support Telegram notification types:

- Text messages
- Rich media (images, documents, videos, audio)
- Inline keyboards (buttons)
- Reply keyboards
- Location sharing

**FR-NOTIF-091:** Users must be able to link their Telegram account by starting a conversation with the bot.

**FR-NOTIF-092:** The system must store Telegram Chat IDs for notification delivery.

**FR-NOTIF-093:** Store admins must be able to configure Telegram Bot settings:

- Bot Token
- Bot Username
- Enable/disable Telegram notifications for their store

**FR-NOTIF-094:** The system must support Telegram notification templates with variable substitution.

**FR-NOTIF-095:** The system must handle Telegram API rate limits and errors gracefully.

**FR-NOTIF-096:** The system must track Telegram notification delivery status.

**FR-NOTIF-097:** Users must be able to opt-in/opt-out of Telegram notifications.

#### 3.3.7 Extensible Integration Framework

**FR-NOTIF-108:** The system must support extensible integration framework for future notification channels:

- Webhook notifications to external systems
- Slack/Discord integration (for team notifications)
- Instagram Direct Messages
- Twitter/X Direct Messages
- Other messaging platforms via plugin system

**FR-NOTIF-109:** The system must provide a plugin/extension mechanism for adding new notification channels:

- **All external channels (LINE, WhatsApp, WeChat, SMS, Telegram, push) must be implemented as plugins**
- Plugin API for custom channel integrations
- Configuration interface for new channels
- Template support for new channels
- Delivery tracking for new channels
- System admins can enable/disable plugins system-wide
- Store admins can enable/disable plugins for their store (only if enabled by system admin)

**FR-NOTIF-110:** Built-in channels (on-site, email) must always be available and cannot be disabled:

- On-site notifications are always enabled and cannot be disabled by any user
- Email notifications are always enabled and cannot be disabled by any user
- These channels are core functionality and not implemented as plugins

---

### 3.4 Notification Creation and Sending

#### 3.4.1 Manual Notification Creation

**FR-NOTIF-056:** Store admins must be able to create and send notifications manually:

- Select recipients (individual users, customer groups, all customers)
- Compose notification content
- Select notification channels (on-site, email, LINE, WhatsApp, WeChat, SMS, Telegram, push notifications)
- Schedule notification delivery (immediate or scheduled)

**FR-NOTIF-057:** Store staff must be able to send notifications to customers (if enabled by Store Admin).

**FR-NOTIF-058:** System admins must be able to send system-wide notifications to all users.

**FR-NOTIF-059:** The system must support notification preview before sending.

**FR-NOTIF-060:** The system must support notification drafts (save for later editing and sending).

#### 3.4.2 Automated Notification Triggers

**FR-NOTIF-061:** The system must support automated notification triggers for business events:

- Order created/updated/cancelled
- Payment received/failed
- Reservation created/confirmed/cancelled
- Credit refilld/used/expired
- Account created/updated
- Password reset requested
- Email verification required

**FR-NOTIF-062:** Store admins must be able to configure which automated notifications are sent for their store.

**FR-NOTIF-063:** The system must support conditional notification sending:

- Send only if certain conditions are met
- Skip notification if user has opted out
- Respect notification frequency limits
- Skip notification if system-wide notifications are disabled
- Skip notification method if that method is disabled for the store

#### 3.4.3 Bulk Notifications

**FR-NOTIF-064:** The system must support bulk notification sending:

- Send to multiple recipients simultaneously
- Batch processing for performance
- Progress tracking for large batches
- Error handling for individual failures

**FR-NOTIF-065:** Bulk notifications must respect user preferences and opt-out settings.

**FR-NOTIF-066:** The system must support bulk notification scheduling:

- Schedule for specific date/time
- Schedule for recurring events (e.g., weekly newsletters)

#### 3.4.4 Notification Content

**FR-NOTIF-067:** Notifications must support rich content:

- Plain text
- HTML formatting
- Images (for email and LINE)
- Links and action buttons
- Variable substitution for dynamic content

**FR-NOTIF-068:** The system must validate notification content before sending:

- Check for required fields
- Validate email addresses
- Validate LINE user IDs
- Check content length limits

**FR-NOTIF-069:** The system must sanitize notification content to prevent XSS and injection attacks.

---

### 3.5 Notification Preferences

#### 3.5.1 User Preferences

**FR-NOTIF-070:** Users must be able to configure notification preferences:

- Enable/disable notifications globally
- Enable/disable specific notification types
- Select preferred notification channels (on-site, email, LINE, SMS)
- Set notification frequency (immediate, digest, weekly summary)

**FR-NOTIF-071:** Users must be able to configure preferences per store (if they interact with multiple stores).

**FR-NOTIF-072:** The system must provide default notification preferences for new users.

**FR-NOTIF-073:** Users must be able to opt-out of marketing/promotional notifications while keeping transactional notifications.

**FR-NOTIF-074:** The system must respect user preferences when sending notifications.

#### 3.5.2 Store-Level Preferences

**FR-NOTIF-075:** Store admins must be able to enable/disable external notification channels for their store (only if enabled by system admin):

- LINE notifications (plugin)
- WhatsApp notifications (plugin)
- WeChat notifications (plugin)
- SMS notifications (plugin)
- Telegram notifications (plugin)
- Push notifications (plugin)

**Note:** Built-in channels (on-site, email) cannot be disabled and are always available.

**FR-NOTIF-076:** When a notification method is disabled for a store:

- No new notifications can be sent via that method for that store
- Existing queued notifications for that method remain in queue but are not processed
- Store staff cannot send notifications via that method
- Automated notification triggers skip that method for that store
- Users can still receive notifications via other enabled methods

**FR-NOTIF-077:** When a notification method is enabled for a store:

- All notification functionality for that method is restored for that store
- Queued notifications for that method resume processing
- Store staff can send notifications via that method
- Automated notification triggers can use that method for that store

**FR-NOTIF-078:** The system must display clear indicators showing which notification methods are enabled/disabled for each store:

- Visible to store admins in their store settings
- Visible to store staff (indicating which methods are available)
- Logged in store audit trail

**FR-NOTIF-079:** Store admins must be able to configure default notification preferences for their store:

- Default channels enabled
- Default notification types
- Default notification frequency

**FR-NOTIF-080:** Store-level preferences must apply to new customers who haven't set their preferences yet.

**FR-NOTIF-081:** Store admins must be able to override user preferences for critical notifications (e.g., order cancellations, payment failures).

**FR-NOTIF-082:** Store-level notification method enable/disable settings must respect system-wide notification disable:

- If system-wide notifications are disabled, all channels (built-in and plugins) are effectively disabled regardless of store settings
- Built-in channels (on-site, email) cannot be disabled by store admins, but are affected by system-wide disable
- Plugin channels can only be enabled by store admins if the plugin is enabled system-wide
- Store admins should see an indicator that system-wide notifications are disabled

#### 3.5.3 System-Level Preferences

**FR-NOTIF-083:** System admins must be able to enable/disable the notification system system-wide.

**FR-NOTIF-084:** When the notification system is disabled system-wide:

- No new notifications can be created or sent
- All notification queues are paused
- Existing queued notifications remain in queue but are not processed
- Store admins and staff cannot send notifications
- Automated notification triggers are disabled
- Users can still view existing notifications in their notification center
- All channels (built-in and plugins) are effectively disabled regardless of store settings
- Built-in channels (on-site, email) are affected by system-wide disable even though they cannot be individually disabled

**FR-NOTIF-085:** When the notification system is enabled system-wide:

- All notification functionality is restored
- Built-in channels (on-site, email) are immediately available
- Plugin channels are available only if enabled by system admin
- Queued notifications resume processing
- Store admins and staff can send notifications (subject to plugin enable/disable settings)
- Automated notification triggers are active
- Store-level plugin enable/disable settings take effect (only for plugins enabled by system admin)

**FR-NOTIF-086:** The system must display a clear indicator when notifications are disabled system-wide:

- Visible to system admins in the admin dashboard
- Visible to store admins (indicating system-wide disable)
- Logged in system audit trail

**FR-NOTIF-087:** System admins must be able to configure platform-wide notification defaults.

**FR-NOTIF-088:** System admins must be able to configure notification rate limits and throttling.

**FR-NOTIF-089:** System admins must be able to configure notification retry policies.

---

### 3.6 Notification Templates

#### 3.6.1 Template Management

**FR-NOTIF-090:** The system must support notification templates using `MessageTemplate` and `MessageTemplateLocalized`.

**FR-NOTIF-091:** Templates must support multiple languages through localization.

**FR-NOTIF-092:** Templates must support variable substitution:

- `{{user.name}}` - User name
- `{{user.email}}` - User email
- `{{store.name}}` - Store name
- `{{order.id}}` - Order ID
- `{{order.total}}` - Order total
- `{{reservation.date}}` - Reservation date
- Custom variables based on notification context

**FR-NOTIF-093:** Store admins must be able to create and manage notification templates for their store.

**FR-NOTIF-094:** System admins must be able to create and manage global notification templates.

**FR-NOTIF-095:** Templates must support activation/deactivation per locale.

**FR-NOTIF-096:** Templates must support versioning (future enhancement).

#### 3.6.2 Template Types

**FR-NOTIF-097:** The system must support different template types:

- Email templates (HTML and plain text)
- LINE message templates
- SMS templates
- On-site notification templates

**FR-NOTIF-098:** Templates must be channel-specific (email template cannot be used for LINE).

**FR-NOTIF-099:** The system must support template inheritance (base template with overrides).

---

### 3.7 Notification Delivery and Tracking

#### 3.7.1 Delivery Status

**FR-NOTIF-100:** The system must track notification delivery status for all channels:

- Pending (queued, not yet sent)
- Sent (successfully delivered)
- Failed (delivery failed)
- Bounced (email bounced)
- Opened (email opened, if tracking enabled)
- Clicked (link clicked, if tracking enabled)

**FR-NOTIF-101:** The system must update delivery status in real-time when possible.

**FR-NOTIF-102:** The system must store delivery timestamps for audit purposes.

#### 3.7.2 Delivery Tracking

**FR-NOTIF-103:** Store admins must be able to view notification delivery status:

- Sent notifications
- Failed notifications
- Pending notifications
- Delivery statistics

**FR-NOTIF-104:** System admins must be able to view platform-wide notification delivery statistics.

**FR-NOTIF-105:** The system must provide delivery analytics:

- Delivery success rate
- Average delivery time
- Channel performance comparison
- Failure reasons

#### 3.7.3 Error Handling

**FR-NOTIF-106:** The system must handle delivery failures gracefully:

- Log error details
- Retry failed deliveries (with configurable retry policy)
- Notify administrators of persistent failures
- Provide error messages for debugging

**FR-NOTIF-107:** The system must support dead letter queue for notifications that fail after all retries.

**FR-NOTIF-108:** The system must handle external API failures (LINE, SMS providers) gracefully.

---

### 3.8 Notification History and Audit

#### 3.8.1 History Storage

**FR-NOTIF-109:** The system must maintain notification history for audit purposes:

- All sent notifications
- Delivery status
- Timestamps (created, sent, read)
- Recipient information
- Sender information
- Notification content

**FR-NOTIF-110:** Notification history must be retained for a configurable period (default: 90 days, configurable by System Admin).

**FR-NOTIF-111:** The system must support notification history archival for long-term storage.

#### 3.8.2 Audit Trail

**FR-NOTIF-112:** The system must maintain an audit trail for notification operations:

- Notification creation
- Notification sending
- Notification deletion
- Preference changes
- Template modifications
- System-wide enable/disable actions
- Store-level notification method enable/disable actions

**FR-NOTIF-113:** The audit trail must include:

- User who performed the action
- Timestamp
- Action type
- Affected notification(s)
- IP address (if applicable)

**FR-NOTIF-114:** System admins must be able to view the audit trail.

---

### 3.9 Performance and Scalability

#### 3.9.1 Queue Processing

**FR-NOTIF-115:** The system must process notification queues efficiently:

- Batch processing for performance
- Parallel processing for multiple channels
- Rate limiting to prevent API throttling
- Priority queuing for urgent notifications

**FR-NOTIF-116:** The system must support horizontal scaling for queue processing.

**FR-NOTIF-117:** The system must handle peak loads gracefully (e.g., bulk notifications during promotions).

#### 3.9.2 Caching

**FR-NOTIF-118:** The system must cache notification templates for performance.

**FR-NOTIF-119:** The system must cache user preferences to reduce database queries.

**FR-NOTIF-120:** The system must invalidate caches when templates or preferences are updated.

---

### 3.10 Security and Privacy

#### 3.10.1 Access Control

**FR-NOTIF-121:** The system must enforce access control for notification operations:

- Users can only view their own notifications
- Store admins can only send notifications for their store
- System admins have platform-wide access
- Only system admins can enable/disable notifications system-wide
- Only store admins can enable/disable notification methods for their store

**FR-NOTIF-122:** The system must validate sender permissions before allowing notification creation.

**FR-NOTIF-123:** The system must prevent unauthorized access to notification APIs.

#### 3.10.2 Data Privacy

**FR-NOTIF-124:** The system must protect user privacy:

- Do not expose user email addresses in bulk operations
- Respect opt-out preferences
- Support GDPR compliance (right to be forgotten)
- Encrypt sensitive notification content (if required)

**FR-NOTIF-125:** The system must support notification content encryption for sensitive information.

**FR-NOTIF-126:** The system must log access to notification data for security auditing.

#### 3.10.3 Content Security

**FR-NOTIF-127:** The system must sanitize notification content to prevent:

- XSS attacks
- SQL injection
- Email header injection
- Link manipulation

**FR-NOTIF-128:** The system must validate all notification content before sending.

**FR-NOTIF-129:** The system must rate limit notification sending to prevent abuse.

---

## 4. Integration Points

### 4.1 RSVP System Integration

**FR-NOTIF-121:** The notification system must integrate with the RSVP system to send:

- Reservation confirmation notifications
- Reservation reminder notifications
- Reservation update notifications
- Reservation cancellation notifications

**FR-NOTIF-122:** RSVP notifications must respect RSVP settings (reminder hours, notification channels).

### 4.2 Credit System Integration

**FR-NOTIF-123:** The notification system must integrate with the Credit system to send:

- Credit refill confirmations
- Credit usage notifications
- Credit expiration warnings
- Credit bonus award notifications

### 4.3 Order System Integration

**FR-NOTIF-124:** The notification system must integrate with the Order system to send:

- Order confirmation notifications
- Order status update notifications
- Payment received notifications
- Order cancellation notifications
- Shipping notifications (if applicable)

### 4.4 User Account Integration

**FR-NOTIF-125:** The notification system must integrate with the User Account system to send:

- Account creation confirmations
- Email verification notifications
- Password reset notifications
- Account update notifications

---

## 5. User Interface Requirements

### 5.1 Notification Center

**FR-NOTIF-126:** The system must provide a notification center UI accessible from the main navigation.

**FR-NOTIF-127:** The notification center must display:

- List of notifications (newest first)
- Unread notification indicator
- Notification grouping options
- Filter and search capabilities
- Mark as read/unread actions
- Delete actions

**FR-NOTIF-128:** The notification center must be responsive and mobile-friendly.

**FR-NOTIF-129:** The notification center must support pagination for large notification lists.

### 5.2 Notification Preferences UI

**FR-NOTIF-130:** The system must provide a notification preferences UI in user account settings.

**FR-NOTIF-131:** The notification preferences UI must allow users to:

- Enable/disable notification channels
- Configure notification types
- Set notification frequency
- View notification history

### 5.3 Admin Notification Management UI

**FR-NOTIF-132:** Store admins must have access to a notification management UI:

- Create and send notifications
- View notification delivery status
- Manage notification templates
- Configure notification settings
- View notification statistics

**FR-NOTIF-133:** System admins must have access to a platform-wide notification management UI.

---

## 6. Technical Requirements

### 6.1 Data Models

**FR-NOTIF-134:** The system must use the `MessageQueue` model for notifications across all channels.

**FR-NOTIF-135:** The system must use the `EmailQueue` model for email notifications.

**FR-NOTIF-136:** The system must use the `MessageTemplate` and `MessageTemplateLocalized` models for notification templates.

**FR-NOTIF-137:** All datetime fields must use `BigInt` epoch time (milliseconds since 1970-01-01 UTC).

### 6.2 API Requirements

**FR-NOTIF-138:** The system must provide RESTful APIs for:

- Creating notifications
- Retrieving notifications
- Updating notification status (read/unread)
- Deleting notifications
- Managing notification preferences
- Managing templates

**FR-NOTIF-139:** The system must provide WebSocket or SSE endpoints for real-time notification delivery.

### 6.3 External Service Integration

**FR-NOTIF-140:** The system must integrate with LINE Messaging API for LINE notifications.

**FR-NOTIF-141:** The system must integrate with SMTP servers for email delivery.

**FR-NOTIF-142:** The system must integrate with WhatsApp Business API for WhatsApp notifications.

**FR-NOTIF-143:** The system must integrate with WeChat Official Account API for WeChat notifications.

**FR-NOTIF-144:** The system must integrate with SMS providers (Twilio, AWS SNS, Vonage, etc.) for SMS notifications.

**FR-NOTIF-145:** The system must integrate with Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) for push notifications.

**FR-NOTIF-146:** The system must integrate with Telegram Bot API for Telegram notifications.

**FR-NOTIF-147:** The system must support configurable external service credentials per store.

**FR-NOTIF-148:** The system must support secure storage of API keys and tokens for external services.

---

## 7. Non-Functional Requirements

### 7.1 Performance

**FR-NOTIF-149:** Notification delivery must be completed within 5 seconds for on-site notifications.

**FR-NOTIF-150:** Email notifications must be queued within 1 second of creation.

**FR-NOTIF-151:** The notification center must load within 2 seconds.

**FR-NOTIF-152:** Bulk notifications (1000+ recipients) must be processed within 10 minutes.

### 7.2 Reliability

**FR-NOTIF-153:** The system must achieve 99.9% notification delivery success rate.

**FR-NOTIF-154:** The system must handle external service failures gracefully with retry logic.

**FR-NOTIF-155:** The system must not lose notifications in case of system failures.

### 7.3 Scalability

**FR-NOTIF-156:** The system must support sending 10,000+ notifications per hour.

**FR-NOTIF-157:** The system must support 100,000+ active notification recipients.

**FR-NOTIF-158:** The system must support horizontal scaling for queue processing.

### 7.4 Usability

**FR-NOTIF-159:** The notification center must be intuitive and easy to use.

**FR-NOTIF-160:** Notification preferences must be easy to configure.

**FR-NOTIF-161:** Notification content must be clear and actionable.

---

## 8. Future Enhancements

### 8.1 Advanced Features

**FR-NOTIF-162:** Support for notification scheduling with timezone awareness.

**FR-NOTIF-163:** Support for A/B testing of notification content.

**FR-NOTIF-164:** Support for notification analytics and insights dashboard.

**FR-NOTIF-165:** Support for notification automation workflows.

### 8.2 Integration Enhancements

**FR-NOTIF-166:** Support for webhook notifications to external systems.

**FR-NOTIF-167:** Support for notification API for third-party integrations.

---

## 9. Acceptance Criteria Summary

### 9.1 On-Site Notifications

- ✅ Users can view notifications in the notification center
- ✅ Notification badge shows unread count
- ✅ Notifications update in real-time
- ✅ Users can mark notifications as read/unread
- ✅ Users can delete notifications
- ✅ Notifications support action buttons/links

### 9.2 Email Notifications

- ✅ Emails are queued and sent asynchronously
- ✅ Email delivery status is tracked
- ✅ Failed emails are retried automatically
- ✅ Email templates support localization
- ✅ User email preferences are respected

### 9.3 External System Integration

- ✅ LINE notifications can be sent and received
- ✅ WhatsApp notifications can be sent and received
- ✅ WeChat notifications can be sent and received (for Taiwan/China market)
- ✅ SMS notifications can be sent and received
- ✅ Push notifications work for mobile apps (iOS/Android)
- ✅ Telegram notifications can be sent and received
- ✅ All external integrations are configurable per store
- ✅ External API failures are handled gracefully with retry logic
- ✅ Delivery status is tracked for all external channels
- ✅ User opt-in/opt-out preferences are respected for all channels

### 9.4 Notification Management

- ✅ Store admins can enable/disable each notification method for their store
- ✅ Store admins can create and send notifications
- ✅ Notification templates can be created and managed
- ✅ Bulk notifications are supported
- ✅ Notification history is maintained
- ✅ Delivery statistics are available
- ✅ Store-level method enable/disable settings are respected when sending notifications

### 9.5 User Preferences

- ✅ Users can configure notification preferences
- ✅ Preferences are respected when sending notifications
- ✅ Store-level defaults are supported
- ✅ Opt-out functionality works correctly

---

## 10. Glossary

- **On-site notification**: In-app notification displayed within the web application
- **Email notification**: Notification sent via email (SMTP)
- **LINE notification**: Notification sent via LINE Messaging API (popular in Taiwan/Japan)
- **WhatsApp notification**: Notification sent via WhatsApp Business API
- **WeChat notification**: Notification sent via WeChat Official Account API (popular in Taiwan/China)
- **SMS notification**: Notification sent via SMS (Short Message Service) through providers like Twilio, AWS SNS
- **Push notification**: Notification sent to mobile apps via FCM (Android) or APNs (iOS)
- **Telegram notification**: Notification sent via Telegram Bot API
- **Notification template**: Reusable message template with variable substitution and localization
- **Notification queue**: Queue system for processing notifications asynchronously
- **Notification preference**: User settings for notification channels and frequency
- **Delivery status**: Status of notification delivery (pending, sent, delivered, read, failed)
- **Notification center**: UI component for viewing and managing notifications
- **Bulk notification**: Notification sent to multiple recipients simultaneously
- **Notification trigger**: Automated event that triggers notification sending
- **Opt-in/Opt-out**: User consent mechanism for receiving notifications via specific channels

---

## 11. Related Requirements

### 11.1 RSVP System

- Reservation confirmation notifications (FR-RSVP-039)
- Reservation reminder notifications (FR-RSVP-041)
- Reservation update notifications (FR-RSVP-043)

### 11.2 Credit System

- Credit refill confirmations
- Credit usage notifications
- Credit expiration warnings

### 11.3 Order System

- Order confirmation notifications
- Payment received notifications
- Order status updates

---

---

## End of Document
