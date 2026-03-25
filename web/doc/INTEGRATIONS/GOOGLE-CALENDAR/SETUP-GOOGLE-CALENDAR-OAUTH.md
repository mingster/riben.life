# Google Calendar OAuth – Setup Guide

**Date:** 2026-03-24  
**Status:** Active  
**Related:** [Environment variables (Google Calendar)](../../ENVIRONMENT_VARIABLES.md#google-calendar-rsvp-staff-sync--oauth), [Design: RSVP ↔ Google Calendar](./DESIGN-RSVP-GOOGLE-CALENDAR-SYNC.md)

## Overview

This guide walks through **Google Cloud Console** and **application configuration** so store staff can use **Connect Google Calendar** in Store Admin (RSVP / calendar settings). The app uses OAuth 2.0 with offline access; tokens are stored per `(storeId, userId)`.

Implementation reference:

- Authorize URL + scopes: `web/src/lib/google-calendar/google-oauth-client.ts`
- Redirect base URL: `web/src/lib/google-calendar/google-env.ts` → `{getAppBaseUrl()}/api/auth/google-calendar`
- OAuth start: `web/src/app/api/storeAdmin/[storeId]/google-calendar/oauth/start/route.ts`
- Callback handler: `web/src/app/api/auth/google-calendar/route.ts`

## 1. Google Cloud project

Use one GCP project for **both**:

- The **OAuth 2.0 Client ID** (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)
- **Google Calendar API** enabled

## 2. Enable Google Calendar API

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select the project.
2. **APIs & Services** → **Library**.
3. Search for **Google Calendar API** → **Enable**.

If this step is skipped, scopes may appear **invalid** when adding them to the OAuth consent screen.

## 3. OAuth 2.0 client (Web application)

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add URIs that **exactly** match what the app will use (scheme, host, port, path):

   | Environment | Example redirect URI |
   |-------------|----------------------|
   | Production | `https://your-domain.com/api/auth/google-calendar` |
   | Local dev | `http://localhost:3001/api/auth/google-calendar` |

   The app builds the redirect from `NEXT_PUBLIC_BASE_URL` (or fallbacks in `getAppBaseUrl()`). The value **must** match one of the URIs listed here.

4. Save and copy **Client ID** and **Client secret** into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 4. OAuth consent screen

### 4.1 App information

**APIs & Services** → **OAuth consent screen**:

- Configure app name, user support email, developer contact.
- For **production** and verification, Google typically requires a public **Privacy policy** URL and accurate app description.

### 4.2 Scopes (must match the codebase)

The app requests these scopes in `buildGoogleCalendarAuthorizeUrl` — the consent screen should list the **same** scopes using the **full** URLs (no abbreviations):

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/calendar.events` | Create, update, and delete events (RSVP sync). |
| `https://www.googleapis.com/auth/calendar.readonly` | List calendars so the user can choose which calendar receives RSVPs. |

**How to add scopes:**

1. **OAuth consent screen** → **Edit app** → step **Scopes** → **Add or remove scopes**.
2. Prefer selecting rows under **Google Calendar API** in the table, **or** use **Manually add scopes** and paste each URL **exactly** as above.

**Invalid scope errors:** If Google reports a scope is invalid, common causes are:

- Pasting a shortened form (e.g. `.../auth/calendar.events`) instead of the full `https://www.googleapis.com/...` string.
- **Google Calendar API** not enabled for the project (see §2).

### 4.3 Publishing status: Testing

While status is **Testing**, only accounts listed under **Test users** can complete consent. Add every Google account that should connect during development or internal trials.

### 4.4 Publishing status: In production

Calendar scopes are **sensitive**. For arbitrary Google users to connect without blocks:

- Move the app to **In production** when appropriate, and  
- Complete **[Google OAuth app verification](https://support.google.com/cloud/answer/9110914)** for the requested scopes (privacy policy, scope justification, sometimes a demo video).

Until verification is approved, users may see **“This app is blocked”** or similar.

### 4.5 Google Workspace (organization accounts)

A Workspace administrator may restrict third-party OAuth apps. Affected users need the app **allowed** in Admin console (API controls / app access), or use a consumer Gmail test account under **Test users** while the app remains in Testing.

## 5. Application environment variables

See **[Environment variables](../../ENVIRONMENT_VARIABLES.md#google-calendar-rsvp-staff-sync--oauth)** for the full list. Minimum for OAuth:

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_BASE_URL=https://your-domain.com   # must match redirect URI origin

# Recommended in production (see ENVIRONMENT_VARIABLES.md)
GOOGLE_CALENDAR_TOKEN_SECRET=...
GOOGLE_OAUTH_STATE_SECRET=...
```

## 6. End-to-end check

1. In Store Admin, open RSVP / Google Calendar settings.
2. Click **Connect** (or equivalent) — browser should go to Google’s consent screen.
3. After approval, Google redirects to `/api/auth/google-calendar`; the app completes the flow and returns to the admin UI.

If the user has never used Google Calendar on that account, Google may return errors until they open [https://calendar.google.com](https://calendar.google.com) once (the product surfaces this case in the admin UI when applicable).

## 7. Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **This app is blocked** / access denied | Test user not added (Testing); production without verification; Workspace policy blocking the client. |
| **Invalid scope** on consent screen | Full `https://www.googleapis.com/auth/...` URLs; Calendar API enabled. |
| **redirect_uri_mismatch** | Authorized redirect URI in GCP equals `{NEXT_PUBLIC_BASE_URL}/api/auth/google-calendar` for that environment. |
| **Wrong project / wrong client** | `GOOGLE_CLIENT_ID` belongs to the same project where Calendar API is enabled and consent screen is configured. |

## Summary

1. Enable **Google Calendar API** on the GCP project.  
2. Create a **Web** OAuth client; register **`{origin}/api/auth/google-calendar`** as redirect URI.  
3. On the **OAuth consent screen**, add the two **full** Calendar scope URLs; configure **Test users** or **Production + verification**.  
4. Set **`GOOGLE_*`** and **`NEXT_PUBLIC_BASE_URL`** to match the deployed URL and credentials.
