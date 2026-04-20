# Reserve with Google

**Status:** Active
**Related:** [GITHUB-ISSUES-CHECKLIST.md](./GITHUB-ISSUES-CHECKLIST.md) (Reserve with Google / Google Actions Center)

## Overview

“Reserve with Google” means different things depending on who you are:

1. **Merchant (store owner)** — You use **Google Business Profile** and connect a **supported third-party booking provider** so customers can book from Google Search/Maps. You do **not** use riben.life OAuth or store-admin “Reserve with Google” toggles for this path unless riben.life is that certified provider.
2. **Platform (riben.life developers)** — Google’s partner/developer flow (often **Google Actions Center** and reservations verticals) is how scheduling software becomes the provider that syncs availability and receives bookings. That work is tracked in the checklist below; the app currently has **schema and settings persistence only**, not a complete integration.

## Merchant setup (Google’s path)

Use Google’s official guides:

- [Reserve with Google Help](https://support.google.com/reserve/)
- [Set up bookings through a provider](https://support.google.com/business/answer/7475773) (Google Business Profile)

Typical steps:

1. **Eligibility** — Availability varies by **country/region** and **business category**.
2. **Google Business Profile** — Claim and verify the business ([business.google.com](https://business.google.com)).
3. **Bookings** — In the profile, use **Bookings** (or equivalent) and select a **supported provider** to link your schedule.
4. **Provider** — Fees and features depend on the provider Google lists for your vertical.

Until riben.life completes Google’s **partner onboarding**, merchants should **not** expect to pick “riben.life” in Google’s provider list based on this repository alone.

## What exists in riben.life today

| Area | Status |
|------|--------|
| **Database** | `RsvpSettings` in [`prisma/schema.prisma`](../prisma/schema.prisma) includes `reserveWithGoogleEnabled`, `googleBusinessProfileId`, `googleBusinessProfileName`, OAuth token fields, sync timestamps, and status/error fields. |
| **Server** | [`update-rsvp-settings`](../src/actions/storeAdmin/rsvpSettings/update-rsvp-settings.ts) and [validation](../src/actions/storeAdmin/rsvpSettings/update-rsvp-settings.validation.ts) can read/write those fields. |
| **Store admin UI** | [`client-rsvp-settings.tsx`](../src/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp-settings/components/client-rsvp-settings.tsx) initializes form defaults for Reserve-with-Google-related fields but the RSVP **Hours** tab only exposes **calendar sync** toggles (`syncWithGoogle`, `syncWithApple`). There is **no** Connect Google / OAuth / Reserve-with-Google configuration UI. |
| **OAuth / webhooks / Actions Center APIs** | Described as future work in the checklist; no end-to-end Reserve-with-Google routes were implemented at the time this document was added. |

**Practical implication:** You **cannot** turn on Reserve with Google end-to-end from store admin UI yet; persistence is preparatory for a future integration.

## Implementing the riben.life integration (developer order)

Follow **[GITHUB-ISSUES-CHECKLIST.md](./GITHUB-ISSUES-CHECKLIST.md)** in this **issue order** (do not skip ahead without dependencies):

| Order | Issue | Focus |
|-------|--------|--------|
| 1 | **#31** | Onboarding, eligibility, platform OAuth app setup, Partner Portal, merchant matching, action links |
| 2 | **#32** | OAuth 2.0 for Google Business Profile, per-store connection, callback route, encrypted tokens, refresh |
| 3 | **#33** | Reserve with Google API client, availability sync, bidirectional reservations, rate limits |
| 4 | **#34** | Webhook endpoints, signature verification, idempotency, retries |
| 5 | **#35** | Store admin UI: connect/disconnect, status, errors, test connection |
| 6 | **#36** | Map store facilities to Google reservation slots |
| 7 | **#37** | Deep links from Search/Maps, source tracking (`reserve_with_google`) |

Optional alternate/parallel track (**#38+** in the same file): feed-based (e.g. Appointments Redirect) integration if that model fits your Google partnership.

Reference architecture for the reservations vertical:

- [Google Actions Center — Reservations (E2E overview)](https://developers.google.com/actions-center/verticals/reservations/e2e/overview)

## Summary

- **Merchants:** Use Google Business Profile and a **Google-supported booking provider**; follow Google Help links above.
- **Developers:** Use this doc plus [GITHUB-ISSUES-CHECKLIST.md](./GITHUB-ISSUES-CHECKLIST.md) issues **#31–#37** in order; current code stores settings fields but does not complete the Google partner surface.
