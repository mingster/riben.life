# Design: Service Staff Facility-Specific Availability

**Date:** 2026-01-28  
**Status:** ✅ Implemented  
**Priority:** Medium  
**Related:** [TODO-RSVP-REVIEW-unfinished-logic.md](../TODO-RSVP-REVIEW-unfinished-logic.md)

## Implementation Summary (2026-01-28)

**Completed:**

- ✅ Added `ServiceStaffFacilitySchedule` model to Prisma schema
- ✅ Removed `businessHours` field from `ServiceStaff` model
- ✅ Created migration script for existing data
- ✅ Created CRUD server actions for facility schedules
- ✅ Created `getServiceStaffBusinessHours()` utility function
- ✅ Updated reservation validation to use new resolution logic
- ✅ Created Admin UI (Facility Schedules dialog)
- ✅ Added i18n translations (en, tw, jp)
- ✅ **Staff list filtering** – `getServiceStaff` (storeAdmin + store) filters by facility and time availability
- ✅ **Staff without schedules** – Use `StoreSettings.businessHours` (per `getServiceStaffBusinessHours`)
- ✅ **Store-side parity** – Same logic in `src/actions/store/reservation/get-service-staff.ts`
- ✅ **Facility business hours fallback** – `facility.businessHours ?? storeSettings?.businessHours` used across reservation flows

**Files Changed:**

- `prisma/schema.prisma` – New model and updated relations
- `src/utils/service-staff-schedule-utils.ts` – Resolution utility (`getServiceStaffBusinessHours`, etc.)
- `src/actions/storeAdmin/serviceStaffSchedule/` – CRUD (create, update, delete, get, validation)
- `src/actions/storeAdmin/serviceStaff/get-service-staff.ts` – StoreAdmin staff list with facility + time filter
- `src/actions/store/reservation/get-service-staff.ts` – Store-side staff list (same logic)
- `src/app/api/storeAdmin/[storeId]/service-staff/route.ts` – API route (passes `rsvpTimeIso`, `storeTimezone`)
- `src/actions/store/reservation/create-reservation.ts` – Facility hours fallback, validate staff hours
- `src/actions/store/reservation/update-reservation.ts` – Facility hours fallback, validate staff hours
- `src/actions/store/reservation/validate-service-staff-business-hours.ts` – Placeholder (currently disabled)
- `src/app/storeAdmin/.../service-staff/components/` – Admin UI (Facility Schedules dialog)
- `src/app/storeAdmin/.../rsvp/components/admin-reservation-form.tsx` – Facility + time in SWR key, passes `rsvpTimeIso`, `storeTimezone`
- `src/app/storeAdmin/.../rsvp/components/week-view-calendar.tsx` – Facility hours fallback
- `src/app/s/.../reservation/components/reservation-form.tsx` – Facility + time in SWR key, passes `rsvpTimeIso`, `storeTimezone`
- `src/app/s/.../reservation/[facilityId]/components/facility-reservation-client.tsx` – Same
- `src/app/s/.../reservation/components/slot-picker.tsx`, `customer-week-view-calendar.tsx` – Facility hours fallback
- `src/app/s/.../reservation/[facilityId]/components/facility-reservation-calendar.tsx`, `facility-reservation-time-slots.tsx` – Facility hours fallback
- `scripts/migrate-service-staff-business-hours.ts` – Migration script

---

## Problem Statement

Service staff availability needs to be facility-specific. In real-world scenarios, staff often work at multiple facilities with different schedules:

**Example Use Cases:**

1. **Tennis Coach** works at:
   - Court A: Monday-Friday 09:00-12:00
   - Court B: Monday-Friday 14:00-18:00
   - Court C: Saturday 10:00-16:00

2. **Massage Therapist** works at:
   - Room 101: Morning shift (08:00-12:00)
   - Room 102: Afternoon shift (13:00-17:00)
   - Room 103: Evening shift (18:00-22:00)

3. **Hair Stylist** at multi-location salon:
   - Downtown Location: Monday, Wednesday, Friday
   - Uptown Location: Tuesday, Thursday, Saturday

