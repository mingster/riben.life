# Restaurant Reservation PRD

**Date:** 2025-11-13  
**Status:** Draft  
**Author:** GPT-5 Codex  
**Stakeholders:** Product Lead, Engineering Lead, Design Lead, Operations Lead, Customer Support Lead

---

## Overview

Build a complete reservation experience for partner restaurants within riben.life. The system should support browsing availability, booking a table, handling waits/cancellations, and equipping staff with simple management tools. Success means higher reservation conversions, reduced no-shows, and streamlined front-of-house operations.

---

## Goals & Non-Goals

- **Goals**
  - Let diners discover, reserve, and manage reservations for any restaurant on riben.life.
  - Give staff a real-time reservation calendar and daily run sheet.
  - Support waitlists, manual overrides, and notifications.
  - Collect data for analytics (utilization, guest history, no-shows).
  - Integrate with Google Maps and LINE to increase reservation acquisition and engagement.

- **Non-Goals**
  - Automated table allocation optimization beyond basic rules.
  - Customer loyalty programs or deeper CRM.
  - POS integration in this release.

---

## User Stories

- **Diner**
  - Visit riben.life system from Google Map, check date/time availability for party size.
  - Book instantly, receive confirmation and reminders.
  - Modify/cancel reservation, join wait list, add special notes.

- **Restaurant Staff**
  - View daily/weekly reservation view, seat guests, mark no-shows.
  - Adjust availability, block times, override reservations, manage waitlist.

- **Operations/Admin**
  - Monitor adoption and issues, update restaurant settings.

---

## Functional Requirements

### Diner Flow

1. Restaurant detail page: availability selector (date, time, party size), message when fully booked, waitlist option; support deep links from Google Maps Reserve with restaurant context prefilled.
2. Reservation form: contact info, special requests, policies.
3. Confirmation: on-screen and email/SMS; calendar links.
4. Manage reservation: modify or cancel from link/account.
5. Notifications: confirmation (immediate), reminder (24h/2h), change, cancellation sent via email, SMS, and LINE push (when opted in).
6. Waitlist: store requests, notify & auto-confirm or manual.

### Restaurant Staff (Store Admin)

1. Dashboard: timeline/agenda view with statuses, filters, quick actions.
2. Manage availability: opening hours, intervals, table capacity, blackout dates, require pre-paid or not.
3. Reservation management: create, edit, reassign, add walk-ins, mark seated/no-show.
4. Waitlist: view, confirm, notify.
5. Notes: internal vs customer-visible, tags (VIP, allergy).

### Ops/Admin

1. Global settings for buffer times, default reminder cadence, allowable modification window.
2. Dashboard reports: reservations/week, utilization, cancellations, no-shows, top diners.
3. Manual impersonation for support.

### External Integration Requirements

1. **Google Maps**
   - Sync real-time reservation availability to Google’s Reserve with Google platform.
   - Support inbound reservations initiated on Google Maps, including modifications/cancellations.
   - Surface restaurant rich data (photos, hours, cuisine) per Google policy.
2. **LINE**
   - Enable LINE Login for diners to link their account and share contact details.
   - Send reservation confirmations, reminders, and updates through the restaurant’s LINE Official Account.
   - Provide staff tooling to broadcast day-of updates to waitlisted diners via LINE messaging.

---

## Data Model (High Level)

Tables/entities:

- `Restaurant`: metadata, seating configuration.
- `TableGroup`: name, capacity, joinable flag.
- `TimeslotAvailability`: date/time, capacity remaining.
- `Reservation`: id, restaurantId, diner info (name, phone, email), party size, datetime, status (pending, confirmed, seated, completed, cancelled, no_show), source, special requests, internal notes, audit trail.
- `WaitlistEntry`: diner info, desired slot, status, auto-confirm flag.
- `Notification`: reservationId, channel (email/sms/line), type (confirmation, reminder), status.
- `IntegrationCredential`: restaurantId, provider (`google_maps`, `line`), credential metadata, token refresh info.

Need indexes on restaurantId+date/time, statuses.

---

## Success Metrics

- Reservation conversion rate from availability search.
- Reservation utilization (seated / confirmed).
- No-show rate post reminders.
- Average time to fill from waitlist.
- Staff adoption (active restaurants using dashboard weekly).
- Share of reservations sourced via Google Maps and LINE channels.

---

## Assumptions & Constraints

- Restaurants will preconfigure availability and basic seating rules manually.
- We integrate with existing user accounts but allow guest checkout with email/phone.
- SMS vendor available; fallback to email if SMS fails.
- Time zones handled per restaurant locale; guests can see in local time.
- MVP only supports English (or existing locales? confirm with product).
- Payment required to reserve by default.
- Google Maps Reserve onboarding requirements (merchant verification, SLAs) can be satisfied by partner operations.
- Restaurants will maintain a verified LINE Official Account for messaging compliance.

---

## Technical Considerations

- Next.js App Router with server components; SWR for client fetching.
- Server actions in `web/src/actions/storeAdmin/reservations/`.
- CRUD pattern per workspace rule: server page fetch → client table state → edit dialog.
- Notification service integration with channels for email, SMS, and LINE; include retries and logging traceability.
- Google Reserve API integration for availability updates and booking webhooks; ensure idempotent handling and rate limiting.
- LINE Messaging API integration using webhook callbacks for user opt-ins and message delivery status.
- Use Zod v4 for validation (client & server).
- Logger for success/error with metadata (restaurantId, reservationId, provider).
- Rate limiting for API endpoints (availability search and external webhooks).

---

## Phased Rollout

1. **Phase 1: Internal Prototype**
   - Single restaurant demo with manual availability.
   - Basic diner booking + admin view.
   - Email confirmations only.

2. **Phase 2: Pilot Launch**
   - Multi-restaurant support, SMS reminders, waitlist manual handling.
   - Staff dashboard daily view, manual overrides.
   - Basic analytics (CSV export).
   - Establish Google Maps Reserve integration for pilot restaurants with manual sync.

3. **Phase 3: GA**
   - Weekly view, auto waitlist confirmations.
   - Ops reporting dashboards.
   - Localization, multi-channel notifications, API endpoints.
   - Automated bidirectional sync with Google Maps and LINE messaging automation (opt-in flows, broadcast templates).

---

## Open Questions

- Do we allow anonymous guest reservations or require login?
- How many reminders? (24h & 2h default?) Need operations sign-off.
- Buffer logic: default 15 min before/after? per restaurant configurable?
- How to handle deposits/no-show fees (future integration with payments).
- Need to verify SMS provider coverage for target regions.
- Should diners see table type (e.g., patio vs indoor)?
- Are contracts and certifications for Google Reserve and LINE Messaging in place, and who owns maintenance?
- Should LINE notifications support two-way chat for last-minute guest messages?

---

## Next Steps

- Validate requirements with stakeholders; lock MVP scope.
- Create detailed UX wireframes (diner, staff).
- Finalize backend architecture & data model review.
- Define migration plan for existing manual reservations (if any).
- Set timeline & milestones per phase.
- Coordinate with operations/legal for Google and LINE integration approvals and sandbox access.
