# Design: RSVP Reminder Notifications (預約提醒與通知)

**Date:** 2025-01-27
**Status:** Design Document
**Version:** 1.0

**Related Documents:**

- [RSVP Functional Requirements](./FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](./TECHNICAL-REQUIREMENTS-RSVP.md)
- [Notification System Technical Design](../NOTIFICATION/TECHNICAL-DESIGN-NOTIFICATION.md)
- [Notification System Functional Requirements](../NOTIFICATION/FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)

---

## 1. Overview

The RSVP Reminder Notification System automatically sends reminder notifications to customers and assigned service staff before their scheduled reservations. The system is configurable per store, allowing store administrators to set reminder timing and select notification channels based on their business needs.

### 1.1 Purpose

- **Reduce No-Shows**: Remind customers of upcoming reservations to reduce no-show rates
- **Improve Customer Experience**: Proactive communication keeps customers informed
- **Staff Awareness**: When an RSVP has assigned service staff, send reminder to that staff; otherwise send to all store staff who opted in
- **Flexible Configuration**: Store admins can configure reminder timing and channels
- **Multi-Channel Support**: Send reminders via email, LINE, SMS, push notifications, and other enabled channels
- **Respect User Preferences**: Honor user notification preferences and opt-out settings

### 1.2 Key Features

- **Configurable Reminder Timing**: Store admins set `reminderHours` (hours before reservation)
- **Multi-Channel Delivery**: Support for email, LINE, SMS, WhatsApp, WeChat, Telegram, push notifications
- **Channel Selection**: Store admins enable/disable reminder channels per store
- **User Preferences**: Respect user notification preferences and opt-out settings
- **Scheduled Processing**: Background job processes reminders at regular intervals
- **Internationalization**: Reminder messages support multiple languages (en, tw, jp)
- **Timezone Awareness**: Reminders calculated in store's timezone
- **Service Staff Reminders**: When RSVP has `serviceStaffId`, send reminder to that staff; otherwise send to all store staff with `receiveStoreNotifications=true`

### 1.3 Recipients

| Scenario | Recipient |
|----------|-----------|
| Reservation with customerId | **Customer** |
| Anonymous reservation (no customerId) | **Store owner** (or skipped) |
| Reservation with serviceStaffId | **Assigned service staff** (in addition to customer; when `receiveStoreNotifications` is true) |
| Reservation without serviceStaffId | **All store staff** with `receiveStoreNotifications=true` |

---

## 2. System Architecture

### 2.1 Component Overview