## Current Schema

```prisma
model ServiceStaff {
  id      String  @id @default(uuid())
  storeId String
  userId  String
  // businessHours removed - replaced by ServiceStaffFacilitySchedule
  // ... other fields
}

model StoreFacility {
  id            String  @id @default(uuid())
  storeId       String
  businessHours String? // When the facility is available
  // ... other fields
}
```

**Current Limitation:** A service staff member can only have ONE set of business hours, regardless of which facility they work at.

## Proposed Solution

### Option A: New Junction Model (Recommended)

Create a new model `ServiceStaffFacilitySchedule` that links service staff to facilities with specific availability.

```prisma
model ServiceStaffFacilitySchedule {
  id             String  @id @default(uuid())
  storeId        String
  serviceStaffId String
  facilityId     String? // null = default/fallback schedule for all facilities
  
  businessHours  String  // e.g., "M-F 09:00-12:00" or JSON format
  
  // Optional: More granular control
  effectiveFrom  BigInt? // When this schedule starts (epoch ms)
  effectiveTo    BigInt? // When this schedule ends (epoch ms)
  isActive       Boolean @default(true)
  priority       Int     @default(0) // Higher priority wins on overlap
  
  createdAt      BigInt
  updatedAt      BigInt
  
  Store        Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  ServiceStaff ServiceStaff  @relation(fields: [serviceStaffId], references: [id], onDelete: Cascade)
  Facility     StoreFacility? @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, serviceStaffId, facilityId])
  @@index([storeId])
  @@index([serviceStaffId])
  @@index([facilityId])
}
```

**Advantages:**

- Clean separation of concerns
- Supports unlimited facility-schedule combinations
- Can add temporal validity (effective dates)
- Priority-based conflict resolution

**Resolution Logic:** (implemented in `@/utils/service-staff-schedule-utils.ts`)

1. **Staff has any `ServiceStaffFacilitySchedule`** → Staff only available at their set schedules
   - If `facilityId` provided: check facility-specific schedule first, then default schedule (`facilityId = null`)
   - If neither found → return `CLOSED_HOURS` (staff not available at that facility)
   - If `facilityId` null: check default schedule only; if none → `CLOSED_HOURS`
2. **Staff has NO `ServiceStaffFacilitySchedule`** → Use `StoreSettings.businessHours`
3. **No store hours defined** → `null` (no restrictions, staff always available)

### Recommendation: Option A

Option A (new junction model) is recommended because:

1. **Data integrity**: Foreign keys ensure valid facility references
2. **Query performance**: Can index and query efficiently
3. **Flexibility**: Can easily add more fields (effective dates, priority)
4. **Consistency**: Follows existing pattern (`FacilityServiceStaffPricingRule`)

## Data Model Details

### Business Hours Format

Keep the existing string format for consistency:

Use standard BusinessHour library at `/lib/businessHours`:

```json
{
  "monday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
  "tuesday": [{"start": "09:00", "end": "12:00"}],
  "wednesday": [],
  "thursday": [{"start": "14:00", "end": "18:00"}],
  "friday": [{"start": "09:00", "end": "17:00"}],
  "saturday": [{"start": "10:00", "end": "16:00"}],
  "sunday": []
}
```

### Resolution Algorithm

```typescript
// See: src/utils/service-staff-schedule-utils.ts
async function getServiceStaffBusinessHours(
  storeId: string,
  serviceStaffId: string,
  facilityId: string | null,
  date?: Date
): Promise<string | null> {
  // 1. Check if staff has ANY schedule in ServiceStaffFacilitySchedule
  const staffHasSchedules = await db.serviceStaffFacilitySchedule.count({ ... });

  if (staffHasSchedules > 0) {
    // Staff has schedules → facility-specific first, then default (facilityId = null)
    if (facilityId) {
      const facilitySchedule = await findFirst({ facilityId, ... });
      if (facilitySchedule) return facilitySchedule.businessHours;
      const defaultSchedule = await findFirst({ facilityId: null, ... });
      if (defaultSchedule) return defaultSchedule.businessHours;
      return CLOSED_HOURS;  // No match → not available at this facility
    }
    const defaultSchedule = await findFirst({ facilityId: null, ... });
    if (defaultSchedule) return defaultSchedule.businessHours;
    return CLOSED_HOURS;
  }

  // 2. Staff has NO schedules → use StoreSettings.businessHours
  const storeSettings = await db.storeSettings.findFirst({ where: { storeId } });
  if (storeSettings?.businessHours) return storeSettings.businessHours;

  // 3. No restrictions - staff always available
  return null;
}
```

