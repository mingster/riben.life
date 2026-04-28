# RSVP System Overview

**Last updated:** 2026-04-28
**Status:** Active

This document is the consolidated reference for the RSVP (reservation/appointment) system. It reflects the actual implementation state as of the date above.

Detailed sub-documents:

- [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md) — full business requirements and use cases
- [TECHNICAL-REQUIREMENTS-RSVP.md](./TECHNICAL-REQUIREMENTS-RSVP.md) — technical specs
- [DESIGN-RSVP-MULTI-MODE.md](./DESIGN-RSVP-MULTI-MODE.md) — facility, personnel, restaurant mode design
- [RSVP-STATS-DASHBOARD.md](./RSVP-STATS-DASHBOARD.md) — analytics dashboard spec
- [../NOTIFICATION/DESIGN-RSVP-NOTIFICATION.md](../NOTIFICATION/DESIGN-RSVP-NOTIFICATION.md) — notification routing design
- [../INTEGRATIONS/GOOGLE-CALENDAR/DESIGN-RSVP-GOOGLE-CALENDAR-SYNC.md](../INTEGRATIONS/GOOGLE-CALENDAR/DESIGN-RSVP-GOOGLE-CALENDAR-SYNC.md) — Google Calendar sync design
- [../INTEGRATIONS/LINE/LIFF-RSVP.md](../INTEGRATIONS/LINE/LIFF-RSVP.md) — LINE LIFF integration design

---

## 1. What is the RSVP system?

A multi-tenant reservation and appointment system. Any store on the platform can enable RSVP to accept customer bookings for facilities (rooms, courts, tables) and/or service staff (coaches, stylists, therapists). It supports prepayment, refunds, notifications, calendar sync, and a full admin management UI.

---

## 2. Booking Modes

Configured via `RsvpSettings.rsvpMode` (integer).

| Mode | Value | Flow |
|------|-------|------|
| Facility | 0 | Customer picks a facility, then a time slot |
| Personnel | 1 | Customer picks a date, then a staff member with openings, then a time slot |
| Restaurant | 2 | Customer picks date/time and party size; no facility or staff selection |

All three modes share the same `Rsvp` schema row and `ReservationFlowClient` component. Mode wrappers:

- `facility-mode-reservation-client.tsx`
- `personnel-service-staff-reservation-client.tsx`
- `restaurant-mode-reservation-client.tsx`

---

## 3. Reservation Status Lifecycle

```
Pending (0)
  └─ [payment completes or no prepay required]
     └─> ReadyToConfirm (10)
           └─ [store confirms, or noNeedToConfirm=true]
              └─> Ready (40)
                    ├─ [customer confirms] → ConfirmedByCustomer (41)
                    ├─ [staff checks in]  → CheckedIn (45)
                    │                          └─> Completed (50)
                    └─ [staff marks]      → NoShow (70)

Any active status → Cancelled (60) [by customer or staff]
```

Additional boolean fields track payment and confirmation independently:

| Field | Meaning |
|-------|---------|
| `alreadyPaid` | Prepayment has been received |
| `confirmedByStore` | Staff/admin confirmed the booking |
| `confirmedByCustomer` | Customer confirmed attendance |

---

## 4. Key Settings (`RsvpSettings`)