```txt
┌─────────────────────────────────────────────────────────────┐
│                    Scheduler/Cron Job                       │
│  (Runs every 5-15 minutes to check for due reminders)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Reminder Processor Service                      │
│  - Query reservations due for reminders                     │
│  - Calculate reminder send time                             │
│  - Filter by store settings and user preferences            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            RsvpNotificationRouter                            │
│  - Build reminder notification context                      │
│  - Determine notification channels                          │
│  - Send notifications via NotificationService               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            NotificationService                               │
│  - Create notifications in MessageQueue                      │
│  - Route to enabled channels (email, LINE, SMS, etc.)       │
│  - Track delivery status                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Scheduler Triggers**: Cron job or scheduled task runs every 5-15 minutes
2. **Query Reservations**: Find reservations where:
   - Status is confirmed (not cancelled, completed, or no-show)
   - `rsvpTime - reminderHours` is within the current time window
   - Reminder has not been sent yet
3. **Process Each Reservation**: For each matching reservation:
   - Load store's `RsvpSettings` to get `reminderHours` and enabled channels
   - Check if reminder was already sent (via `RsvpReminderSent` tracking)
   - Calculate exact reminder send time
   - Load customer information and preferences
   - Build notification context
   - Call `RsvpNotificationRouter.handleReminder()`
4. **Send Notifications**: Router sends via enabled channels respecting user preferences
5. **Track Reminder**: Mark reminder as sent in `RsvpReminderSent` table

---

## 3. Database Schema

### 3.1 RsvpReminderStatus Enum

Define the reminder status enum in `src/types/enum.ts`:

```typescript
export enum RsvpReminderStatus {
  Sent = 0,     // Reminder successfully sent
  Failed = 10,  // Reminder sending failed
  Skipped = 20, // Reminder skipped (e.g., already sent, no channels enabled)
}
```

**Enum Values:**

- `Sent (0)`: Reminder was successfully sent to the customer
- `Failed (10)`: Reminder sending failed (e.g., API error, invalid credentials)
- `Skipped (20)`: Reminder was skipped (e.g., already sent, no enabled channels, user opted out)

### 3.2 RsvpSettings Model

The `RsvpSettings` model (already exists) contains reminder configuration:

```prisma
model RsvpSettings {
  // ... other fields ...
  
  //預約提醒與通知
  reminderHours       Int     @default(3) //預約提醒時間：??小時前發送確認通知
  useReminderEmail    Boolean @default(true) //使用email通知
  useReminderLine     Boolean @default(false) //使用Line通知
  useReminderSMS      Boolean @default(false) //使用簡訊通知
  useReminderTelegram Boolean @default(false) //使用Telegram通知
  useReminderPush     Boolean @default(false) //使用Push通知
  useReminderWechat   Boolean @default(false) //使用Wechat通知
  useReminderWhatsapp Boolean @default(false) //使用Whatsapp通知
}
```

**Key Fields:**

- `reminderHours`: Hours before reservation time to send reminder (default: 3)
- `useReminderEmail`, `useReminderLine`, etc.: Store-level channel enable/disable flags
- These flags control which channels are used for reminder notifications

### 3.3 RsvpReminderSent Model (New)

Track which reminders have been sent to prevent duplicate notifications:

```prisma
model RsvpReminderSent {
  id         String  @id @default(uuid())
  rsvpId     String
  storeId    String
  customerId String? // null for anonymous reservations
  
  // Reminder timing
  reminderScheduledAt BigInt  // When reminder was scheduled to be sent (rsvpTime - reminderHours)
  reminderSentAt      BigInt  // When reminder was actually sent
  
  // Notification tracking
  notificationId String? // Link to MessageQueue.id if notification was created
  
  // Status (using enum: 0=Sent, 10=Failed, 20=Skipped)
  status Int @default(0) // RsvpReminderStatus enum value
  errorMessage String?
  
  createdAt BigInt
  updatedAt BigInt
  
  Rsvp  Rsvp  @relation(fields: [rsvpId], references: [id], onDelete: Cascade)
  Store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  User  User? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  
  @@unique([rsvpId]) // One reminder per reservation
  @@index([storeId])
  @@index([customerId])
  @@index([reminderScheduledAt])
  @@index([status])
  @@index([createdAt])
  // Composite index for reminder query
  @@index([storeId, status, reminderScheduledAt])
}
```

**Purpose:**

- Prevent duplicate reminders (one reminder per reservation)
- Track reminder delivery status
- Link to notification record for audit trail
- Support querying for reminders due to be sent

---

## 4. Reminder Calculation Logic

### 4.1 Reminder Timing

**Formula:**

```typescript
reminderScheduledAt = rsvpTime - (reminderHours * 3600000)
```

Where:

- `rsvpTime`: Reservation time in epoch milliseconds (BigInt)
- `reminderHours`: Hours before reservation (from `RsvpSettings`)
- `3600000`: Milliseconds per hour

**Example:**

- Reservation time: `2025-01-28 14:00:00` (UTC)
- `reminderHours`: 3
- Reminder scheduled at: `2025-01-28 11:00:00` (UTC)

### 4.2 Timezone Handling

**Important:** All times are stored in UTC (epoch milliseconds), but reminders should be calculated considering the store's timezone.

**Calculation Steps:**

1. Get store's `defaultTimezone` (e.g., "Asia/Taipei")
2. Convert `rsvpTime` (UTC epoch) to store timezone
3. Calculate reminder time in store timezone
4. Convert back to UTC for storage and comparison

**Implementation:**

```typescript
import { epochToDate, getDateInTz, dateToEpoch, convertStoreTimezoneToUtc } from "@/utils/datetime-utils";

function calculateReminderTime(
  rsvpTime: bigint, // UTC epoch milliseconds
  reminderHours: number,
  storeTimezone: string
): bigint {
  // Convert UTC epoch to Date
  const rsvpDate = epochToDate(rsvpTime);
  if (!rsvpDate) throw new Error("Invalid rsvpTime");
  
  // Convert to store timezone
  const rsvpDateInStoreTz = getDateInTz(rsvpDate, storeTimezone);
  
  // Subtract reminder hours
  const reminderDateInStoreTz = new Date(
    rsvpDateInStoreTz.getTime() - (reminderHours * 3600000)
  );
  
  // Convert back to UTC epoch
  return dateToEpoch(reminderDateInStoreTz);
}
```

### 4.3 Reminder Window

To avoid missing reminders due to scheduler timing, use a time window:

**Query Logic:**

```typescript
const now = getUtcNowEpoch(); // Current time in UTC epoch milliseconds
const windowStart = now - (5 * 60000); // 5 minutes ago
const windowEnd = now + (5 * 60000); // 5 minutes from now

