# Design: RSVP Notification System

**Date:** 2025-02-03  
**Status:** Active  
**Version:** 1.0  

**Related Documents:**

- [Functional Requirements: Notification System](./FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)
- [Technical Design: Notification System](./TECHNICAL-DESIGN-NOTIFICATION.md)
- [Design: RSVP Reminder Notifications](./DESIGN-REMINDER-NOTIFICATIONS.md)
- [RSVP Functional Requirements](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)

---

## 1. Overview

The RSVP Notification System is the single entry point for all reservation-related notifications. It routes events (created, updated, cancelled, payment received, status changes, reminders, etc.) to the right recipients—**customers** and **store staff**—over the appropriate channels (on-site, email, LINE, SMS, etc.), with localized text and, where applicable, LINE Flex templates (reservation card or reminder card).

### 1.1 Design Principles

- **Single router**: All RSVP notification flows go through `RsvpNotificationRouter.routeNotification(context)`. Callers (server actions, payment flow, reminder processor) never call `NotificationService` directly for RSVP.
- **Event-driven**: Callers pass an `RsvpNotificationContext` with `eventType` and payload; the router decides who to notify and what to send.
- **Per-recipient localization**: Store staff receive subject/message in their own locale; customers receive in their locale. LINE Flex reservation cards use the recipient’s locale for labels.
- **LINE Flex by event**: All RSVP LINE messages use Flex templates—either **reservation** (reservation card) or **reminder** (reminder card)—targeting each transaction and recipient (customer vs staff) per function.
- **Channel and preference aware**: Channels are determined by store config and user notification preferences; the router does not hard-code channel lists.

### 1.2 Key Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **RsvpNotificationRouter** | `src/lib/notification/rsvp-notification-router.ts` | Route by `eventType`, build messages, call `NotificationService` for staff and customer |
| **NotificationService** | `src/lib/notification/notification-service.ts` | Create notification records and hand off to channel adapters |
| **PreferenceManager** | `src/lib/notification/preference-manager.ts` | User/store notification preferences for channel filtering |
| **LINE channel** | `src/lib/notification/channels/line-channel.ts` | Render Flex from `lineFlexPayload` (type `reservation` or `reminder`) |

---

## 2. Event Types and Routing

### 2.1 Event Type Enum

```ts
export type RsvpEventType =
  | "created"
  | "updated"
  | "cancelled"
  | "deleted"
  | "confirmed_by_store"
  | "confirmed_by_customer"
  | "status_changed"
  | "payment_received"
  | "ready"
  | "completed"
  | "no_show"
  | "unpaid_order_created"
  | "reminder";
```

### 2.2 Event → Recipients and LINE Flex

| Event | Notify staff? | Notify customer? | Staff LINE Flex | Customer LINE Flex |
|-------|----------------|-------------------|-----------------|--------------------|
| **created** | - | - | - | - |
| **updated** | Yes | Yes (if `customerId`) | Reservation | Reservation |
| **cancelled** | Yes | Yes (if `customerId`) | Reservation | Reservation |
| **deleted** | Yes | — | Reservation | — |
| **confirmed_by_store** | — | Yes (if `customerId`) | — | Reservation |
| **confirmed_by_customer** | Yes | — | Reservation | — |
| **status_changed** (ReadyToConfirm) | Yes | Yes (if `customerId`) | Reservation | Reservation |
| **status_changed** (Ready) | — | Yes (if `customerId`) | — | Reservation (+ check-in footer) |
| **status_changed** (CheckedIn) | Yes | Yes (if `customerId`) | Reservation | Reservation |
| **payment_received** | Yes | — | Reservation | — |
| **ready** | — | Yes (if `customerId`) | — | Reservation (+ check-in footer) |
| **completed** | — | Yes (if `customerId`) | — | Reservation |
| **no_show** | Yes | — | Reservation | — |
| **unpaid_order_created** | — | Yes (or SMS if anonymous) | — | Reservation (logged-in); no Flex for SMS-only |
| **reminder** | Yes (assigned staff or all opted-in) | Yes (if `customerId`) | Reservation | **Reminder** (reminder Flex) |

For **reminder**, the customer gets the **reminder** Flex (訂位將至提醒 style); staff get the **reservation** Flex so they see the same reservation card as other RSVP events.

---

