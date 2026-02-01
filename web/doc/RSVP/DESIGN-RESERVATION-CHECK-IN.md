# RSVP Check-in Design

**Date:** 2025-01-28  
**Status:** Active  
**Related:** [Reservation-Check-in(預約簽到).md](./Reservation-Check-in(預約簽到).md)

## Overview

Design and implementation for self-service RSVP check-in: QR code or reservation code, status update to CheckedIn, check-in timestamp, notifications (customer + store staff), and integration with existing RSVP and notification systems.

## Data Model

### Rsvp (existing, extended)

- **status**: Add new value `CheckedIn = 45` (between Ready 40 and Completed 50).
- **checkedInAt**: New optional `BigInt?` — UTC epoch ms when the customer checked in.

### RsvpStatus enum (types/enum.ts)

- Add `CheckedIn = 45` with comment `// 已簽到`.

### Status flow

- **Check-in allowed from:** `Ready` (40), `ReadyToConfirm` (10).
- **On check-in:** Set `status = CheckedIn`, `checkedInAt = getUtcNowEpoch()`, `updatedAt = getUtcNowEpoch()`.
- **Duplicate check-in:** If already `CheckedIn` or `Completed`, return success with message "Already checked in" (no error).

## Security & validation

- **Check-in endpoint** accepts `storeId` and `rsvpId` (from QR or manual input).
- Validate: RSVP exists, `rsvp.storeId === storeId`, `status` in [Ready, ReadyToConfirm] (or already CheckedIn/Completed for idempotent success).
- No auth required for check-in (customer scans QR or enters code on kiosk/phone).
- Optional future: short-lived signed token in QR (e.g. `rsvpId` + HMAC) to avoid guessing rsvpIds; for Phase 1, storeId + rsvpId is acceptable if IDs are UUIDs.

## API & routes

### Server action (store)

- **Module:** `src/actions/store/reservation/check-in-reservation.ts`
- **Input:** `{ storeId: string, rsvpId: string }` (Zod).
- **Logic:**
  1. Load RSVP by id, ensure storeId matches.
  2. If status is CheckedIn or Completed → return `{ success: true, alreadyCheckedIn: true }`.
  3. If status not in [Ready, ReadyToConfirm] → return `{ success: false, error: "..." }`.
  4. Update: `status = CheckedIn`, `checkedInAt = getUtcNowEpoch()`, `updatedAt = getUtcNowEpoch()`.
  5. Call notification router with `status_changed` (previousStatus → CheckedIn).
  6. Return `{ success: true, rsvp: ... }`.

### Check-in page (store front)

- **Route:** `src/app/s/[storeId]/checkin/page.tsx`
- **URL:** `/s/[storeId]/checkin?rsvpId=xxx` (QR encodes this URL).
- **Behavior:**
  - Server page: read `storeId`, `rsvpId` from params/query; optionally validate RSVP exists and show store name.
  - Client: on load (or "Check in" button), call `checkInReservationAction({ storeId, rsvpId })`; show success ("You're checked in") or error; mobile-friendly.
- **Manual code entry:** Same page can have an input for reservation code (rsvpId); submit triggers same action.

## QR code

- **Payload:** Full check-in URL: `https://<origin>/s/<storeId>/checkin?rsvpId=<rsvpId>`.
- **Generation:** Use existing `next-qrcode` or `qr-code-styling`; generate when displaying reservation details (e.g. store admin RSVP detail, customer reservation history, confirmation/reminder notifications).
- **Where to show:** Reservation confirmation/reminder notifications (email, LINE, etc.), store admin reservation detail/edit, customer reservation history/detail.

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

### Phase 1 (this implementation)

1. Schema: Add `checkedInAt BigInt?` to Rsvp; add `CheckedIn = 45` to enum.
2. Action: `check-in-reservation.ts` + validation; idempotent for already CheckedIn/Completed.
3. Page: `/s/[storeId]/checkin` with query `rsvpId`; client calls action and shows result.
4. Notifications: Handle CheckedIn in notification router; add i18n keys.
5. Store admin / customer UI: Optional display of CheckedIn and checkedInAt; QR generation on reservation detail can follow in a later iteration.

### Phase 2 (later)

- QR code in confirmation/reminder emails and LINE.
- QR code on store admin reservation detail and customer reservation history.
- Optional short-lived signed token in QR for extra security.
- No-show automation (mark Ready/ReadyToConfirm as NoShow after threshold).

## File checklist

- [x] `doc/RSVP/DESIGN-RESERVATION-CHECK-IN.md` (this file)
- [x] `prisma/schema.prisma` — Rsvp.checkedInAt
- [x] `src/types/enum.ts` — RsvpStatus.CheckedIn
- [x] `src/actions/store/reservation/check-in-reservation.ts`
- [x] `src/actions/store/reservation/check-in-reservation.validation.ts`
- [x] `src/app/s/[storeId]/checkin/page.tsx` (server) + `components/checkin-client.tsx`
- [x] `src/lib/notification/rsvp-notification-router.ts` — CheckedIn branch + STATUS_KEYS
- [x] i18n: `notif_status_CheckedIn`, `notif_subject_customer_checked_in`, `notif_subject_your_reservation_checked_in`, `rsvp_checkin_*` (en, tw, jp)
