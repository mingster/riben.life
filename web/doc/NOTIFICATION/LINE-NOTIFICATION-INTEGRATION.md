# LINE and Notification System Integration

**Date:** 2025-01-26  
**Status:** Active  
**Version:** 1.0  

**Related Documents:**

- [LINE Messaging API overview](./LINE%20Messaging%20API%20overview.md)
- [Research: Sending LINE Messages by Phone Number](./LINE-SEND-BY-PHONE-NUMBER-RESEARCH.md)
- [Functional Requirements: Notification System](./FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)
- [Technical Design: Notification System](./TECHNICAL-DESIGN-NOTIFICATION.md)
- [UI Design: Notification System](./UI-DESIGN-NOTIFICATION.md)

---

## 1. Overview

This document describes how **LINE** is integrated with the riben.life notification system. LINE is implemented as a **plugin channel**: it can be enabled or disabled by the system admin (system-wide) and by each store (store-level). It uses the **LINE Messaging API** to send push messages, replies, and (optionally) broadcast messages to users who have linked their LINE account.

**Scope:**

- Sending notifications to users via the LINE Messaging API (push messages)
- User–LINE account linking (LINE Login and optional Account Link)
- Store-level LINE Official Account configuration
- Templates, delivery tracking, and webhooks
- Distinction from LINE Login (OAuth), LINE Pay, and store contact LINE IDs

---

## 2. LINE Concepts Relevant to Notifications

### 2.1 LINE Official Account and Messaging API