| Field | Purpose |
|-------|---------|
| `acceptReservation` | Master on/off switch |
| `rsvpMode` | 0=facility, 1=personnel, 2=restaurant |
| `singleServiceMode` | Only one booking per time slot (personal shops) |
| `noNeedToConfirm` | Auto-confirm after payment, skip ReadyToConfirm |
| `mustSelectFacility` | Facility selection is required |
| `mustHaveServiceStaff` | Staff selection is required |
| `minPrepaidPercentage` | Required prepayment as % of total cost (0 = no prepay) |
| `minPrepaidAmount` | Fixed minimum prepayment amount |
| `canCancel` | Allow customer-initiated cancellations |
| `cancelHours` | Hours before reservation; cancellations after this window get no refund |
| `canReserveBefore` | Minimum lead time in minutes (default 120) |
| `canReserveAfter` | Maximum booking horizon in hours (default 2190 = 3 months) |
| `defaultDuration` | Default slot length in minutes (default 60) |
| `showCostToCustomer` | Display pricing in customer booking form |
| `requireSignIn` | Customer must be authenticated to book |
| `requireSignature` | Require customer signature (see §8 for status) |
| `requireName` / `requirePhone` | Contact info requirements |
| `maxCapacity` | Restaurant mode: max party count per slot (0 = unlimited) |
| `useBusinessHours` / `rsvpHours` | RSVP-specific business hours override |

---

## 5. Data Model Summary

**Core tables:**

- `Rsvp` — one row per reservation (facility cost, service staff cost, status, check-in code, etc.)
- `RsvpSettings` — one row per store
- `RsvpBlacklist` — blocked customers per store
- `RsvpTag` — tags for organizing reservations
- `RsvpConversation` / `RsvpConversationMessage` — per-RSVP messaging thread
- `RsvpReminderSent` / `RsvpCustomerConfirmSent` — dedup tracking for scheduled sends

**Related tables used by RSVP:**

- `Facility` — bookable resources with optional business hours, cost, capacity
- `ServiceStaff` — staff members with `businessHours`, `defaultCost`, `defaultCredit`
- `ServiceStaffFacilitySchedule` — per-facility availability windows for staff (schema + utils implemented; see §8)
- `StoreOrder` — payment order linked to RSVP when prepay required
- `CustomerCredit` — fiat balance (HOLD/SPEND for RSVP prepay) and credit points

---

## 6. Payments and Refunds

**Prepay flow:**

1. Customer submits form → `createReservationAction` creates `Rsvp` (status=Pending) and an unpaid `StoreOrder`.
2. Customer redirected to `/checkout/[orderId]`.
3. Customer pays via Stripe, LINE Pay, credit points, or fiat balance.
4. Payment webhook/handler calls `processRsvpAfterPaymentAction`:
   - `alreadyPaid = true`
   - Status advances to `ReadyToConfirm (10)` or `Ready (40)` if `noNeedToConfirm=true`.

### 6.1 Post-payment identity handoff (anonymous / phone-matched)

To avoid post-payment identity mismatch when a reservation is created from an anonymous context but should belong to an existing customer account:

1. Checkout success pages server-fetch RSVP context by `orderId`.
2. `SuccessAndRedirect` receives `rsvp`, `returnUrl`, and a short-lived signed `postPaymentSignInToken`.
3. When RSVP owner (`rsvp.customerId`) differs from current session user and target is reservation history, the client redirects to:
   - `GET /api/rsvp-post-payment-signin?token=...&returnUrl=...`
4. The API validates token, order paid-state, and RSVP↔order ownership, then creates a Better Auth session for `order.userId` and redirects to `returnUrl`.

Key implementation files:

- `src/utils/rsvp-post-payment-token.ts`
- `src/lib/rsvp/get-post-payment-signin-props.ts`
- `src/app/api/rsvp-post-payment-signin/route.ts`
- `src/components/success-and-redirect.tsx`

### 6.2 Signed-in vs guest path notes

- **Real signed-in user (non-guest):** phone lookup path is skipped in `createReservationAction`; `finalCustomerId` remains session user.
- **Guest session already present (`guest-*@riben.life`):** `finalCustomerId` precedence still favors existing session user id; phone match may set `requiresSignIn` for prepaid flows but does not overwrite `finalCustomerId`.
- **Prepaid + phone match + session mismatch:** server returns `requiresSignIn=true`; client redirects to `/signIn?callbackUrl=<checkout-url>` (no anonymous auto-sign-in).
- **Checkout return path:** reservation flows now propagate `returnUrl=/s/{storeId}/reservation/history` through checkout and PSP-confirmed pages.