## 3. RsvpNotificationContext

Callers build a single context object and pass it to `routeNotification(context)`.

### 3.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `rsvpId` | string | Reservation ID |
| `storeId` | string | Store ID |
| `eventType` | RsvpEventType | Event to route |

### 3.2 Optional Fields (Used by Handlers)

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | string \| null | Recipient for customer notifications; required for email/onsite/LINE to customer |
| `customerName` | string \| null | Display name (RSVP name or User name; prefer RSVP name over "Anonymous") |
| `customerEmail` | string \| null | Fallback for display; used when no name |
| `customerPhone` | string \| null | For unpaid_order_created SMS (anonymous) |
| `storeName` | string \| null | Filled by router if missing |
| `storeOwnerId` | string \| null | Filled by router if missing |
| `rsvpTime` | bigint \| null | Epoch ms; reservation date/time |
| `arriveTime` | bigint \| null | Epoch ms; expected arrival (e.g. for ready) |
| `status` | number | Current RsvpStatus |
| `previousStatus` | number | For status_changed messages |
| `facilityName` | string \| null | Facility/table name |
| `serviceStaffName` | string \| null | Assigned staff display name |
| `numOfAdult` | number | Party size |
| `numOfChild` | number | Party size |
| `message` | string \| null | Customer message/notes |
| `refundAmount` | number \| null | For cancellation refund text |
| `refundCurrency` | string \| null | For cancellation refund text |
| `paymentAmount` | number \| null | For payment_received and unpaid_order_created |
| `paymentCurrency` | string \| null | For payment_received and unpaid_order_created |
| `actionUrl` | string \| null | Override link; staff default e.g. `/storeAdmin/{storeId}/rsvp` or `/rsvp/history` |
| **`orderId`** | string \| null | **Required for unpaid_order_created**: payment URL is `/checkout/{orderId}` |
| `locale` | "en" \| "tw" \| "jp" | Preferred locale when known (e.g. from request); else user locale or "en" |

### 3.3 Context Enrichment

- The router fills `storeName` and `storeOwnerId` from the database when not provided.
- For **reminder**, the router loads the RSVP and enriches context with `rsvpTime`, `numOfAdult`, `numOfChild`, `facilityName` (and `serviceStaffName`) so the reservation Flex for staff has full data.

---

## 4. Architecture and Data Flow

### 4.1 High-Level Flow

```text
Caller (action / payment flow / reminder processor)
  → getRsvpNotificationRouter().routeNotification(context)
  → switch (context.eventType) → handleCreated | handleUpdated | … | handleReminder
  → For each recipient (staff and/or customer):
       - Resolve locale (user locale or context.locale or "en")
       - Build subject + message (localized)
       - Build lineFlexPayload (reservation or reminder) when applicable
       - getRsvpNotificationChannels(storeId, recipientId)
       - notificationService.createNotification({ subject, message, lineFlexPayload, channels, … })
  → NotificationService creates record and dispatches to channel adapters (onsite, email, LINE, etc.)
```

### 4.2 Staff Notifications

- **Recipients**: Store staff = organization members with role `owner`, `storeAdmin`, or `staff`, excluding service staff with `receiveStoreNotifications: false`. Store owner is always included.
- **Locale**: Each staff gets subject/message in their own locale (`User.locale` → `NotificationLocale`).
- **LINE Flex**: One reservation Flex payload per event (built with locale `"en"` for consistency) is passed to all staff via `notifyStoreStaff(…, lineFlexPayload)`.
- **Subject prefix**: All staff subjects are prefixed with `📋` (STAFF_NOTIFICATION_SUBJECT_ICON).
- **Action URL**: Typically `/storeAdmin/{storeId}/rsvp` or `/storeAdmin/{storeId}/rsvp/history` (or `context.actionUrl` when provided).

### 4.3 Customer Notifications

- **Recipients**: Only when `context.customerId` is set (except unpaid_order_created for anonymous: SMS to `customerPhone` and optionally onsite to store).
- **Locale**: Customer’s locale (`context.locale` or `User.locale`), default `"en"`.
- **LINE Flex**: Reservation Flex built with customer locale via `buildReservationLineFlexPayload(context, locale)`. For **reminder**, customer gets **reminder** Flex (different template), not reservation.
- **Action URL**: Usually `/s/{storeId}/reservation/history` or, for unpaid_order_created, `/checkout/{orderId}` when `orderId` is set.

