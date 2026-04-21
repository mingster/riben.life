# RSVP Check-in Design

**Date:** 2025-01-28  
**Status:** Active  
**Related:** [Reservation-Check-in(預約簽到).md](./Reservation-Check-in(預約簽到).md)

## Overview

Staff-only RSVP check-in: store staff enter an 8-digit check-in code (or rsvpId) or scan the customer’s QR code on the store admin check-in page. No customer-facing check-in page at the store. Customers receive an 8-digit check-in code and its QR code in confirmation/reminder notifications (email, LINE) and show it to staff; staff scan the QR or enter the code to mark the reservation as checked in. Status flows to CheckedIn, check-in timestamp is recorded, and notifications are sent (customer + store staff).

## Data Model

### Rsvp (existing, extended)

- **status**: Add new value `CheckedIn = 45` (between Ready 40 and Completed 50).
- **checkedInAt**: New optional `BigInt?` — UTC epoch ms when the customer checked in.
- **checkInCode**: Optional `String?` — unique per store; 8-digit numeric code (e.g. date-based + random) generated on create; used by staff to look up and check in the reservation. `@@unique([storeId, checkInCode])`.

### RsvpStatus enum (types/enum.ts)

- Add `CheckedIn = 45` with comment `// 已簽到`.

### Status flow

- **Check-in allowed from:** `Ready` (40), `ReadyToConfirm` (10).
- **On check-in:** Set `status = CheckedIn`, `checkedInAt = getUtcNowEpoch()`, `updatedAt = getUtcNowEpoch()`.
- **Duplicate check-in:** If already `CheckedIn` or `Completed`, return success with message "Already checked in" (no error).

## Security & validation

- **Check-in** is staff-only (store admin). No customer-facing check-in page at the store.
- **Check-in action** accepts `storeId` and either `checkInCode` (8-digit) or `rsvpId` (UUID). At least one required.
- Validate: RSVP exists (by storeId + checkInCode, or by rsvpId with storeId match), `status` in [Ready, ReadyToConfirm] (or already CheckedIn/Completed for idempotent success).
- Check-in action is called from store admin only (authenticated store staff).

## API & routes

### Check-in page (store admin – staff only)

