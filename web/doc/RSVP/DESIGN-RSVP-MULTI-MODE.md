# RSVP Multi-Mode Design

## Overview

Extend the reservation system to support three distinct booking flows via a single
`rsvpMode` field on `RsvpSettings`. The `Rsvp` row shape is unchanged — `facilityId`
and `serviceStaffId` are already nullable — only the form flow and validation differ
per mode.

| Mode value | Name | Primary resource | Who picks what first |
|-----------|------|-----------------|----------------------|
| 0 | `facility` | Space or room | Current behaviour (default) |
| 1 | `staff_force` | Staff member (coach, trainer, doctor) | Staff, then time slots |
| 2 | `restaurant` | None (walk-in style) | Time, then party size |

---

## Phase 1: Schema and enum

**Files touched:** `prisma/schema.prisma`, `src/types/enum.ts`, i18n translation files.

1. Add to `RsvpSettings` in `prisma/schema.prisma`:
   - `rsvpMode Int @default(0)`
   - `maxCapacity Int @default(0)` (0 = unlimited; used by restaurant mode)
2. Run `bun run sql:dbpush` (non-destructive; existing stores default to mode 0).
3. Add to `src/types/enum.ts`:
   ```ts
   export const RsvpMode = {
     FACILITY:    0,
     STAFF_FORCE: 1,
     RESTAURANT:  2,
   } as const;
   export type RsvpModeValue = typeof RsvpMode[keyof typeof RsvpMode];
   ```
4. Add i18n keys to `en/translation.json` and `tw/translation.json`:
   - `rsvp_mode_facility`
   - `rsvp_mode_staff_force`
   - `rsvp_mode_restaurant`

---

## Phase 2: Admin settings

**Files touched:** `update-rsvp-settings.validation.ts`, `update-rsvp-settings.ts`,
`client-rsvp-settings.tsx`.

5. `update-rsvp-settings.validation.ts` — add:
   ```ts
   rsvpMode: z.number().int().min(0).max(2).default(0),
   ```
6. `update-rsvp-settings.ts` — include `rsvpMode` in the `upsert` payload.
7. `client-rsvp-settings.tsx`:
   - Add a `<Select>` (3 options) near the top of the settings form.
   - When mode is 1 or 2, hide the `mustSelectFacility` toggle (it becomes implicit).
   - When mode is 0 or 2, hide the `mustHaveServiceStaff` toggle (also implicit).

---

## Phase 3: Restaurant mode (form-only, no new API)

**Files touched:** `reservation-form.tsx`.

8. Read `rsvpSettings.rsvpMode` from the existing prop.
9. When `rsvpMode === 2` (restaurant):
   - Render only: date/time picker, `numOfAdult`, `numOfChild`, name/phone (anonymous users), message.
   - Skip facility picker and service staff picker entirely.
   - Send `facilityId: null, serviceStaffId: null` to `create-reservation`.
   - No validation change needed (both fields are already optional in the Zod schema).
10. Time slots that are at or over `maxCapacity` (sum of `numOfAdult + numOfChild` across
    overlapping confirmed reservations) are marked unavailable in the slot picker.
    `create-reservation` re-checks capacity server-side and throws `SafeError("rsvp_fully_booked")`
    if the slot filled between the customer viewing slots and submitting.

---

## Phase 4: Staff-force mode (new API + form reorder)

**Files touched:** new API route, `reservation-form.tsx`.

### New API endpoint

`GET /api/store/[storeId]/service-staff/available-slots?staffId=&date=`

Returns available time slots for a specific staff member on a given date. Logic:

- Filter by `ServiceStaffFacilitySchedule` availability windows for that staff member.
- Exclude time slots already occupied by confirmed `Rsvp` rows for that staff member.
- Respect store business hours or `rsvpHours` if `useBusinessHours` is true.
- Response shape mirrors the existing facility slot endpoint for easy client reuse.

### Form changes

11. When `rsvpMode === 1` (staff_force), render in this order:
    1. Date picker (always first, needed to determine who has openings).
    2. Staff picker (populated via the new API — only staff with openings on that date).
    3. Time slot picker (slots filtered to the selected staff member's availability).
    4. `numOfAdult`, `numOfChild`.
    5. Name/phone (anonymous users), message.
    - Facility picker is hidden; `facilityId: null` is sent.
    - `serviceStaffId` is treated as required (guard in the server action, see Phase 5).
    - Changing the date resets the staff and time slot selections.

---

## Phase 5: Pricing and server-action guards

12. `calculate-pricing` API already accepts `null` for `facilityId` — restaurant mode works
    as-is (zero facility cost).
13. Staff-force mode: pricing call is `facilityId: null, serviceStaffId, rsvpTime`. The existing
    API handles this provided `serviceStaffCost` is configured on the staff member.
14. `create-reservation` server action — add mode-specific guards:
    - If `rsvpMode === 1` and no `serviceStaffId`: throw `SafeError("rsvp_staff_required")`.
    - If `rsvpMode === 2`: strip `facilityId` and `serviceStaffId` from the insert payload
      (do not trust the client to send null).

---

## What does NOT change

- `Rsvp` Prisma model (all needed fields already exist).
- `create-reservation` and `update-reservation` action signatures.
- Pricing calculation API (`/api/store/[storeId]/facilities/calculate-pricing`).
- Admin order management and RSVP list views.

---

## Decisions

**Q1. Staff visibility in staff-force mode.** Only staff who have an opening in the
selected time slot are shown. No separate "bookable via RSVP" flag. The available-slots
API (Phase 4) returns only staff with at least one free slot on the requested date, so the
staff picker is populated dynamically after the customer picks a date. Flow becomes:
date → staff picker (filtered to those with openings) → time slot → party size.

**Q2. Capacity enforcement for restaurant mode.** The system must calculate and enforce
capacity. Add `maxCapacity Int @default(0)` to `RsvpSettings` (0 = unlimited). The
available-slots API sums `numOfAdult + numOfChild` across all confirmed `Rsvp` rows that
overlap a slot, compares against `maxCapacity`, and marks the slot unavailable when full.
The `create-reservation` action also re-validates capacity server-side before inserting.

**Q3. Per-mode scope.** One mode per store. `rsvpMode` lives on `RsvpSettings`.