### 4.4 Channel Selection

- **getRsvpNotificationChannels(storeId, recipientId)**:
  - **Onsite**: Always included.
  - **Email**: Included if system and store default preferences allow (not explicitly disabled).
  - **Plugin channels** (LINE, SMS, Telegram, WhatsApp, WeChat, push): Included only if the store has `NotificationChannelConfig` with `enabled: true` for that channel.
- **Per-recipient filtering**: If `recipientId` is present, channels are filtered by `PreferenceManager.getUserPreferences(recipientId, storeId)` (e.g. `lineEnabled`, `emailEnabled`). Onsite is always allowed.

---

## 5. LINE Flex Payloads

### 5.1 Payload Types

LINE messages for RSVP use a single `lineFlexPayload` JSON string on the notification. The LINE channel parses it and renders:

1. **`type: "reservation"`**  
   - **Data**: `LineReservationCardData` (storeName, reservationName, diningDate, diningTime, partySize, facilityName, etc.).  
   - **Use**: All RSVP events except the **customer** reminder.  
   - **Built by**: `buildLineReservationCardData(context, t)` → `buildReservationLineFlexPayload(context, locale)` → `JSON.stringify({ type: "reservation", data: card })`.

2. **`type: "reminder"`**  
   - **Data**: `LineReminderCardData` (title, messageBody, storeName, reservationName, reservationDate/Time, partySize, notes, buttonLabel).  
   - **Use**: Only for **customer** reminder notifications.  
   - **Built by**: Reminder handler in `handleReminder` (no shared helper; reminder-specific layout).

### 5.2 Shared Layout (Reservation Bubble)

The reservation Flex is a single **bubble** with fixed structure. All events use the same structure; only the **tag label**, **button label**, and **alt text** vary per event and recipient.

| Section | Content | Notes |
|--------|---------|--------|
| **Header** | Optional **tag** (pill) + **store name** + optional store address | Background `#2d9d78`. Tag only shown when `tagLabel` is set. |
| **Hero** | Image | Default placeholder when `heroImageUrl` not set. Aspect 20:13, cover. |
| **Body** | Label–value rows | Reservation name, date, time, party size, optional facility. Grey labels, bold values. |
| **Footer** | Single **button** | Links to `actionUrl`. Label = `bookAgainLabel` or default "Book again". Style: link, light beige. |

**Data model** (`LineReservationCardData`): `storeName`, `storeAddress?`, `heroImageUrl?`, `tagLabel?`, `reservationName`, `diningDate`, `diningTime`, `partySize`, `facilityName?`, `bookAgainLabel?`.

### 5.3 Per-Event Card Design

For each event, the card uses event-specific i18n keys for **tag label** (header chip), **button label** (footer CTA), and **alt text** (accessibility). When staff and customer differ, both are specified.

