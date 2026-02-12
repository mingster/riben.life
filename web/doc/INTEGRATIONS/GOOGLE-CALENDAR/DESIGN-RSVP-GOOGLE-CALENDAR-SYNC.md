# Design: RSVP ↔ Google Calendar Sync Integration

**Date:** 2025-02-06  
**Status:** Design Document  
**Version:** 1.0  

**Related Documents:**

- [RSVP Functional Requirements](../../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [RSVP Technical Requirements](../../RSVP/TECHNICAL-REQUIREMENTS-RSVP.md)
- [INTEGRATIONS README](../README.md)

---

## 1. Overview

This document describes the design for integrating the RSVP (reservation) system with Google Calendar. The integration allows store staff and optionally customers to see reservations as calendar events and keep them in sync when reservations are created, updated, or cancelled.

### 1.1 Purpose

- **Store calendar**: Store admins/staff connect a Google Calendar; new and updated RSVPs appear as events so the store can manage capacity and view reservations alongside other calendar items.
- **Customer calendar** (optional): Customers can add a reservation to their own Google Calendar (e.g. “Add to Google Calendar” button) for personal scheduling.
- **Single source of truth**: RSVP remains the source of truth; Google Calendar is a mirror for display and convenience.

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| One-way sync: RSVP → Google Calendar (create/update/delete events) | Editing events in Google Calendar and syncing back to RSVP |
| Store-level calendar connection (one calendar per store) | Multiple calendars per store |
| Optional “Add to Google Calendar” for customers (ICS or one-time event add) | Full bidirectional sync |
| Timezone handling using Store.defaultTimezone | Calendar-driven booking flows |

---

## 2. Actors and Use Cases

### 2.1 Store Admin / Store Staff

- **Connect Google Calendar**: Authorize the app with Google (OAuth2) and select or create a calendar to receive RSVP events.
- **Automatic sync**: When an RSVP is created, updated, or cancelled, the corresponding Google Calendar event is created, updated, or removed.
- **Disconnect**: Revoke the calendar connection; existing events may be left as-is or optionally removed (configurable).

### 2.2 Customer (Optional)

- **Add to my calendar**: From a reservation confirmation or history page, click “Add to Google Calendar” to create one event in the user’s Google Calendar (or download an ICS file). No ongoing link required.

---

## 3. Sync Model

### 3.1 Direction and Ownership

- **Primary**: RSVP → Google Calendar (one-way).
- **Authority**: RSVP data (including status) is authoritative. Calendar events are derived and updated when RSVP changes.
- **Idempotency**: Each RSVP is associated with at most one Google Calendar event ID per calendar (store calendar or one-off customer add). Updates use PATCH; cancellations delete or mark event cancelled as appropriate.

### 3.2 When to Sync

| RSVP event | Store calendar action |
|------------|------------------------|
| Create RSVP | Create calendar event |
| Update RSVP (time, facility, party size, status, etc.) | Update calendar event (or delete if cancelled) |
| Cancel RSVP (status → cancelled) | Delete event or set to cancelled depending on API behavior |
| RSVP deleted | Delete calendar event if it exists |

Customer “Add to Google Calendar” is a one-time create; no ongoing sync for that event.

---

## 4. Data Mapping: RSVP → Calendar Event

### 4.1 RSVP Fields (Reference)

Relevant fields from `Rsvp` (see `prisma/schema.prisma`):

- `id`, `storeId`, `rsvpTime` (BigInt, UTC epoch ms), `arriveTime`, `status`
- `numOfAdult`, `numOfChild`, `name`, `phone`, `message`
- `facilityId`, `facilityCost`, `facilityCredit`, `serviceStaffId`, etc.
- `createdAt`, `updatedAt`

Store has `defaultTimezone` (e.g. `"Asia/Taipei"`) for displaying and formatting event times.

### 4.2 Mapping to Google Calendar Event

| Calendar field | Source | Notes |
|----------------|--------|--------|
| **summary** | Store name + customer name (or “Anonymous”) + party size | e.g. “Restaurant A – 王小明 – 2 guests” |
| **description** | Optional: message, facility, phone, RSVP link | Plain text or simple HTML |
| **start** | `rsvpTime` | Convert to store timezone for `dateTime` (RFC3339) |
| **end** | `rsvpTime` + default duration (e.g. 2 hours) or from RsvpSettings | Same timezone as start |
| **location** | Store address | From Store if available |
| **extendedProperties.private** | `rsvpId`, `storeId` | For idempotent updates and webhook correlation |
| **status** | Derived from RSVP status | “confirmed” or “cancelled” (or delete event) |

For **cancelled** RSVPs, either delete the event or set `event.status = "cancelled"` and keep it for audit; design choice per product preference.

---

## 5. Authentication and Authorization

### 5.1 Store Calendar (Google OAuth)

- **Flow**: OAuth 2.0 with Google (Calendar scope, e.g. `https://www.googleapis.com/auth/calendar.events` or calendar-specific scope).
- **Storage**: Store the refresh token (and optionally access token) securely per store, e.g. in a new table such as `StoreGoogleCalendarConnection` (see Data Model below).
- **Actor**: Store Admin (or Staff if permission is granted) performs “Connect Google Calendar” in store settings; the connection is store-level.
- **Scopes**: Minimum required for creating/updating/deleting events (e.g. `calendar.events`).

### 5.2 Customer “Add to Google Calendar”

- **Option A – Redirect**: User clicks “Add to Google Calendar”; open Google Calendar web URL with pre-filled query params (title, dates, location, description). No OAuth or token storage.
- **Option B – OAuth**: User signs in with Google and the app creates the event via API. Requires one-time OAuth and token handling; more control, more complexity.
- **Option C – ICS download**: Generate an ICS file with the reservation details; user downloads and imports into any calendar (Google or other). No Google-specific auth.

Recommendation: Support **Option A** and **Option C** for minimal scope; add Option B if product requires in-account event creation.

---

## 6. Technical Approach

### 6.1 Google Calendar API

- Use [Google Calendar API v3](https://developers.google.com/calendar/api/v3/reference) (events: insert, patch, delete).
- Server-side only: all API calls from the Next.js backend using the store’s (or user’s) stored credentials.
- Use a server action or API route that receives RSVP lifecycle events and performs the calendar write.

### 6.2 Triggering Sync (Store Calendar)

- **Option 1 – Application events**: On RSVP create/update/delete (in existing server actions or DB hooks), call a small “sync to Google Calendar” service that:
  - Loads the store’s Google Calendar connection.
  - If present, creates/updates/deletes the event by `rsvpId` (via extendedProperties or a local mapping table).
- **Option 2 – Queue**: Emit a message (e.g. “rsvp.created”, “rsvp.updated”, “rsvp.deleted”) to an internal queue; a worker consumes and performs the calendar sync. Prefer this if the codebase already uses a job queue and to avoid blocking the HTTP response.
- **Option 3 – Scheduled job**: Periodic job that compares RSVPs with calendar events and reconciles; more complex and usually unnecessary if Option 1 or 2 is implemented.

Recommendation: Start with **Option 1** (direct call from RSVP mutation path) for simplicity; move to Option 2 if latency or reliability requires it.

### 6.3 Idempotency and Mapping

- Store a mapping from `rsvpId` → `googleCalendarEventId` (and optionally `calendarId`) in the database so that:
  - Updates use PATCH with the existing event ID.
  - Cancellations/deletes call the delete endpoint with that ID.
- If the calendar event was deleted externally, the next RSVP update can either create a new event (treat as “event not found”) or surface an error and ask the store to re-authorize.

### 6.4 Timezone

- Store `rsvpTime` in DB is UTC (epoch ms). When building the Google Calendar event:
  - Convert to the store’s `defaultTimezone` for display and for the event’s `start`/`end` in RFC3339 (with timezone offset or use Google’s timeZone field for the event).
- Use existing project utilities (e.g. `getDateInTz`, `convertStoreTimezoneToUtc`) for consistency with the rest of the app.

### 6.5 Error Handling and Observability

- **Refresh token expired / revoked**: On 401/403 from Google, mark the store connection as invalid and notify the store admin (e.g. banner in store settings: “Reconnect Google Calendar”).
- **Rate limits**: Respect Google Calendar API quotas; implement exponential backoff and optional queue for retries.
- **Logging**: Log sync attempts (rsvpId, storeId, eventId, success/failure) for debugging and auditing; avoid logging sensitive customer data in plain text.

---

## 7. Data Model (Proposed)

### 7.1 Store Google Calendar Connection

Store-level connection for “RSVP → store calendar” sync:

```txt
StoreGoogleCalendarConnection (proposed)
- id (PK)
- storeId (FK → Store, unique)
- googleCalendarId (e.g. "primary" or specific calendar id)
- refreshToken (encrypted or in secrets manager)
- accessToken (optional, short-lived)
- accessTokenExpiry (optional)
- createdAt, updatedAt
- connectedBy (userId, optional)
```

- One row per store; only one calendar per store in this design.
- Tokens must be stored securely (env/secrets manager and encryption at rest as per project standards).

### 7.2 RSVP – Calendar Event Mapping

For idempotent updates and deletes:

```txt
RsvpGoogleCalendarEvent (proposed)
- id (PK)
- rsvpId (FK → Rsvp, unique per store calendar)
- storeId (FK → Store)
- googleCalendarEventId (Google’s event id)
- googleCalendarId (which calendar)
- createdAt, updatedAt
```

- When an RSVP is updated, look up by `rsvpId` (and optionally `storeId`) and PATCH the event with `googleCalendarEventId`.
- When an RSVP is cancelled or deleted, delete the event and remove or soft-delete the mapping row.

---

## 8. UI/UX Considerations

### 8.1 Store Settings

- **Location**: Store Admin → Settings → Integrations (or “Calendar”).
- **Actions**: “Connect Google Calendar” (starts OAuth), “Disconnect”, “Sync now” (optional manual full sync).
- **Status**: Show connection status (Connected as X / Not connected) and last sync time if applicable.

### 8.2 Customer “Add to Google Calendar”

- **Place**: Reservation confirmation page and/or reservation history/detail.
- **Control**: Single button: “Add to Google Calendar” or “Add to calendar” with dropdown (Google Calendar, ICS download).
- **No account link**: No need to store the user’s Google credentials for this flow when using redirect or ICS.

---

## 9. Edge Cases and Assumptions

| Case | Handling |
|------|----------|
| Store disconnects calendar | Stop syncing; optionally delete all events created by the app for that calendar (optional feature). |
| Google returns 404 for event | Treat as “event no longer exists”; clear mapping and optionally create a new event on next update. |
| RSVP created before connection | No automatic backfill unless “Sync now” or a backfill job is implemented; optional for v1. |
| Multiple stores | Each store has its own connection and mapping; no cross-store calendar. |
| Concurrent updates | Use RSVP `updatedAt` and last-write-wins for the calendar event; avoid double-sync by checking timestamps or a simple lock if needed. |
| Customer has no Google account | ICS download works for any calendar app; redirect to Google Calendar is optional. |

---

## 10. Security and Privacy

- **Tokens**: Store Google refresh/access tokens in a secure backend store; never expose to the client.
- **Scopes**: Request only Calendar scopes needed for events (create/update/delete).
- **Data in events**: Event title/description may contain customer name and party size; ensure this is acceptable for the store’s calendar (e.g. store-owned calendar). Do not include sensitive data (e.g. full phone) in description if the calendar is shared.
- **CORS and redirect URIs**: Configure Google OAuth redirect URIs to match the app’s domain(s).

---

## 11. Implementation Phases (Suggested)

### Phase 1 – Store calendar one-way sync (MVP)

1. Add `StoreGoogleCalendarConnection` and `RsvpGoogleCalendarEvent` (or equivalent) to the schema.
2. Implement Google OAuth flow for store (connect/disconnect) and store tokens securely.
3. Implement sync service: given an RSVP, create or update or delete the corresponding Google Calendar event; use mapping table for updates/deletes.
4. Call the sync service from RSVP create/update/delete paths (or via a small queue if preferred).
5. Store Settings UI: Connect / Disconnect Google Calendar and show status.

### Phase 2 – Customer “Add to Google Calendar”

1. Add “Add to Google Calendar” (redirect URL) and “Download ICS” on confirmation and reservation detail pages.
2. Generate ICS with summary, start/end (store timezone), location, description.
3. (Optional) One-time OAuth flow to create event in the user’s calendar via API.

### Phase 3 – Hardening and ops

1. Refresh token rotation and error handling (reconnect prompts).
2. Rate limiting and retries.
3. Optional “Sync now” and backfill for existing RSVPs.
4. Observability: logs and optional metrics for sync success/failure.

---

## 12. Summary

- **Goal**: Sync RSVP reservations to Google Calendar (store calendar and optionally customer calendar) so that stores and customers can view and manage reservations in a familiar calendar view.
- **Direction**: One-way RSVP → Google Calendar; RSVP remains the source of truth.
- **Store**: OAuth per store, one calendar per store, events created/updated/deleted on RSVP lifecycle.
- **Customer**: Optional “Add to Google Calendar” via redirect or ICS download.
- **Data**: New tables for store connection and RSVP–event mapping; use Store.defaultTimezone for event times.
- **Phasing**: Start with store calendar sync (Phase 1), then customer add-to-calendar (Phase 2), then reliability and ops (Phase 3).