### Staff List Filtering (`getServiceStaff`)

When `facilityId` is provided, the staff list includes:

1. **Staff with schedules** for that facility or default (`facilityId = null`)
2. **Staff with NO schedules** (availability determined by `StoreSettings.businessHours`)

When `rsvpTimeIso` and `storeTimezone` are also provided, staff are filtered by availability at that time via `getServiceStaffBusinessHours` + `checkTimeAgainstBusinessHours`. Used by storeAdmin RSVP form, store reservation form, and facility-specific reservation client.

### Facility Business Hours Fallback

For facility availability checks (slots, drag-and-drop, validation): `facility.businessHours ?? storeSettings?.businessHours ?? null`. Facilities with `businessHours = null` inherit store-wide hours.

## UI Design

### Store Admin: Service Staff Management

**Current UI:** Single business hours field per staff member

**New UI:** Tabbed interface with:

1. **Default Schedule Tab**
   - General availability when no facility-specific schedule applies (`facilityId = null` in `ServiceStaffFacilitySchedule`)

2. **Facility Schedules Tab**
   - List of facility-specific schedules
   - Add/Edit/Delete buttons
   - Each row shows: Facility Name | Business Hours | Active | Actions

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│ Service Staff: Coach Wang                                    │
├─────────────────────────────────────────────────────────────┤
│ [Default Schedule] [Facility Schedules] [Pricing]           │
├─────────────────────────────────────────────────────────────┤
│ Facility Schedules                              [+ Add New] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Facility      │ Business Hours        │ Active │ Action ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Tennis Court A│ M-F 09:00-12:00       │   ✓    │ ✎ 🗑  ││
│ │ Tennis Court B│ M-F 14:00-18:00       │   ✓    │ ✎ 🗑  ││
│ │ Tennis Court C│ SAT 10:00-16:00       │   ✓    │ ✎ 🗑  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Note: When booking at a specific facility, the facility-    │
│ specific schedule takes precedence over the default.        │
└─────────────────────────────────────────────────────────────┘
```

### Edit Schedule Dialog

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Facility Schedule                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Facility *                                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Tennis Court A                                      ▼  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Business Hours *                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Monday    [✓] 09:00 - 12:00  [+ Add Time]             ││
│ │ Tuesday   [✓] 09:00 - 12:00                           ││
│ │ Wednesday [✓] 09:00 - 12:00                           ││
│ │ Thursday  [✓] 09:00 - 12:00                           ││
│ │ Friday    [✓] 09:00 - 12:00                           ││
│ │ Saturday  [ ]                                          ││
│ │ Sunday    [ ]                                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [ ] Active                                                  │
│                                                             │
│                              [Cancel]  [Save]               │
└─────────────────────────────────────────────────────────────┘
```

## Validation Changes

### Implemented Validation Points

| Location | Implementation |
|----------|----------------|
| `week-view-calendar.tsx` | Facility hours fallback `facility.businessHours ?? storeSettings?.businessHours` for drag validation |
| `customer-week-view-calendar.tsx` | Same facility hours fallback |
| `slot-picker.tsx` | Same facility hours fallback for slot availability |
| `create-reservation.ts` | Facility hours fallback; `validateServiceStaffBusinessHours` called (currently disabled) |
| `update-reservation.ts` | Same |
| `facility-reservation-calendar.tsx`, `facility-reservation-time-slots.tsx` | Facility hours fallback for date/time availability |

### Staff List Filtering (Not Validation)