| Event | Recipient | Tag label (i18n key) | Button label (i18n key) | Alt text (i18n key) |
|-------|------------|----------------------|------------------------|----------------------|
| **updated** | Both | `line_flex_tag_updated` | `line_flex_btn_view_reservation` | `line_flex_alt_reservation_updated` |
| **cancelled** | Both | `line_flex_tag_cancelled` | `line_flex_btn_view_history` | `line_flex_alt_reservation_cancelled` |
| **deleted** | Staff | `line_flex_tag_deleted` | `line_flex_btn_view_history` | `line_flex_alt_reservation_deleted` |
| **confirmed_by_store** | Customer | `line_flex_tag_confirmed` | `line_flex_btn_view_reservation` | `line_flex_alt_reservation_confirmed` |
| **confirmed_by_customer** | Staff | `line_flex_tag_customer_confirmed` | `line_flex_btn_view_reservation` | `line_flex_alt_customer_confirmed` |
| **status_changed** (ReadyToConfirm) | Staff | `line_flex_tag_payment_received` | `line_flex_btn_confirm_reservation` | `line_flex_alt_payment_received` |
| **status_changed** (ReadyToConfirm) | Customer | `line_flex_tag_awaiting_confirmation` | `line_flex_btn_view_reservation` | `line_flex_alt_awaiting_confirmation` |
| **status_changed** (Ready) | Customer | `line_flex_tag_ready` | `line_flex_btn_check_in` | `line_flex_alt_reservation_ready` |
| **status_changed** (CheckedIn) | Staff | `line_flex_tag_checked_in` | `line_flex_btn_view_reservation` | `line_flex_alt_customer_checked_in` |
| **status_changed** (CheckedIn) | Customer | `line_flex_tag_checked_in` | `line_flex_btn_view_reservation` | `line_flex_alt_you_checked_in` |
| **payment_received** | Staff | `line_flex_tag_payment_received` | `line_flex_btn_view_reservation` | `line_flex_alt_payment_received` |
| **ready** | Customer | `line_flex_tag_ready` | `line_flex_btn_check_in` | `line_flex_alt_reservation_ready` |
| **completed** | Customer | `line_flex_tag_completed` | `line_flex_btn_view_history` | `line_flex_alt_reservation_completed` |
| **no_show** | Staff | `line_flex_tag_no_show` | `line_flex_btn_view_history` | `line_flex_alt_no_show` |
| **unpaid_order_created** | Customer | `line_flex_tag_payment_required` | `line_flex_btn_complete_payment` | `line_flex_alt_payment_required` |
| **reminder** (staff card) | Staff | `line_flex_tag_reminder` | `line_flex_btn_view_reservation` | `line_flex_alt_reminder_staff` |

**Note:** Customer **reminder** uses the separate **reminder** Flex template (訂位將至提醒), not the reservation card.

### 5.4 Button Action URLs

The button URI is the notification’s **action URL**:

| Context | Action URL |
|---------|------------|
| Staff (all events) | `/storeAdmin/{storeId}/rsvp` or `/storeAdmin/{storeId}/rsvp/history` (or `context.actionUrl`) |
| Customer – normal | `/s/{storeId}/reservation/history` |
| Customer – unpaid_order_created | `/checkout/{orderId}` when `orderId` is set |
| Customer – reminder | `/s/{storeId}/reservation/{rsvpId}` or `context.actionUrl` |

When the reservation is **ready**, customer messages also include a check-in message footer and, for email, an HTML footer with QR code linking to the check-in URL.

### 5.5 Reservation Card Data Source

- **buildLineReservationCardData(context, t)** uses `context` (storeName, customerName/customerEmail, rsvpTime, numOfAdult, numOfChild, facilityName) and `t` for labels. Extend to accept `eventType` and `recipient` and set `tagLabel` and `bookAgainLabel` from the table in §5.3.
- **buildReservationLineFlexPayload(context, locale)** gets `t` from `getNotificationT(locale)` and returns the JSON string. Used for every staff and customer notification that sends a reservation Flex.

### 5.6 i18n Keys for Reservation Flex

All keys must exist in `en`, `tw`, and `jp` under `app/i18n/locales/{locale}/translation.json`.

**Tag labels (header chip):** `line_flex_tag_updated`, `line_flex_tag_cancelled`, `line_flex_tag_deleted`, `line_flex_tag_confirmed`, `line_flex_tag_customer_confirmed`, `line_flex_tag_payment_received`, `line_flex_tag_awaiting_confirmation`, `line_flex_tag_ready`, `line_flex_tag_checked_in`, `line_flex_tag_completed`, `line_flex_tag_no_show`, `line_flex_tag_payment_required`, `line_flex_tag_reminder`.

**Button labels (footer CTA):** `line_flex_btn_view_reservation`, `line_flex_btn_view_history`, `line_flex_btn_confirm_reservation`, `line_flex_btn_check_in`, `line_flex_btn_complete_payment`. Existing: `line_flex_btn_book_again`, `line_flex_btn_view_invitation` (reminder Flex).

**Alt text (accessibility):** `line_flex_alt_reservation_updated`, `line_flex_alt_reservation_cancelled`, `line_flex_alt_reservation_deleted`, `line_flex_alt_reservation_confirmed`, `line_flex_alt_customer_confirmed`, `line_flex_alt_payment_received`, `line_flex_alt_awaiting_confirmation`, `line_flex_alt_reservation_ready`, `line_flex_alt_customer_checked_in`, `line_flex_alt_you_checked_in`, `line_flex_alt_reservation_completed`, `line_flex_alt_no_show`, `line_flex_alt_payment_required`, `line_flex_alt_reminder_staff`.