- **LINE Official Account**: The brand/ Bot account users add as a friend. Used for Messaging API.
- **Messaging API**: Sends and receives messages. Required for notification delivery.
- **Channel (Messaging API)**: Created in the [LINE Developers Console](https://developers.line.biz/). Provides:
  - **Channel ID**
  - **Channel Secret**
  - **Channel Access Token** (long‑lived, used to call Messaging API)

Our notification system uses the Messaging API to send **push messages** (and optionally reply/broadcast) to users who have a linked LINE identity.

### 2.2 LINE User ID

To send a push message, we need the **LINE user ID** (`userId` in LINE’s API). We obtain it from:

1. **LINE Login (OAuth)**  
   - User signs in with “LINE” via Better Auth.  
   - The LINE OAuth `sub` is mapped to `User.line_userId` (Better Auth `additionalFields`).  
   - Stored in `User.line_userId`.

2. **LINE Account Link (optional)**  
   - User adds the store’s LINE Official Account as a friend and completes account link.  
   - Webhook/link process provides `userId`; we then associate it with `User` and can persist in `User.line_userId` or a link table.

For notifications, we always need a `User` with a non‑null `line_userId` (or equivalent) before sending.

### 2.3 What Is *Not* in This Integration

- **LINE Login (OAuth only)**: Handled by Better Auth (`line` provider, `AUTH_LINE_ID`, `AUTH_LINE_SECRET`). This only provides “Sign in with LINE” and populates `line_userId`; it does not send notifications.
- **LINE Pay**: Separate product; uses `LINE_PAY_ID` and `LINE_PAY_SECRET` for payments. Not used for notifications.
- **Store contact LINE ID** (`StoreSettings.lineId`): Display-only “Line 客服帳號” for storefront/contact. Not the Messaging API or notification channel.

### 2.4 Alternative: Sending by Phone Number (LINE Notification Messages)

The **standard Messaging API does not support sending by phone number**; it requires a LINE user ID. LINE offers a separate, restricted service called **LINE Notification Messages** that allows sending by **phone number** (E.164, SHA256-hashed) without requiring the user to add your Official Account as a friend.

- **Regions:** Japan, Thailand, Taiwan only.
- **Access:** Corporate application and approval (e.g. via [LINE Sales partners](https://www.lycbiz.com/jp/partner/sales/)).
- **Use:** Non-commercial, no advertising; predefined templates or flexible formats (with UX review).
- **Recipient:** `User.phoneNumber` in E.164, hashed with SHA256; the user's LINE account must have that number registered and consent to notification messages.

For API endpoints, hashing, conditions, and how it compares to Messaging API (userId), see [Research: Sending LINE Messages by Phone Number](./LINE-SEND-BY-PHONE-NUMBER-RESEARCH.md).

---

## 3. How LINE Fits in the Notification System

### 3.1 Channel Model

- **Built-in channels**: On-site, Email — always on, cannot be disabled.  
- **Plugin channels**: LINE, WhatsApp, WeChat, SMS, Telegram, Push — can be enabled/disabled.

LINE is a **plugin channel**:

- **System level**: `SystemNotificationSettings.lineEnabled`  
  - System admin turns the LINE plugin on/off for the whole platform.
- **Store level**: `NotificationChannelConfig` where `channel = 'line'` and `storeId` = store  
  - `enabled`: store uses LINE for notifications only if `lineEnabled` is true in `SystemNotificationSettings`.  
  - `credentials`: encrypted JSON with Messaging API credentials (Channel ID, Channel Secret, Channel Access Token).  
  - `settings`: optional JSON for webhook URL, etc.

### 3.2 Sending Flow

1. **Eligibility**
   - `SystemNotificationSettings.notificationsEnabled === true`
   - `SystemNotificationSettings.lineEnabled === true`
   - For the store: `NotificationChannelConfig` for `channel='line'` exists, `enabled === true`, and `credentials` are valid.
   - Recipient: `User.line_userId` is not null (or equivalent from Account Link).
   - `NotificationPreferences.lineEnabled` is true for the user (and any store-level override is respected).

2. **Creation**
   - Notification is created in `MessageQueue` (subject, message, `notificationType`, `actionUrl`, etc.) with `senderId`, `recipientId`, `storeId`.

3. **Delivery**
   - LINE channel adapter:
     - Resolves store’s `NotificationChannelConfig` for `channel='line'`.
     - Gets `User.line_userId` for the recipient.
     - Calls [Push message API](https://developers.line.biz/en/reference/messaging-api/#send-push-message):  
       `POST https://api.line.me/v2/bot/message/push`  
       `Authorization: Bearer {Channel Access Token}`
     - Request body: `{ "to": "<line_userId>", "messages": [ ... ] }`.

4. **Tracking**
   - `NotificationDeliveryStatus` row: `notificationId`, `channel='line'`, `messageId` (from LINE if provided), `status` (`pending` → `sent` / `failed`), `errorMessage`, `deliveredAt`, etc.

5. **Templates**
   - `MessageTemplate` / `MessageTemplateLocalized` with `templateType = 'line'` and `body` (and optional `subject` used as a title). Variable substitution (`{{user.name}}`, `{{store.name}}`, `{{order.id}}`, etc.) is applied before sending.

### 3.3 Message Types We Support (Messaging API)

Aligned with [LINE Message types](https://developers.line.biz/en/docs/messaging-api/message-types/):

| Type        | Use case                          | Notes                                      |
|------------|-----------------------------------|--------------------------------------------|
| Text       | Simple notifications              | Main type for most templates                |
| Flex       | Rich cards, buttons, carousels   | For order/reservation/credit confirmations  |
| Image      | Notifications with image          | e.g. QR, product image                     |
| Template   | Buttons, confirm, carousel        | When we need quick-reply / URL buttons    |

We can start with **text** and **Flex** and add others as needed.

---

## 4. User–LINE Account Linking

### 4.1 LINE Login (Current)

- **Provider**: Better Auth `line` with `AUTH_LINE_ID` and `AUTH_LINE_SECRET`.
- **Result**: On first sign‑in with LINE, we store LINE’s user ID in `User.line_userId` (via `additionalFields.line_userId` in `auth.ts`).
- **Use for notifications**: If `User.line_userId` is set and the user opts in, we can send notifications to that LINE user.  
- **Note**: The LINE Login channel and the Messaging API channel can be the same or different. If different, the Login channel’s `sub` is still a valid `userId` for the Messaging API only when that same LINE app supports both; usually you use one app that has both “LINE Login” and “Messaging API” enabled.

### 4.2 Account Link (Optional, for Users Who Did Not Sign In with LINE)

- User adds the store’s LINE Official Account as a friend.
- Through [Account Link](https://developers.line.biz/en/docs/messaging-api/linking-accounts/), we bind the LINE `userId` to an existing `User` (or create one, per product rules).
- We then persist that `userId` (e.g. in `User.line_userId` or a dedicated link table) for that user and use it for push messages.

Implementation of Account Link is optional and can be added in a later phase.

---

## 5. Configuration

### 5.1 System Admin

- **System Notification Settings** (`/sysAdmin/notifications/settings`):
  - Master switch: `notificationsEnabled`
  - `lineEnabled`: turn LINE plugin on/off for the platform.
- Other system settings: retries, backoff, rate limits, history retention — apply to all channels including LINE.

### 5.2 Store Admin

- **Store Notification Settings** (`/storeAdmin/[storeId]/notifications/settings`):
  - LINE block is shown only when `SystemNotificationSettings.lineEnabled === true`.
  - **Enable LINE for this store**: set `NotificationChannelConfig` for `channel='line'`, `enabled=true`.
  - **Credentials** (stored encrypted in `credentials`):
    - **Channel ID** (Messaging API)
    - **Channel Secret** (Messaging API)
    - **Channel Access Token** (long‑lived) — or we support refresh via Secret if we implement it.
  - **Test connection**: call e.g. [Get bot info](https://developers.line.biz/en/reference/messaging-api/#get-bot-info) or a no-op to validate the token.

### 5.3 Environment vs Database

- **LINE Login (OAuth)**: `AUTH_LINE_ID`, `AUTH_LINE_SECRET` — env only, for Better Auth.
- **LINE Notifications**:  
  - Prefer **per‑store** `NotificationChannelConfig.credentials` (Channel ID, Secret, Access Token) so each store can use its own Official Account.  
  - Optionally, fallback to platform-level env (e.g. `LINE_MESSAGING_CHANNEL_ID`, `LINE_MESSAGING_CHANNEL_SECRET`, `LINE_MESSAGING_ACCESS_TOKEN`) if no store config exists.

---

## 6. LINE Messaging API and Webhooks

### 6.1 Sending (Our → LINE)

- **Push**: `POST https://api.line.me/v2/bot/message/push`  
  - `to`: `User.line_userId`  
  - `messages`: array of [message objects](https://developers.line.biz/en/reference/messaging-api/#message-objects).
- **Reply** (optional): only when we are handling a webhook event and replying within the reply token window: `POST https://api.line.me/v2/bot/message/reply`.
- **Broadcast** (optional): for store-wide blasts; different endpoint and product/plan requirements.

### 6.2 Receiving (LINE → Us): Webhook

- LINE sends events (messages, follows, etc.) to our **Webhook URL**.
- **Planned route**: `POST /api/notifications/webhooks/line`  
  - Verify signature (Channel Secret).  
  - Parse `destination`, `events[]`.  
  - For `message` events: optional bot logic (e.g. “Help”, “Stop”) or store for analytics.  
  - For `follow` / `unfollow`: optional handling for Account Link or analytics.  
  - For delivery/read (if we use them): update `NotificationDeliveryStatus` (e.g. `delivered`, `read`).  
  - Respond `200` quickly; do heavy work asynchronously.

Webhook URL for each store’s Messaging API channel: e.g.  
`https://<our-domain>/api/notifications/webhooks/line?storeId=<storeId>`  
or a single endpoint that infers store from `destination` (channel ID in the webhook). Exact dispatching (by `destination` or `storeId`) is an implementation detail.

### 6.3 Rate Limits and Errors

- LINE: e.g. 600 push messages/second per channel (confirm current [docs](https://developers.line.biz/en/docs/messaging-api/pricing/)).
- We must:
  - Respect `SystemNotificationSettings.rateLimitPerMinute` and any per‑channel throttling.
  - On `429` or 5xx: retry with backoff (reuse `maxRetryAttempts`, `retryBackoffMs`).
  - On 4xx (e.g. invalid `userId`, invalid token): mark `NotificationDeliveryStatus` as `failed`, `errorMessage` set, no retry for same payload.
  - Log with `logger` and `metadata` (storeId, notificationId, channel, error).

---

## 7. Data Model Summary

| Model / Field                         | Role for LINE                                      |
|--------------------------------------|----------------------------------------------------|
| `User.line_userId`                   | LINE user ID used as `to` in push.                 |
| `SystemNotificationSettings.lineEnabled` | System-wide LINE plugin on/off.                 |
| `NotificationChannelConfig`           | `channel='line'`, `enabled`, `credentials`, `settings`. |
| `MessageQueue`                       | Central queue; one row per notification.            |
| `NotificationDeliveryStatus`        | `channel='line'`, `messageId`, `status`, `errorMessage`, timestamps. |
| `MessageTemplate` / `MessageTemplateLocalized` | `templateType='line'`, `body` (and optional `subject`). |
| `NotificationPreferences.lineEnabled` | User (and store-level) opt‑in for LINE.        |

---

## 8. Implementation Checklist

### 8.1 LINE Channel Adapter

- [ ] `LineChannelAdapter` in `src/lib/notification/channels/` (or equivalent):
  - `name = 'line'`
  - `send(notification, config)`:
    - Resolve `NotificationChannelConfig` for `channel='line'` and `config.storeId`
    - Check `SystemNotificationSettings.lineEnabled` and `NotificationChannelConfig.enabled`
    - Get `User.line_userId` for `notification.recipientId`; if null, skip or fail with a clear reason
    - Check `NotificationPreferences` for LINE and notification type
    - Build LINE message (text / Flex / etc.) from `MessageQueue` + template
    - Call Push API, parse response, create/update `NotificationDeliveryStatus`
  - `validateConfig`, `getDeliveryStatus`, `isEnabled` (system + store)
- [ ] Register in the plugin/channel registry; exclude from built‑in channels.

### 8.2 Webhook

- [ ] `POST /api/notifications/webhooks/line`:
  - [ ] Signature verification (Channel Secret from `NotificationChannelConfig` or lookup by `destination`)
  - [ ] Parse `events[]`, respond `200` quickly
  - [ ] Async: handle `message`, `follow`/`unfollow`, delivery/read if used; update `NotificationDeliveryStatus` when applicable
  - [ ] Log and error handling

### 8.3 Credentials and Security

- [ ] Encrypt `NotificationChannelConfig.credentials` at rest
- [ ] Never log Channel Secret or Access Token
- [ ] Validate and sanitize webhook payloads

### 8.4 Templates and Content

- [ ] Support `templateType='line'` in `MessageTemplate`
- [ ] Variable substitution for `body` (and `subject` if used as title)
- [ ] Optional: LINE-specific JSON for Flex in `body` or a separate field

### 8.5 UI and Config

- [ ] System: `lineEnabled` toggle and any platform fallback for LINE credentials (if used)
- [ ] Store: LINE block in `/storeAdmin/[storeId]/notifications/settings` with enable, Channel ID, Secret, Access Token, Test, and status
- [ ] User: `lineEnabled` in notification preferences; show only when LINE is enabled for at least one store they use

### 8.6 Operational

- [ ] Retries and backoff for 5xx/429
- [ ] No retry for 4xx (invalid user, token, etc.)
- [ ] Logging with `logger`, `metadata` (storeId, notificationId, channel, `messageId`, status, `errorMessage`)
- [ ] Optional: monitoring/alerting on LINE `failed` share and 429 rate

---

## 9. Cross-References

- **LINE Messaging API**: [LINE Messaging API overview](./LINE%20Messaging%20API%20overview.md) and [official docs](https://developers.line.biz/en/docs/messaging-api/).
- **Notification behavior**: [FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md](./FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md) (e.g. FR-NOTIF-039–048, 053–054).
- **Architecture and adapters**: [TECHNICAL-DESIGN-NOTIFICATION.md](./TECHNICAL-DESIGN-NOTIFICATION.md) (channel adapters, `NotificationChannelConfig`, `MessageQueue`, `NotificationDeliveryStatus`).
- **UI for System and Store settings**: [UI-DESIGN-NOTIFICATION.md](./UI-DESIGN-NOTIFICATION.md).

---

## 10. Glossary

- **LINE Official Account**: The Bot / brand account on LINE that users add as a friend; used with the Messaging API.
- **LINE Login**: OAuth “Sign in with LINE”; provides `User.line_userId` via Better Auth.
- **LINE Messaging API**: API to send/receive messages (push, reply, broadcast, etc.).
- **LINE Account Link**: Process to bind a LINE `userId` to an existing app user when they add the Official Account and complete the link.
- **Channel (LINE)**: In LINE’s sense: a Messaging API app in the LINE Developers Console (Channel ID, Secret, Access Token).
- **Plugin channel**: In our system: LINE is a plugin; it is toggled by system and store, unlike built-in on-site and email.

---

**End of Document**