// Find reservations where reminder should be sent within this window
const dueReminders = await sqlClient.rsvp.findMany({
  where: {
    status: {
      in: [RsvpStatus.confirmed, RsvpStatus.confirmedByStore, RsvpStatus.confirmedByCustomer]
    },
    rsvpTime: {
      gte: windowStart + (reminderHours * 3600000), // Reservation is after reminder time
      lte: windowEnd + (reminderHours * 3600000)    // Reservation is before reminder time + window
    },
    // Exclude reservations where reminder already sent
    RsvpReminderSent: null
  }
});
```

**Why a Window?**

- Scheduler runs every 5-15 minutes
- Prevents missing reminders if scheduler is slightly delayed
- Allows processing reminders that are slightly overdue

---

## 5. Reminder Processing Service

### 5.1 Service Structure

**Location:** `src/lib/notification/reminder-processor.ts`

```typescript
import { RsvpReminderStatus, RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { sqlClient } from "@/lib/prismadb";
import { RsvpNotificationRouter } from "./rsvp-notification-router";
import logger from "@/lib/logger";

export class ReminderProcessor {
  private notificationRouter: RsvpNotificationRouter;
  
  constructor() {
    this.notificationRouter = new RsvpNotificationRouter();
  }
  
  /**
   * Process reminders due to be sent
   * Called by scheduler/cron job
   */
  async processDueReminders(): Promise<ProcessResult> {
    // 1. Query reservations due for reminders
    // 2. Group by store
    // 3. Process each store's reminders
    // 4. Return processing statistics
  }
  
  /**
   * Process reminders for a specific store
   */
  private async processStoreReminders(storeId: string): Promise<void> {
    // 1. Load store's RsvpSettings
    // 2. Query reservations due for reminders
    // 3. Process each reservation
  }
  
  /**
   * Process reminder for a single reservation
   */
  private async processReminder(rsvp: Rsvp, rsvpSettings: RsvpSettings): Promise<void> {
    // 1. Calculate reminder time
    // 2. Check if reminder already sent
    // 3. Load customer information
    // 4. Send reminder notification
    // 5. Track reminder as sent
  }
}
```

### 5.2 Processing Flow

```typescript
async processDueReminders(): Promise<ProcessResult> {
  const now = getUtcNowEpoch();
  const windowStart = now - (5 * 60000); // 5 minutes ago
  const windowEnd = now + (5 * 60000);   // 5 minutes from now
  
  // Query all stores with RSVP enabled
  const stores = await sqlClient.store.findMany({
    where: {
      RsvpSettings: {
        acceptReservation: true
      }
    },
    include: {
      RsvpSettings: true
    }
  });
  
  let totalProcessed = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  for (const store of stores) {
    if (!store.RsvpSettings) continue;
    
    const result = await this.processStoreReminders(store.id, store.RsvpSettings);
    totalProcessed += result.processed;
    totalSent += result.sent;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
  }
  
  return {
    processed: totalProcessed,
    sent: totalSent,
    failed: totalFailed,
    skipped: totalSkipped,
    timestamp: now
  };
}
```

### 5.3 Store-Level Processing

```typescript
private async processStoreReminders(
  storeId: string,
  rsvpSettings: RsvpSettings
): Promise<ProcessResult> {
  // Skip if no reminder hours configured
  if (!rsvpSettings.reminderHours || rsvpSettings.reminderHours <= 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }
  
  // Calculate reminder time window
  const now = getUtcNowEpoch();
  const windowStart = now - (5 * 60000);
  const windowEnd = now + (5 * 60000);
  const reminderOffsetMs = BigInt(rsvpSettings.reminderHours * 3600000);
  
  // Query reservations due for reminders
  const reservations = await sqlClient.rsvp.findMany({
    where: {
      storeId,
      status: {
        in: [
          RsvpStatus.confirmed,
          RsvpStatus.confirmedByStore,
          RsvpStatus.confirmedByCustomer
        ]
      },
      rsvpTime: {
        gte: windowStart + reminderOffsetMs,
        lte: windowEnd + reminderOffsetMs
      },
      RsvpReminderSent: null // Not yet sent
    },
    include: {
      Facility: true,
      ServiceStaff: true,
      Store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          defaultTimezone: true
        }
      }
    }
  });
  
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const rsvp of reservations) {
    try {
      const result = await this.processReminder(rsvp, rsvpSettings);
      if (result === "sent") sent++;
      else if (result === "skipped") skipped++;
    } catch (error) {
      failed++;
      logger.error("Failed to process reminder", {
        metadata: {
          rsvpId: rsvp.id,
          storeId,
          error: error instanceof Error ? error.message : String(error)
        },
        tags: ["rsvp", "reminder", "error"]
      });
    }
  }
  
  return {
    processed: reservations.length,
    sent,
    failed,
    skipped
  };
}
```

### 5.4 Individual Reminder Processing

```typescript
import { RsvpReminderStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

private async processReminder(
  rsvp: Rsvp & { Facility: Facility | null; ServiceStaff: ServiceStaff | null; Store: Store },
  rsvpSettings: RsvpSettings
): Promise<"sent" | "skipped"> {
  // Calculate reminder scheduled time
  const reminderScheduledAt = calculateReminderTime(
    rsvp.rsvpTime,
    rsvpSettings.reminderHours,
    rsvp.Store.defaultTimezone || "UTC"
  );
  
  // Check if reminder already sent (double-check)
  const existingReminder = await sqlClient.rsvpReminderSent.findUnique({
    where: { rsvpId: rsvp.id }
  });
  
  if (existingReminder) {
    return "skipped"; // Already sent
  }
  
  // Load customer information
  let customer: User | null = null;
  if (rsvp.customerId) {
    customer = await sqlClient.user.findUnique({
      where: { id: rsvp.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locale: true
      }
    });
  }
  
  // Build notification context
  const context: RsvpNotificationContext = {
    rsvpId: rsvp.id,
    storeId: rsvp.storeId,
    eventType: "reminder", // New event type
    customerId: rsvp.customerId,
    customerName: customer?.name || rsvp.name || null,
    customerEmail: customer?.email || null,
    customerPhone: customer?.phone || rsvp.phone || null,
    storeName: rsvp.Store.name,
    storeOwnerId: rsvp.Store.ownerId,
    rsvpTime: rsvp.rsvpTime,
    facilityName: rsvp.Facility?.name || null,
    serviceStaffName: rsvp.ServiceStaff?.name || null,
    numOfAdult: rsvp.numOfAdult,
    numOfChild: rsvp.numOfChild,
    locale: (customer?.locale as "en" | "tw" | "jp") || "en"
  };
  
  // Send reminder notification
  let notificationId: string | null = null;
  try {
    await this.notificationRouter.handleReminder(context);
    
    // Get the notification ID from the router (if returned)
    // This requires updating RsvpNotificationRouter to return notification ID
  } catch (error) {
    // Log error and create tracking record with failed status
    await sqlClient.rsvpReminderSent.create({
      data: {
        rsvpId: rsvp.id,
        storeId: rsvp.storeId,
        customerId: rsvp.customerId,
        reminderScheduledAt,
        reminderSentAt: getUtcNowEpoch(),
        status: RsvpReminderStatus.Failed, // 10
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
  
  // Track reminder as sent
  await sqlClient.rsvpReminderSent.create({
    data: {
      rsvpId: rsvp.id,
      storeId: rsvp.storeId,
      customerId: rsvp.customerId,
      reminderScheduledAt,
      reminderSentAt: getUtcNowEpoch(),
      notificationId,
      status: RsvpReminderStatus.Sent // 0
    }
  });
  
  return "sent";
}
```

---

## 6. RsvpNotificationRouter Integration

### 6.1 New Event Type

Add `"reminder"` to `RsvpEventType`:

```typescript
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
  | "reminder"; // New event type
```

### 6.2 Handle Reminder Method

Add to `RsvpNotificationRouter`:

```typescript
/**
 * Handle reminder notification
 * Sends reminder to customer before reservation time
 */
async handleReminder(context: RsvpNotificationContext): Promise<string | null> {
  try {
    logger.info("Sending RSVP reminder", {
      metadata: {
        rsvpId: context.rsvpId,
        storeId: context.storeId,
        customerId: context.customerId,
      },
      tags: ["rsvp", "notification", "reminder"],
    });

    // Get store information if not provided
    if (!context.storeName || !context.storeOwnerId) {
      const store = await sqlClient.store.findUnique({
        where: { id: context.storeId },
        select: {
          name: true,
          ownerId: true,
        },
      });
      if (store) {
        context.storeName = store.name;
        context.storeOwnerId = store.ownerId;
      }
    }

    // Get customer information if not provided
    if (context.customerId && (!context.customerName || !context.customerEmail)) {
      const customer = await sqlClient.user.findUnique({
        where: { id: context.customerId },
        select: {
          name: true,
          email: true,
          phone: true,
        },
      });
      if (customer) {
        context.customerName = customer.name;
        context.customerEmail = customer.email;
        context.customerPhone = customer.phone;
      }
    }

    // Get RSVP details
    const rsvp = await sqlClient.rsvp.findUnique({
      where: { id: context.rsvpId },
      include: {
        Facility: true,
        ServiceStaff: true,
      },
    });

    if (!rsvp) {
      logger.warn("RSVP not found for reminder", {
        metadata: { rsvpId: context.rsvpId },
        tags: ["rsvp", "notification", "reminder"],
      });
      return null;
    }

    // Determine recipient
    const recipientId = context.customerId;
    if (!recipientId) {
      // Anonymous reservation - send to store owner instead
      logger.info("Sending reminder to store owner for anonymous reservation", {
        metadata: {
          rsvpId: context.rsvpId,
          storeId: context.storeId,
        },
        tags: ["rsvp", "notification", "reminder", "anonymous"],
      });
      // Optionally send to store owner or skip
      return null;
    }

    // Get notification channels based on store settings and user preferences
    const channels = await this.getRsvpNotificationChannels(
      context.storeId,
      recipientId
    );

    // Get locale for i18n
    const locale = context.locale || "en";
    const t = getNotificationT(locale);

    // Build reminder message
    const subject = t("notif_subject_reminder", {
      customerName: context.customerName || t("notif_anonymous"),
    });

    const message = this.buildReminderMessage(rsvp, context, t);

    // Create action URL
    const actionUrl = context.actionUrl || `/s/${context.storeId}/reservation/${context.rsvpId}`;

    // Send notification to customer (or store owner for anonymous)
    const notification = await this.notificationService.createNotification({
      senderId: context.storeOwnerId || "system",
      recipientId,
      storeId: context.storeId,
      subject,
      message,
      notificationType: "reservation",
      actionUrl,
      priority: 1, // High priority for reminders
      channels,
    });

    logger.info("RSVP reminder sent to customer", {
      metadata: {
        rsvpId: context.rsvpId,
        storeId: context.storeId,
        customerId: context.customerId,
        notificationId: notification.id,
      },
      tags: ["rsvp", "notification", "reminder", "success"],
    });

    // Send reminder to staff: assigned staff if any, otherwise all store staff with receiveStoreNotifications
    let staffToNotify: { userId: string }[] = [];
    if (rsvp.ServiceStaff && rsvp.ServiceStaff.receiveStoreNotifications) {
      staffToNotify = [{ userId: rsvp.ServiceStaff.userId }];
    } else {
      const storeStaff = await sqlClient.serviceStaff.findMany({
        where: {
          storeId: context.storeId,
          receiveStoreNotifications: true,
          isDeleted: false,
        },
        select: { userId: true },
      });
      staffToNotify = storeStaff;
    }

    const staffSubject = t("notif_subject_reminder_staff", {
      storeName: context.storeName,
      customerName: context.customerName || t("notif_anonymous"),
    });
    const staffMessage = this.buildReminderMessageForStaff(rsvp, context, t);

    for (const staff of staffToNotify) {
      const staffChannels = await this.getRsvpNotificationChannels(
        context.storeId,
        staff.userId
      );
      if (staffChannels.length > 0) {
        const staffNotification = await this.notificationService.createNotification({
          senderId: context.storeOwnerId || "system",
          recipientId: staff.userId,
          storeId: context.storeId,
          subject: staffSubject,
          message: staffMessage,
          notificationType: "reservation",
          actionUrl,
          priority: 1,
          channels: staffChannels,
        });

        logger.info("RSVP reminder sent to store staff", {
          metadata: {
            rsvpId: context.rsvpId,
            storeId: context.storeId,
            staffUserId: staff.userId,
            notificationId: staffNotification.id,
          },
          tags: ["rsvp", "notification", "reminder", "staff", "success"],
        });
      }
    }

    return notification.id;
  } catch (error) {
    logger.error("Failed to send RSVP reminder", {
      metadata: {
        rsvpId: context.rsvpId,
        storeId: context.storeId,
        customerId: context.customerId,
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["rsvp", "notification", "reminder", "error"],
    });
    throw error;
  }
}

/**
 * Build reminder message
 */
private buildReminderMessage(
  rsvp: Rsvp & { Facility: Facility | null; ServiceStaff: ServiceStaff | null },
  context: RsvpNotificationContext,
  t: NotificationT
): string {
  const rsvpTimeFormatted = this.formatRsvpTime(
    rsvp.rsvpTime,
    context.storeId,
    t
  );

  let message = t("notif_msg_reminder_intro", {
    customerName: context.customerName || t("notif_anonymous"),
  });

  message += `\n\n`;
  message += `${t("notif_label_reservation_time")}: ${rsvpTimeFormatted}\n`;

  if (rsvp.Facility) {
    message += `${t("notif_label_facility")}: ${rsvp.Facility.name}\n`;
  }

  if (rsvp.ServiceStaff) {
    message += `${t("notif_label_service_staff")}: ${rsvp.ServiceStaff.name}\n`;
  }

 message += 
   `${t("notif_label_party_size")}: ${t("rsvp_num_of_guest_val", {
    adult: rsvp.numOfAdult,
    child: rsvp.numOfChild,
   })}`,
  );


  if (rsvp.message) {
    message += `\n${t("notif_label_message")}: ${rsvp.message}\n`;
  }

  message += `\n${t("notif_msg_reminder_footer")}`;

  return message;
}

/**
 * Build reminder message for service staff (assigned to the RSVP)
 */
private buildReminderMessageForStaff(
  rsvp: Rsvp & { Facility: Facility | null; ServiceStaff: ServiceStaff | null },
  context: RsvpNotificationContext,
  t: NotificationT
): string {
  const rsvpTimeFormatted = this.formatRsvpTime(
    rsvp.rsvpTime,
    context.storeId,
    t
  );

  let message = t("notif_msg_reminder_staff_intro", {
    customerName: context.customerName || t("notif_anonymous"),
  });

  message += `\n\n`;
  message += `${t("notif_label_reservation_time")}: ${rsvpTimeFormatted}\n`;

  if (rsvp.Facility) {
    message += `${t("notif_label_facility")}: ${rsvp.Facility.name}\n`;
  }

 message += 
   `${t("notif_label_party_size")}: ${t("rsvp_num_of_guest_val", {
    adult: rsvp.numOfAdult,
    child: rsvp.numOfChild,
   })}`,
  );

  message += `\n`;

  if (rsvp.message) {
    message += `\n${t("notif_label_message")}: ${rsvp.message}\n`;
  }

  message += `\n${t("notif_msg_reminder_staff_footer")}`;

  return message;
}
```

### 6.3 Channel Selection

The `getRsvpNotificationChannels` method (already exists) will automatically use the reminder-specific flags from `RsvpSettings`:

- `useReminderEmail` → includes "email" channel
- `useReminderLine` → includes "line" channel
- `useReminderSMS` → includes "sms" channel
- etc.

The method also respects user preferences via `filterChannelsByRecipientPreferences`.

---

## 7. Scheduler Implementation

### 7.1 Cron Job / Scheduled Task

**Option 1: Linux System Cron with API Route (Recommended)**

Create `src/app/api/cron/process-reminders/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { ReminderProcessor } from "@/lib/notification/reminder-processor";
import logger from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by system cron every 10 minutes
export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processor = new ReminderProcessor();
    const result = await processor.processDueReminders();

    logger.info("Reminder processing completed", {
      metadata: result,
      tags: ["cron", "reminder", "success"],
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Reminder processing failed", {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["cron", "reminder", "error"],
    });

    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
```

**Cron Configuration:**

**Step 1: Copy the cron script to system location**

```bash
# Copy the script from project to system location
sudo cp /path/to/project/bin/run-rsvp-reminders-cron.sh /usr/local/bin/run-rsvp-reminders-cron.sh

# Make it executable
sudo chmod +x /usr/local/bin/run-rsvp-reminders-cron.sh
```

**Step 2: Set environment variables**

Add to `/etc/environment` or create `/etc/systemd/system/rsvp-reminders-cron.service.d/env.conf`:

```bash
# For system-wide environment variables
CRON_SECRET=your_secure_random_string_here
API_URL=http://localhost:3000
```

Or add to crontab environment (see Step 3).

**Step 3: Add to system crontab**

Edit system crontab (`sudo crontab -e`):

```bash
# Set environment variables for cron
CRON_SECRET=your_secure_random_string_here
API_URL=http://localhost:3000

# Process RSVP reminder notifications every 10 minutes
*/10 * * * * /usr/local/bin/run-rsvp-reminders-cron.sh >> /var/log/rsvp-reminders.log 2>&1
```

**Alternative: Direct curl command (simpler but less secure)**

If you prefer not to use the script, add directly to crontab:

```bash
# Process RSVP reminder notifications every 10 minutes
*/10 * * * * curl -X GET http://localhost:3001/api/cron-jobs/process-reminders -H "Authorization: Bearer ${CRON_SECRET}" > /dev/null 2>&1
```

**Note:** The script is located at `bin/run-rsvp-reminders-cron.sh` in the project root. Copy it to `/usr/local/bin/`:

The script is already created at `bin/run-rsvp-reminders-cron.sh` in the project root. It includes:

- Environment variable validation
- Error handling with proper exit codes
- HTTP status code checking
- Logging support

**Logging:**

The cron job logs to `/var/log/rsvp-reminders.log`. To view logs:

```bash
# View recent logs
tail -f /var/log/rsvp-reminders.log

# View last 100 lines
tail -n 100 /var/log/rsvp-reminders.log
```

**Option 2: Direct Node.js Script with Cron**

Create a standalone script that runs directly via cron:

**Location:** `bin/process-rsvp-reminders.ts`

```typescript
#!/usr/bin/env bun
/**
 * Process RSVP reminder notifications
 * Run via system cron: */10 * * * * /path/to/bin/process-rsvp-reminders.ts
 */

import { ReminderProcessor } from "@/lib/notification/reminder-processor";
import logger from "@/lib/logger";

async function main() {
  try {
    const processor = new ReminderProcessor();
    const result = await processor.processDueReminders();

    logger.info("Reminder processing completed", {
      metadata: result,
      tags: ["cron", "reminder", "success"],
    });

    process.exit(0);
  } catch (error) {
    logger.error("Reminder processing failed", {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["cron", "reminder", "error"],
    });

    process.exit(1);
  }
}

main();
```

Make executable and add to crontab:

```bash
sudo chmod +x /path/to/web/bin/process-rsvp-reminders.ts

# Add to crontab
*/10 * * * * cd /path/to/web && /usr/bin/bun run bin/process-rsvp-reminders.ts >> /var/log/rsvp-reminders.log 2>&1
```

## 8. Internationalization

### 8.1 Translation Keys

Add to `translation.json` files:

```json
{
  "notif_subject_reminder": "Reminder: Your reservation at {{storeName}}",
  "notif_subject_reminder_staff": "Appointment reminder: {{customerName}} at {{storeName}}",
  "notif_msg_reminder_intro": "Dear {{customerName}},\n\nThis is a reminder about your upcoming reservation.",
  "notif_msg_reminder_staff_intro": "You have an upcoming appointment with {{customerName}}.",
  "notif_msg_reminder_footer": "We look forward to seeing you!\n\nIf you need to cancel or modify your reservation, please contact us.",
  "notif_msg_reminder_staff_footer": "Please be prepared for the appointment.",
  "notif_label_reservation_time": "Reservation Time",
  "notif_label_facility": "Facility",
  "notif_label_service_staff": "Service Staff",
  "notif_label_party_size": "Party Size",
  "notif_label_message": "Message"
}
```

**Traditional Chinese (`tw/translation.json`):**

```json
{
  "notif_subject_reminder": "提醒：您在 {{storeName}} 的預約",
  "notif_subject_reminder_staff": "預約提醒：{{customerName}} 將於 {{storeName}} 到訪",
  "notif_msg_reminder_intro": "親愛的 {{customerName}}，\n\n這是關於您即將到來的預約提醒。",
  "notif_msg_reminder_staff_intro": "您即將有與 {{customerName}} 的預約服務。",
  "notif_msg_reminder_footer": "我們期待您的到來！\n\n如果您需要取消或修改預約，請聯繫我們。",
  "notif_msg_reminder_staff_footer": "請做好服務準備。",
  "notif_label_reservation_time": "預約時間",
  "notif_label_facility": "設施",
  "notif_label_service_staff": "服務人員",
  "notif_label_party_size": "人數",
  "notif_label_message": "備註"
}
```

**Japanese (`jp/translation.json`):**

```json
{
  "notif_subject_reminder": "リマインダー：{{storeName}}でのご予約",
  "notif_subject_reminder_staff": "予約リマインダー：{{storeName}}で{{customerName}}様のご予約",
  "notif_msg_reminder_intro": "{{customerName}}様\n\nまもなくご予約の時間です。",
  "notif_msg_reminder_staff_intro": "{{customerName}}様との予約サービスがまもなく始まります。",
  "notif_msg_reminder_footer": "お待ちしております！\n\n予約のキャンセルや変更が必要な場合は、お問い合わせください。",
  "notif_msg_reminder_staff_footer": "ご準備をお願いいたします。",
  "notif_label_reservation_time": "予約時間",
  "notif_label_facility": "施設",
  "notif_label_service_staff": "スタッフ",
  "notif_label_party_size": "人数",
  "notif_label_message": "メッセージ"
}
```

---

## 9. Error Handling and Edge Cases

### 9.1 Error Scenarios

**1. Reservation Cancelled After Reminder Scheduled**

- **Solution**: Check reservation status before sending
- **Implementation**: Query includes status filter, skip if cancelled

**2. Reminder Time Passed (Overdue)**

- **Solution**: Use time window to catch overdue reminders
- **Implementation**: Window includes 5 minutes before current time

**3. Customer Opted Out**

- **Solution**: Respect user preferences
- **Implementation**: `filterChannelsByRecipientPreferences` filters out opted-out channels

**4. Store Disabled Reminder Channel**

- **Solution**: Check store settings before sending
- **Implementation**: `getRsvpNotificationChannels` only includes enabled channels

**5. No Enabled Channels**

- **Solution**: Skip reminder if no channels available
- **Implementation**: Return early if `channels.length === 0`

**6. Anonymous Reservation (No customerId)**

- **Solution**: Skip reminder or send to store owner
- **Implementation**: Check `customerId` and skip if null

**7. Service Staff Opted Out**

- **Solution**: Respect `ServiceStaff.receiveStoreNotifications` flag
- **Implementation**: Assigned staff – only send when `rsvp.ServiceStaff.receiveStoreNotifications === true`. Otherwise – query store staff with `receiveStoreNotifications === true` and `isDeleted === false`

**8. Duplicate Reminders**

- **Solution**: Track sent reminders in `RsvpReminderSent`
- **Implementation**: Query excludes reservations with existing reminder records

### 9.2 Retry Logic

**Failed Reminders:**

- If reminder sending fails, mark as `RsvpReminderStatus.Failed` (10) in `RsvpReminderSent`
- Optionally retry on next scheduler run (if status is `RsvpReminderStatus.Failed` and within retry window)
- Log errors for debugging

**Implementation:**

```typescript
import { RsvpReminderStatus } from "@/types/enum";

// In processStoreReminders, also check for failed reminders to retry
const failedReminders = await sqlClient.rsvpReminderSent.findMany({
  where: {
    storeId,
    status: RsvpReminderStatus.Failed, // 10
    reminderScheduledAt: {
      gte: windowStart,
      lte: windowEnd
    },
    // Retry only if less than 1 hour overdue
    reminderScheduledAt: {
      gte: now - BigInt(3600000) // 1 hour ago
    }
  },
  include: {
    Rsvp: {
      include: {
        Facility: true,
        ServiceStaff: true,
        Store: true
      }
    }
  }
});

// Retry failed reminders
for (const failedReminder of failedReminders) {
  // Retry logic (limit retries to prevent infinite loops)
  if (failedReminder.retryCount < 3) {
    await this.processReminder(failedReminder.Rsvp, rsvpSettings);
  }
}
```

---

## 10. Performance Considerations

### 10.1 Database Optimization

**Indexes:**

- `RsvpReminderSent.rsvpId` (unique) - Fast lookup for existing reminders
- `RsvpReminderSent.storeId, status, reminderScheduledAt` (composite) - Fast query for due reminders
- `Rsvp.storeId, status, rsvpTime` (composite) - Fast query for reservations due reminders

**Query Optimization:**

- Use `select` to fetch only needed fields
- Batch process stores (not all at once)
- Limit batch size (e.g., 100 reservations per batch)

### 10.2 Processing Optimization

**Parallel Processing:**

- Process multiple stores in parallel (with concurrency limit)
- Use `Promise.all()` for independent operations

**Caching:**

- Cache `RsvpSettings` per store (invalidate on update)
- Cache store timezone information

**Rate Limiting:**

- Respect external API rate limits (LINE, SMS, etc.)
- Queue notifications if rate limit exceeded

---

## 11. Monitoring and Logging

### 11.1 Logging

**Key Events:**

- Reminder processing started/completed
- Reminder sent successfully
- Reminder failed
- Reminder skipped (already sent, no channels, etc.)

**Log Structure:**

```typescript
logger.info("Reminder processing started", {
  metadata: {
    storeId,
    reservationsFound: reservations.length
  },
  tags: ["rsvp", "reminder", "processing"]
});

logger.info("Reminder sent", {
  metadata: {
    rsvpId,
    storeId,
    customerId,
    notificationId,
    channels: ["email", "line"]
  },
  tags: ["rsvp", "reminder", "success"]
});
```

### 11.2 Metrics

**Track:**

- Total reminders processed per run
- Success rate
- Failure rate
- Average processing time
- Channel distribution (email vs LINE vs SMS)

**Implementation:**

```typescript
interface ReminderMetrics {
  totalProcessed: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  channelDistribution: Record<string, number>;
  averageProcessingTime: number;
}
```

### 11.3 Alerts

**Alert Conditions:**

- High failure rate (> 10%)
- Scheduler not running (no processing logs for > 30 minutes)
- External API errors (LINE, SMS provider failures)

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Reminder time calculation (timezone handling)
- Reminder window query logic
- Message building
- Channel selection

### 12.2 Integration Tests

- End-to-end reminder processing
- Notification sending via all channels
- User preference filtering
- Store setting filtering

### 12.3 Manual Testing

- Create test reservation
- Set `reminderHours` to 1 minute
- Wait for scheduler to run
- Verify reminder received
- Check `RsvpReminderSent` record

---

## 13. Implementation Checklist

### Phase 1: Database Schema

- [x] Create `RsvpReminderSent` model in Prisma schema
- [x] Add indexes (all indexes included in model definition)
- [x] Add relations to `Rsvp`, `Store`, and `User` models
- [x] Generate Prisma client (schema validated)
- [x] Run `bun run dbpush` to apply schema changes to database

### Phase 2: Core Logic

- [x] Implement `ReminderProcessor` class
- [x] Implement `calculateReminderTime` utility
- [x] Add `handleReminder` to `RsvpNotificationRouter`
- [x] Add `buildReminderMessage` method
- [x] Add `"reminder"` event type
- [x] Add reminder translation keys to all locales (en, tw, jp)

### Phase 3: Scheduler

- [x] Create API route for cron job (`/api/cron-jobs/process-reminders`)
- [x] Create cron script at `bin/run-rsvp-reminders-cron.sh`
- [x] Add CRON_SECRET to environment variables documentation
- [x] Update design document with setup instructions
- [ ] Configure system cron job (manual step - see Section 7.1)
- [ ] Test cron job execution

**Setup Instructions:**

1. **Set CRON_SECRET environment variable:**

   ```bash
   # Generate a secure random string
   openssl rand -hex 32
   
   # Add to your .env file
   CRON_SECRET=generated_secret_here
   ```

2. **Copy script to system location:**

   ```bash
   sudo cp bin/run-rsvp-reminders-cron.sh /usr/local/bin/run-rsvp-reminders-cron.sh
   sudo chmod +x /usr/local/bin/run-rsvp-reminders-cron.sh
   ```

3. **Configure system cron:**

   ```bash
   sudo crontab -e
   # Add: */10 * * * * /usr/local/bin/run-rsvp-reminders-cron.sh >> /var/log/rsvp-reminders.log 2>&1
   ```

4. **Test the API endpoint manually:**

   ```bash
   curl -X GET http://localhost:3000/api/cron-jobs/process-reminders \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

### Phase 4: Internationalization

- [ ] Add reminder translation keys to all locales
- [ ] Test message formatting in all languages

### Phase 5: Testing

- [ ] Unit tests for reminder calculation
- [ ] Integration tests for reminder processing
- [ ] Manual testing with real reservations

### Phase 6: Monitoring

- [ ] Add logging for reminder processing
- [ ] Add metrics tracking
- [ ] Set up alerts

---

## 14. Future Enhancements

### 14.1 Multiple Reminders

Support multiple reminder times (e.g., 24 hours and 3 hours before):

- Add `reminderHours` array to `RsvpSettings`
- Track each reminder separately in `RsvpReminderSent`
- Send reminders at each configured time

### 14.2 Custom Reminder Messages

Allow store admins to customize reminder message templates:

- Store-specific reminder templates
- Variable substitution
- Multi-language support

### 14.3 Reminder Analytics

Track reminder effectiveness:

- No-show rate with/without reminders
- Reminder open rates
- Channel performance comparison

### 14.4 Smart Reminders

AI-powered reminder timing:

- Analyze customer behavior
- Optimize reminder time per customer
- A/B test reminder content

---

## Summary

This design document outlines a comprehensive system for sending RSVP reminder notifications. Key design decisions:

1. **Scheduled Processing**: Background job runs every 5-15 minutes to check for due reminders
2. **Time Window**: 5-minute window before/after current time to catch reminders reliably
3. **Channel Selection**: Respects store settings (`useReminderEmail`, etc.) and user preferences
4. **Tracking**: `RsvpReminderSent` table prevents duplicate reminders
5. **Timezone Awareness**: Reminders calculated in store's timezone
6. **Error Handling**: Comprehensive error handling with retry logic
7. **Internationalization**: Multi-language support for reminder messages

The system is designed to be reliable, scalable, and maintainable while providing flexibility for store administrators to configure reminder behavior according to their needs.

---

**End of Document**