**Revenue recognition (on `complete-rsvp`):**

| Scenario | What happens |
|----------|-------------|
| Paid with credit points | HOLD → SPEND; `StoreLedger` entry created |
| Paid with fiat (Stripe/LINE Pay/etc.) | HOLD → SPEND; `StoreLedger` entry created |
| No prepay | Credit deducted from customer fiat balance; `StoreLedger` entry created |

**Refunds (`cancel-rsvp` / `cancel-reservation`):**

- Cancelled **outside** `cancelHours` window: full refund of held amount.
- Cancelled **inside** `cancelHours` window: no refund.
- Refund logic is transactionally atomic (both cancel and refund in one DB transaction).
- Fiat: `processRsvpFiatRefund`; credit points: `processRsvpCreditPointsRefund`.

---

## 7. Notifications

All RSVP notifications go through `RsvpNotificationRouter` (`src/lib/notification/rsvp-notification-router.ts`). Callers pass an `RsvpNotificationContext` with an `eventType`; the router decides recipients, channels, and message format.

**Event types:** `created`, `updated`, `cancelled`, `deleted`, `confirmed_by_store`, `confirmed_by_customer`, `status_changed`, `payment_received`, `ready`, `completed`, `no_show`, `unpaid_order_created`, `reminder`.

**Channels:** email, LINE (Messaging API with Flex templates), push (on-site), SMS (registered, see §8).

**Scheduled sends:**

- Cron: `process-reminders` — sends reminder N hours before reservation time.
- Cron: `process-rsvp-customer-confirm` — sends confirmation request to customer N hours before.
- Cron: `cleanup-unpaid-rsvps` — deletes stale Pending RSVPs with no payment.

---

## 8. Implementation Status

### Implemented

| Feature | Key files |
|---------|-----------|
| Customer booking (all 3 modes) | `src/app/s/[storeId]/reservation/` |
| Admin RSVP management | `src/app/storeAdmin/.../rsvp/` |
| Admin RSVP settings | `src/app/storeAdmin/.../rsvp-settings/` |
| Lifecycle actions (confirm, check-in, complete, no-show, cancel) | `src/actions/storeAdmin/rsvp/` |
| Prepay + checkout integration | `src/actions/store/reservation/create-rsvp-store-order.ts` |
| Post-payment sign-in handoff (phone-matched) | `src/app/api/rsvp-post-payment-signin/route.ts`, `src/utils/rsvp-post-payment-token.ts`, `src/lib/rsvp/get-post-payment-signin-props.ts`, `src/components/success-and-redirect.tsx` |
| Refunds (fiat + credit points, atomic) | `process-rsvp-refund-fiat.ts`, `process-rsvp-refund-credit-point.ts` |
| Cancel policy enforcement | `src/utils/rsvp-cancel-policy-utils.ts` |
| Business hours validation (store, facility, staff) | `src/utils/rsvp-utils.ts` |
| Service staff facility schedules (schema + utils) | `src/utils/service-staff-schedule-utils.ts`, `ServiceStaffFacilitySchedule` model |
| Blacklist | `src/actions/storeAdmin/rsvp-blacklist/` |
| Conversation/messaging | `src/actions/store/reservation/send-reservation-message.ts` |
| Notifications (email, LINE, push) | `src/lib/notification/rsvp-notification-router.ts` |
| Reminder cron + customer confirm cron | `src/app/api/cron-jobs/` |
| Unpaid RSVP cleanup cron | `src/app/api/cron-jobs/cleanup-unpaid-rsvps/` |
| Stats dashboard | `src/app/storeAdmin/.../components/rsvp-stats.tsx` |
| Customer reservation history | `src/app/s/[storeId]/reservation/history/` |
| Guest-session history query merge (`customerId=session OR null`) | `src/app/s/[storeId]/reservation/history/page.tsx` |
| Customer calendar export (ICS) | `src/components/rsvp-calendar-export-buttons.tsx` |
| Google Calendar sync — store admin | `src/actions/storeAdmin/google-calendar/` (connect, disconnect, resume) |
| Google Calendar sync — customer event | `src/lib/google-calendar/sync-rsvp-to-google-calendar.ts` |
| LIFF reservation page (facility mode) | `src/app/(root)/liff/[storeId]/reservation/[facilityId]/` |
| Service staff admin CRUD | `src/app/storeAdmin/.../service-staff/` |
| Customer-created RSVP service staff cost | `create-reservation.ts`, `create-rsvp-store-order.ts` |
| Admin-created RSVP service staff cost | `src/actions/storeAdmin/rsvp/create-rsvp.ts` |
| Unpaid order notification to customer | `rsvp-notification-router.ts` (`unpaid_order_created` event) |