- **storeAdmin**: `getServiceStaffAction` + API route – filters by facility and time when `rsvpTimeIso` + `storeTimezone` provided
- **store**: `getServiceStaffAction` in `src/actions/store/reservation/get-service-staff.ts` – same logic
- **reservation-form.tsx**, **facility-reservation-client.tsx**, **admin-reservation-form.tsx** – pass `rsvpTimeIso` and `storeTimezone` to refetch staff when facility/time changes

### Note: `validateServiceStaffBusinessHours`

The server-side `validateServiceStaffBusinessHours` function is currently **disabled** (no-op). Reservations are not validated against staff schedules at create/update time. Staff availability is enforced at UI level via filtered staff lists.

## Migration Strategy

### Phase 1: Schema & Backend (Week 1)

1. Add `ServiceStaffFacilitySchedule` model to schema
2. Migrate existing `ServiceStaff.businessHours` data into `ServiceStaffFacilitySchedule` (one row per staff with `facilityId = null`)
3. Remove `ServiceStaff.businessHours` from schema
4. Run Prisma migration
5. Create server actions:
   - `createServiceStaffFacilitySchedule`
   - `updateServiceStaffFacilitySchedule`
   - `deleteServiceStaffFacilitySchedule`
   - `getServiceStaffFacilitySchedules`
6. Create utility function `getServiceStaffBusinessHours()`

### Phase 2: Validation Updates (Week 2)

1. Update `checkTimeAgainstBusinessHours` to use new resolution logic
2. Update all validation points (calendar, slot picker, server actions)
3. Add error messages for facility-specific schedule violations

### Phase 3: Admin UI (Week 3)

1. Create "Facility Schedules" tab in service staff management
2. Create add/edit/delete dialogs
3. Add i18n keys for new UI elements

### Phase 4: Testing & Polish (Week 4)

1. Unit tests for resolution algorithm
2. Integration tests for RSVP creation with facility schedules
3. Edge case testing (overlapping schedules, deleted facilities)
4. Documentation update

## Migration & Backward Compatibility

- **Data migration**: Existing `ServiceStaff.businessHours` values are migrated into `ServiceStaffFacilitySchedule` with `facilityId = null` before the field is removed
- **Breaking change**: `ServiceStaff.businessHours` is removed
- **Staff without schedules**: Staff with no `ServiceStaffFacilitySchedule` entries use `StoreSettings.businessHours` for availability

## Related Models

This design follows the pattern established by `FacilityServiceStaffPricingRule`:

```prisma
model FacilityServiceStaffPricingRule {
  id             String  @id @default(uuid())
  storeId        String
  facilityId     String? // Optional: specific facility
  serviceStaffId String? // Optional: specific staff
  // ... pricing fields
}
```

The new `ServiceStaffFacilitySchedule` model is similar but focuses on availability instead of pricing.

## Open Questions

1. **Should we support date ranges?** (e.g., "Coach available at Facility A only in summer")
   - Recommendation: Yes, via `effectiveFrom` and `effectiveTo` fields

2. **Should we support exceptions?** (e.g., "Not available on holidays")
   - Recommendation: Defer to Phase 2, can add `ServiceStaffScheduleException` model later

3. **What happens when a facility is deleted?**
   - Recommendation: Cascade delete the schedule (matching `FacilityServiceStaffPricingRule` behavior)

4. **Should staff be able to set their own schedules?**
   - Recommendation: Store admin only for now, can add staff self-service later

## Summary

| Aspect | Before | Current |
|--------|--------|---------|
| Schedule per staff | 1 | Unlimited (per facility) |
| Facility-specific | No | Yes |
| Temporal validity | No | Optional (effectiveFrom/To) |
| Priority resolution | N/A | Yes |
| `ServiceStaff.businessHours` | Single field | Removed; replaced by `ServiceStaffFacilitySchedule` |
| Staff without schedules | N/A | Use `StoreSettings.businessHours` |
| Staff list filtering | All staff | By facility + time availability (storeAdmin + store) |
| Facility hours fallback | Facility only | `facility.businessHours ?? storeSettings?.businessHours` |

This design enables complex real-world scheduling scenarios by replacing the single `businessHours` field with facility-specific schedules.