---

## 6. Callers (Invokers of the Router)

All callers use `getRsvpNotificationRouter()` and call `routeNotification(context)` with the appropriate `eventType` and payload.

| Caller | Event(s) | Notes |
|--------|----------|--------|
| **create-reservation.ts** (store front) | `created` | After customer creates reservation; includes `orderId` when unpaid order created |
| **create-rsvp.ts** (store admin) | `created`, `unpaid_order_created` | New reservation by staff; unpaid_order_created when order exists and payment pending |
| **update-reservation.ts** (store front) | `updated` | Customer edits reservation |
| **update-rsvp.ts** (store admin) | `updated` | Staff edits reservation |
| **cancel-reservation.ts** (store front) | `cancelled` | Customer cancels; may include refund info |
| **cancel-rsvp.ts** (store admin) | `cancelled` | Staff cancels |
| **delete-reservation.ts** (store front) | `deleted` | Customer deletes |
| **delete-rsvp.ts** (store admin) | `deleted` | Staff deletes |
| **process-rsvp-after-payment.ts** | `status_changed` (ReadyToConfirm), `payment_received`, `confirmed_by_store` (if already confirmed) | After payment; may also trigger `ready` when status set to Ready |
| **check-in-reservation.ts** | `status_changed` (CheckedIn) | Customer or staff checks in |
| **complete-rsvp.ts** / **complete-rsvps.ts** | `completed` | Mark reservation completed |
| **no-show-rsvp.ts** | `no_show` | Mark no-show |
| **reminder-processor.ts** | `reminder` | Scheduled job; calls `handleReminder(context)` (same router, different entry for scheduling) |

Store admin “set status to Ready” and similar flows trigger `status_changed` (or `ready`) with the appropriate `status`/`previousStatus` and are invoked from the same actions that update RSVP status.

---

## 7. Special Flows

### 7.1 Unpaid Order Created

- **Logged-in customer**: Normal notification (onsite, email, LINE, etc.) with reservation Flex; `actionUrl` = `/checkout/{orderId}` when `orderId` is set.
- **Anonymous customer** (no `customerId`, but `customerName` + `customerPhone`): No notification record for recipient; SMS sent directly (e.g. Twilio) with payment URL in body; optional onsite notification to store owner (currently commented out). No LINE Flex for SMS-only path.

### 7.2 Reminder

- **Customer**: Reminder Flex (type `reminder`), reservation details in message body; only when `customerId` is set.
- **Staff**: Reservation Flex (type `reservation`); recipients = assigned service staff (if any and `receiveStoreNotifications`) or all store staff with `receiveStoreNotifications: true`. Context is enriched from loaded RSVP so the reservation card has full data.
- See [Design: RSVP Reminder Notifications](./DESIGN-REMINDER-NOTIFICATIONS.md) for scheduling and reminder timing.

### 7.3 Status Changed (ReadyToConfirm, Ready, CheckedIn)

- **ReadyToConfirm**: Staff gets reservation Flex with actionUrl to confirm the reservation.
- **Ready**: Customer only; reservation Flex + check-in footer (clickable QR image to check-in URL).
- **CheckedIn**: Staff and customer; both get reservation Flex.

### 7.4 Error Handling

- The router catches errors inside `routeNotification`, logs them, and does **not** rethrow—notification failures must not break RSVP or payment flows.
- Per-recipient failures in `notifyStoreStaff` are logged and do not stop other staff from being notified.

---

## 8. Summary

- **Single entry point**: `RsvpNotificationRouter.routeNotification(context)`.
- **Event-driven**: `context.eventType` drives which handler runs and who gets notified.
- **LINE**: All RSVP LINE messages use Flex—**reservation** for almost all events, **reminder** only for customer reminder.
- **Recipients**: Staff (localized per user, one reservation Flex per event) and customer (localized, reservation or reminder Flex).
- **Channels**: Onsite always; email and plugin channels from store config and user preferences.
- **Callers**: Create/update/cancel/delete (front + admin), payment flow, check-in, complete, no-show, reminder processor—all use the same router with the appropriate context and event type.

This design keeps RSVP notification behavior consistent, auditable, and easy to extend (e.g. new event types or new Flex templates) without scattering notification logic across actions.