---

### Not Yet Implemented

**1. Recurring reservations**

- No `seriesId` on the `Rsvp` model.
- No UI for selecting recurring pattern, no series management, no bulk cancel/edit.
- Fully designed in `FUNCTIONAL-REQUIREMENTS-RSVP.md` §3.4.4 and §3.1.1a.
- Affects: booking form, admin RSVP list, payment flow (per-occurrence vs series-upfront).

**2. Service staff products (hour-block purchases)**

- No model for purchasable service packages (e.g., "Tennis Lesson 10H").
- Import parser can extract product names; admin UI and purchase flow are missing.
- Tracked in [TODO-RSVP-REVIEW-unfinished-logic.md](../TODO-RSVP-REVIEW-unfinished-logic.md) §1.

**3. Personnel mode: dynamic available-slots API**

- Spec in [DESIGN-RSVP-MULTI-MODE.md](./DESIGN-RSVP-MULTI-MODE.md) Phase 4 calls for `GET /api/store/[storeId]/service-staff/available-slots?staffId=&date=`.
- This endpoint does not exist. The personnel booking page currently loads all staff; date-based filtering of staff availability is not yet API-driven.

**4. Facility-specific staff schedules (full booking integration)**

- `ServiceStaffFacilitySchedule` schema and `service-staff-schedule-utils.ts` are implemented.
- Admin UI to create/manage per-facility schedules for a staff member is missing.
- Booking flow does not yet use `ServiceStaffFacilitySchedule` for slot availability; it falls back to `ServiceStaff.businessHours`.

**5. Reserve with Google integration**

- Schema fields exist (`reserveWithGoogleEnabled`, OAuth tokens, sync status, etc.) in `RsvpSettings`.
- Settings toggle exists in admin UI.
- No actual API calls to Google's Reserve with Google service, no webhook handler, no sync logic.

**6. Customer signature collection**

- `RsvpSettings.requireSignature` field exists in schema and is saved by settings action.
- No signature capture UI in the booking form (no canvas/pad component).
- No signature storage (no `signatureData` field on `Rsvp`).

**7. Reservation source tracking**

- `FR-RSVP-009` requires staff-created RSVPs to record source (phone call, walk-in, in-person).
- No `source` field on `Rsvp` schema. Not surfaced in admin create form.

**8. SMS notifications**

- `SmsChannel` adapter is registered in `register-channel-adapters.ts`.
- No SMS provider credentials or sending logic is visible in `sms-channel.ts` (channel exists as a stub).
- References to `useReminderSMS` in docs are not implemented end-to-end.

**9. Advanced analytics and reporting**

- Current stats dashboard shows week/month/year totals for revenue, facility usage, service staff, and new customers.
- Not yet: custom date range, historical trend charts, CSV/Excel export, drill-down views, comparison with prior period, utilization/occupancy rates.
- Designed in [RSVP-STATS-DASHBOARD.md](./RSVP-STATS-DASHBOARD.md) §Future Enhancements.

