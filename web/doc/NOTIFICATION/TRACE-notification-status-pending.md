# Trace: Why notification status = "pending"

## Summary

Notification status was stuck at **"pending"** for **email-only** notifications because:

1. **Email does not create `NotificationDeliveryStatus`** when enqueueing.
2. **`getNotificationStatus()`** only reads from `NotificationDeliveryStatus`.
3. **`send-mails-in-queue`** updates `EmailQueue.sentOn` but does not touch `NotificationDeliveryStatus`.

So for email-only notifications, `deliveryStatuses` is empty → overall status is always `"pending"`.

## Flow

### 1. Enqueue (addToQueue in queue-manager.ts)

- **Email**: `EmailChannel.send()` adds a row to **EmailQueue** (with `notificationId`). **No** row is created in **NotificationDeliveryStatus** (queue-manager only creates delivery status for `channel !== "email"`).
- **Other channels** (push, in_app, etc.): A row is created in **NotificationDeliveryStatus** with `status: "pending"`.

### 2. getNotificationStatus (notification-service.ts)

- Fetches **only** from `NotificationDeliveryStatus` where `notificationId = …`.
- For email-only notifications → **0 rows** → `channels.length === 0` → `overallStatus = "pending"`.
- Overall status is never updated from email delivery.

### 3. Actual email send (send-mails-in-queue.ts)

- Reads from **EmailQueue** (e.g. `sentOn: null`), calls SMTP, then updates **EmailQueue** (`sentOn`, `sendTries`).
- **Does not** create or update **NotificationDeliveryStatus**.

### 4. processBatch (queue-manager.ts)

- Gets unsent **EmailQueue** items and **NotificationDeliveryStatus** with `status: "pending"`.
- For each email queue item, calls `processNotification(notificationId, "email")` → `EmailChannel.send()` returns success (already in queue) → queue-manager **creates** `NotificationDeliveryStatus` with `status: "sent"` (because no existing row).
- So if **processBatch** runs before **send-mails-in-queue**, email can be marked "sent" in delivery status even though SMTP has not sent yet. If only **send-mails-in-queue** runs (no processBatch), no delivery status row exists and status stays "pending".

## Fix

**getNotificationStatus** was updated to also derive **email** status from **EmailQueue**:

- If there is an **EmailQueue** row for this `notificationId`:
  - `sentOn != null` → add email channel with status **"sent"** and `deliveredAt`.
  - `sentOn == null` → add email channel with status **"pending"**.
- Merge with existing `NotificationDeliveryStatus` channels (if email already has a row there, it was left as-is; otherwise the EmailQueue-based entry is used so email-only notifications get the correct status).

This way email-only notifications show **"sent"** after the mail is actually sent, and **"pending"** while still in the queue, without requiring changes to `send-mails-in-queue` or creating NotificationDeliveryStatus for email at enqueue time.

---

## Why LINE / On-Site stay "pending"

For **LINE**, **On-Site**, **push**, and other non-email channels:

- **addToQueue** creates **NotificationDeliveryStatus** with `status: "pending"`.
- Status is updated to **"sent"** (or "failed") only when **processNotification** runs, which calls each channel adapter’s **send()** (LINE API, push provider, etc.).
- **processNotification** is invoked by **QueueManager.processBatch()**.
- **processBatch()** was not called by any cron or API, so LINE/On-Site notifications were never sent and stayed **"pending"**.

## Cron job: process notification queue

A cron job must run **processBatch()** periodically so queued notifications are actually sent (LINE, On-Site, push, and email queue items).

- **API:** `GET /api/cron-jobs/process-notification-queue` (requires `Authorization: Bearer CRON_SECRET`).
- **Script:** `bin/run-process-notification-queue-cron.sh`.
- **Suggested schedule:** Every 1–2 minutes (e.g. `*/2 * * * *`).

Recommended crons:

1. **Process notification queue** – `run-process-notification-queue-cron.sh` (LINE, On-Site, push, and marks email queue items for delivery status).
2. **Send email queue** – `run-sendmail-cron.sh` (actual SMTP send from EmailQueue).
3. **Sync delivery status** – `/api/cron-jobs/sync-delivery-status` (optional; syncs "sent" with external providers like LINE).
