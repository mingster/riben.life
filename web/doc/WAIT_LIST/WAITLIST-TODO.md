# Waitlist — backlog and roadmap

**Date:** 2026-04-16
**Status:** Active
**Related:** [WAITLIST-SPEC.md](./WAITLIST-SPEC.md) (authoritative implementation behavior, data model, and code index).

This file is the **single backlog** for waitlist work (prioritized enhancements vs common industry expectations). The spec’s “Gaps” table stays in sync at a high level; use this list for execution order.

**LINE “called” notification:** Use **`/liff/{storeId}/waitlist`** only (`call-waitlist-number.ts` `actionUrl`). Do not emit query-style waitlist URLs for new integrations.

---

## Priority overview

| Priority     | Open items |
| ------------ | ---------: |
| Critical     |          1 |
| High         |          2 |
| Medium       |          3 |
| Low / future |          2 |

---

## Critical

1. **SMS / email when staff calls** — Guests with phone only get no alert today (`call-waitlist-number.ts`). Add transactional SMS/email path + UX copy.

---

## High

1. **Parties waiting in front** — Lead public queue feedback with how many **waiting** parties are **ahead** of the guest (`ahead` from `get-waitlist-queue-position`; optionally surface `waitingInSession`). Prefer a clear, prominent count over estimated minutes (ETA / `eta_minutes` deferred).
2. **`no_show` transitions** — Enum exists; add staff action and/or auto-timeout from `called` → `no_show`.

---

## Medium

1. **Guest `message` / notes** — Allow optional note on join (`create-waitlist-entry` + validation + `WaitlistPublicClient`).
2. **Max queue / capacity** — Enforce cap per session (or per day) in `create-waitlist-entry`.
3. **SMS consent logging** — When SMS exists: fields + disclosure + timestamps.

---

## Low / future

1. **Requeue / call-retry** — From `called` or `no_show` back to queue; workaround today: cancel + recreate.
2. **Policy automation** — Auto-remove / no-show timeout (overlaps with `no_show`).

---

## Coverage snapshot (already implemented)

Session-band queue numbers · verification code for self-service cancel/position · staff call and cancel · in-app + LINE notifications for signed-in users (LINE deep link **`/liff/{storeId}/waitlist`**) · **`WaitListSettings`** (enabled, sign-in, name, LINE OAuth–only) · business hours gating on join · RSVP blacklist · store timezone · admin list with status/scope filters · optional `lineOnly=1` on sign-in for LINE-first UX.

---

## Summary

Largest product gaps versus common waitlist expectations: **guest alerts beyond app/LINE**, **clear “how many ahead” UX** (data exists; polish prominence), **`no_show` / post-`called` lifecycle**, and **SMS consent** when SMS ships.