**10. LINE LIFF app (phases 2 and 3)**

- Phase 1 partial: facility-mode booking page at `src/app/(root)/liff/[storeId]/reservation/[facilityId]/`.
- Phases 2/3 (store discovery, AI chat booking, saved stores, cancel/confirm from LINE) are design only.
- Designed in [../INTEGRATIONS/LINE/LIFF-RSVP.md](../INTEGRATIONS/LINE/LIFF-RSVP.md).

**11. Waitlist ↔ RSVP integration**

- `WaitlistSettings` model exists (separate from RSVP).
- No integration with RSVP slot availability (auto-notify waitlist when cancellation opens a slot).
- `FR-RSVP-038` auto-confirm option is noted as a future enhancement.

**12. Apple Calendar sync**

- `syncWithApple` toggle exists in settings form and is persisted to `RsvpSettings`.
- No actual sync or ICS generation logic for Apple Calendar.
- `FR-RSVP-032` describes both Google and Apple Calendar sync; only Google is implemented.

**13. RSVP tags management**

- `RsvpTag` model exists in schema.
- No admin CRUD UI to create or manage tags.
- No UI to assign tags to individual reservations (in booking form or admin detail view).
- `FR-RSVP-048` / `FR-RSVP-050` describe tag creation, assignment, and filtering.

**14. Secondary reminders (2 hours before)**

- Current reminder cron fires once at `reminderHours` before the reservation (default 24 hours).
- `FR-RSVP-042` specifies a secondary reminder (2 hours before) as configurable; not implemented.
- No second scheduled send or separate `reminderHours2` field in `RsvpSettings`.

**15. LINE broadcast messaging**

- `FR-RSVP-055` requires store staff to send LINE broadcast messages to waitlisted or confirmed customers (day-of updates, announcements).
- No broadcast UI in store admin or LINE integration layer.

---

## 9. File Map

```
web/src/
├── actions/
│   ├── store/reservation/          # Customer-facing RSVP actions
│   └── storeAdmin/
│       ├── rsvp/                   # Admin RSVP lifecycle actions
│       ├── rsvpSettings/           # Settings CRUD
│       ├── rsvp-blacklist/         # Blacklist management
│       ├── serviceStaff/           # Service staff CRUD
│       └── google-calendar/        # Google Calendar connection
├── app/
│   ├── s/[storeId]/reservation/    # Customer booking pages
│   │   └── history/                # Customer reservation history (guest-aware query)
│   ├── storeAdmin/.../rsvp/        # Admin RSVP history + manage
│   ├── storeAdmin/.../rsvp-settings/ # Admin settings page
│   ├── storeAdmin/.../service-staff/ # Admin service staff page
│   └── api/
│       ├── cron-jobs/cleanup-unpaid-rsvps/
│       ├── cron-jobs/process-rsvp-customer-confirm/
│       ├── cron-jobs/process-reminders/
│       ├── rsvp-post-payment-signin/
│       └── storeAdmin/[storeId]/rsvp/stats/
├── components/
│   ├── rsvp-pricing-summary.tsx
│   ├── rsvp-cancel-policy-info.tsx
│   ├── rsvp-status-legend.tsx
│   ├── rsvp-calendar-export-buttons.tsx
│   └── display-reservations.tsx
├── lib/
│   ├── notification/rsvp-notification-router.ts
│   └── google-calendar/sync-rsvp-to-google-calendar.ts
└── utils/
    ├── rsvp-utils.ts
    ├── rsvp-status-utils.ts
    ├── rsvp-cancel-policy-utils.ts
    ├── rsvp-prepaid-utils.ts
    ├── rsvp-post-payment-token.ts
    ├── rsvp-time-window-utils.ts
    ├── rsvp-customer-confirm-token.ts
    ├── rsvp-conversation-utils.ts
    ├── service-staff-schedule-utils.ts
    └── pricing/calculate-rsvp-price.ts
```