- **Route:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/checkin/page.tsx`
- **URL:** `/storeAdmin/[storeId]/checkin`
- **Behavior:**
  - **Manual entry:** Staff enter the 8-digit check-in code (or paste rsvpId) in a single input. Submit: if input is 8 digits, call check-in with `checkInCode`; otherwise use as `rsvpId`.
  - **QR scan:** Staff can tap "Scan QR code" to open the camera and scan the customer's QR (e.g. from LINE/email confirmation). The QR may encode the 8-digit code or a URL with `rsvpId`. Scanned content is parsed via `parseScannedCheckInValue` (8 digits → checkInCode; URL with rsvpId= or raw id → rsvpId); then check-in is called.
  - Success shows guest name and "Enter next code" / "Scan next"; already checked in or errors show appropriate message.

### Check-in code generation and parsing

- **Utility:** `src/utils/check-in-code.ts`
  - `generateCheckInCode(storeId, prisma)`: 2 digits from day-of-year + 6 random digits; ensures uniqueness per store; returns 8-digit string.
  - `isCheckInCodeInput(value)`: true if string is exactly 8 digits.
  - `parseScannedCheckInValue(scanned)`: for QR scan result — returns 8-digit code, or rsvpId from URL query `rsvpId=`, or raw id if it looks like cuid/uuid; otherwise null.
- **When:** Generated on RSVP create (store admin create, store reservation create, import); stored in `Rsvp.checkInCode`.

## Check-in code in customer notifications

When an RSVP is paid or confirmed ready, the **8-digit check-in code** (not a URL) is included in customer-facing notifications so the customer can show it to staff on arrival.

### When to include

- **ReadyToConfirm** (payment received): include check-in code in customer notification.
- **Ready** (reservation confirmed): include check-in code in customer notification.
- **Reminder** (upcoming reservation): include check-in code in the reminder message.

Do **not** include in **created** (new request, not yet paid) or in staff-only notifications.

### Implementation (RsvpNotificationRouter)

- **Context:** `RsvpNotificationContext` includes `checkInCode?: string | null`. All callers that send ready/reminder (create-rsvp unpaid_order_created, create-reservation, process-rsvp-after-payment, update-rsvp, reminder job) pass `checkInCode` from the rsvp when available.
- **Helper:** `buildCheckInMessageFooter(checkInCode, t)`: returns e.g. "Your check-in code: XXXXXXXX" using `notif_msg_checkin_code` when code is set; otherwise empty.
- **Helper:** `buildCheckInHtmlFooter(checkInCode, t)`: email HTML with code and QR image encoding the 8-digit code (for scanning by staff if desired).
- **LINE:** Reservation Flex message footer shows the check-in code and a QR that encodes the 8-digit code; payload uses `checkInCode` instead of check-in URL.
- **Append footer in:** `handleStatusChanged`, `handleReady`, `buildReminderMessage` (customer reminder only).

## Notifications

- **Event:** `status_changed` with `previousStatus` → `CheckedIn`.
- **Customer:** Subject/message like "You're checked in" / "您已簽到"; optional action URL to reservation history.
- **Store staff:** Subject/message like "Customer has arrived" / "客人已簽到"; action URL to store admin RSVP.
- **Implementation:** In `RsvpNotificationRouter.handleStatusChanged`, add branch for `status === RsvpStatus.CheckedIn`: notify customer (if customerId) and notify store staff; re-use existing `notifyStoreStaff` and `createNotification`; add `notif_status_CheckedIn` and message keys to i18n.

## Analytics & reporting

- **Check-in rate:** Count RSVPs with status CheckedIn or Completed vs. total RSVPs in a period (excluding Cancelled).
- **No-show:** RSVPs that remain Ready/ReadyToConfirm past rsvpTime (e.g. 15–30 min) without CheckedIn; can be marked NoShow by job or manually.
- **Store admin:** Existing RSVP list and history can filter/display by status CheckedIn; no new report required for Phase 1.

## Implementation phases

### Phase 1 (current)

1. Schema: `checkedInAt BigInt?`, `checkInCode String?` with `@@unique([storeId, checkInCode])` on Rsvp; `CheckedIn = 45` in enum.
2. Check-in code: `generateCheckInCode` in create flows (store admin create, store reservation create, import); `check-in-code.ts` util.
3. Action: `check-in-reservation.ts` accepts `checkInCode` or `rsvpId`; idempotent for already CheckedIn/Completed.
4. Store admin check-in page: code entry only (8-digit or rsvpId); no customer-facing check-in page at store.
5. Notifications: Check-in code in customer messages (email, LINE) and reminder; LINE Flex footer with code + QR encoding code; i18n `notif_msg_checkin_code`, `rsvp_checkin_code_hint`, etc.

### Phase 2 (later)

- No-show automation (mark Ready/ReadyToConfirm as NoShow after threshold).
- Optional: show check-in code/QR on store admin reservation detail and customer reservation history.

## File checklist

- [x] `doc/RSVP/DESIGN-RESERVATION-CHECK-IN.md` (this file)
- [x] `prisma/schema.prisma` — Rsvp.checkedInAt, Rsvp.checkInCode, unique(storeId, checkInCode)
- [x] `src/types/enum.ts` — RsvpStatus.CheckedIn
- [x] `src/utils/check-in-code.ts` — generateCheckInCode, isCheckInCodeInput
- [x] `src/actions/store/reservation/check-in-reservation.ts` (accepts checkInCode or rsvpId)
- [x] `src/actions/store/reservation/check-in-reservation.validation.ts`
- [x] Store admin: `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/checkin/` — code entry only (no store-front checkin page)
- [x] `src/lib/notification/rsvp-notification-router.ts` — CheckedIn branch, checkInCode in context, buildCheckInMessageFooter/Html with code
- [x] `src/lib/notification/channels/line-channel.ts` — reservation Flex uses checkInCode, QR encodes code
- [x] i18n: `notif_status_CheckedIn`, `notif_msg_checkin_code`, `rsvp_checkin_code_hint`, etc. (en, tw, jp)
