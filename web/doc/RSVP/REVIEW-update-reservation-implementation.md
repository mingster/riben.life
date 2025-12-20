# Implementation Review: Customer Reservation Modification (FR-RSVP-013)

**Date:** 2025-01-27  
**Status:** Review  
**Related:** [TECHNICAL-REQUIREMENTS-RSVP.md](./TECHNICAL-REQUIREMENTS-RSVP.md) Section 4.1.1

---

## Overview

This document reviews the implementation of customer reservation modification (`update-reservation.ts`) against the documented technical requirements (FR-RSVP-013).

---

## Implementation Status

### ✅ Correctly Implemented

1. **Authentication & Authorization**
   - ✅ User authentication check (lines 29-35)
   - ✅ Ownership verification by `customerId` or email match (lines 84-97)
   - ✅ Proper error handling for unauthorized access

2. **Status Constraint**
   - ✅ Only `Pending` status reservations can be modified (lines 58-63)
   - ⚠️ **Note:** This constraint was removed from documentation but is still enforced in code

3. **Store Timezone Handling**
   - ✅ Correctly converts date/time using store timezone (lines 56, 70)
   - ✅ Uses `convertDateToUtc()` for proper timezone conversion
   - ✅ Converts to BigInt epoch for database storage (line 79)

4. **Facility Validation**
   - ✅ Validates facility exists (lines 107-116)
   - ✅ Verifies facility belongs to the store

5. **Modifiable Fields**
   - ✅ All documented fields are modifiable:
     - `facilityId` (line 124)
     - `numOfAdult` (line 125)
     - `numOfChild` (line 126)
     - `rsvpTime` (line 127)
     - `message` (line 128)

---

## ❌ Missing Implementation

### 1. `confirmedByStore` Reset (CRITICAL)

**Requirement (FR-RSVP-013):** "When modified, `ConfirmedByStore` is set to false again."

**Current Status:** ❌ **NOT IMPLEMENTED**

**Location:** `src/actions/store/reservation/update-reservation.ts` lines 121-130

**Issue:** The update operation does not set `confirmedByStore: false` in the data object.

**Current Code:**
```typescript
const updated = await sqlClient.rsvp.update({
  where: { id },
  data: {
    facilityId,
    numOfAdult,
    numOfChild,
    rsvpTime,
    message: message || null,
    createdBy: createdBy || undefined,
    // ❌ MISSING: confirmedByStore: false
  },
  // ...
});
```

**Required Fix:**
```typescript
data: {
  facilityId,
  numOfAdult,
  numOfChild,
  rsvpTime,
  message: message || null,
  confirmedByStore: false, // ✅ Add this line
  createdBy: createdBy || undefined,
}
```

**Impact:** High - This is a documented requirement. Without this, stores cannot track which reservations need re-confirmation after modification.

---

### 2. `cancelHours` Window Validation (CRITICAL)

**Requirement (FR-RSVP-013):** "Modify within the allowed cancellation window (`cancelHours`)"

**Current Status:** ❌ **NOT IMPLEMENTED IN SERVER ACTION**

**Location:** `src/actions/store/reservation/update-reservation.ts`

**Issue:** 
- Server action does not validate `cancelHours` window
- Validation only exists in client-side components (`display-reservations.tsx`, `customer-week-view-calendar.tsx`)
- Client-side validation can be bypassed

**Required Implementation:**

1. Fetch `RsvpSettings` to get `cancelHours` value
2. Calculate hours until reservation time
3. Validate that modification is within the allowed window
4. Throw error if outside window

**Reference Implementation:** See `display-reservations.tsx` lines 324-344 for client-side logic that should be replicated server-side.

**Required Fix:**
```typescript
// After line 56 (after getting storeTimezone)
const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
  where: { storeId: existingRsvp.storeId },
  select: { cancelHours: true, canCancel: true },
});

if (rsvpSettings?.canCancel && rsvpSettings.cancelHours) {
  const cancelHours = rsvpSettings.cancelHours;
  const now = getUtcNow();
  const rsvpTimeDate = epochToDate(rsvpTime);
  
  if (rsvpTimeDate) {
    const hoursUntilReservation = 
      (rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilReservation < cancelHours) {
      throw new SafeError(
        `Reservation can only be modified more than ${cancelHours} hours before the reservation time`
      );
    }
  }
}
```

**Impact:** High - This is a documented business rule. Without server-side validation, the rule can be bypassed.

---

### 3. Availability Validation (HIGH PRIORITY)

**Requirement:** "Availability validation must check for conflicts with existing reservations"

**Current Status:** ❌ **NOT IMPLEMENTED (TODO comment)**

**Location:** `src/actions/store/reservation/update-reservation.ts` line 118

**Issue:** 
- TODO comment indicates missing implementation
- No check for conflicting reservations at the same facility/time
- Could allow double-booking

**Required Implementation:**

1. Query existing reservations for the facility at the new time
2. Check for overlapping time slots (considering facility `defaultDuration`)
3. Exclude the current reservation from conflict check
4. Throw error if conflict found

**Reference:** Similar validation should be implemented as in `create-reservation.ts` (also has TODO, but pattern should be established).

**Required Fix:**
```typescript
// After line 116 (after facility validation)
// Check for conflicting reservations
const facilityDuration = facility.defaultDuration || 60; // minutes
const durationMs = facilityDuration * 60 * 1000;
const slotStart = Number(rsvpTime);
const slotEnd = slotStart + durationMs;

const conflictingReservations = await sqlClient.rsvp.findMany({
  where: {
    storeId: existingRsvp.storeId,
    facilityId: facilityId,
    id: { not: id }, // Exclude current reservation
    status: {
      not: RsvpStatus.Cancelled, // Exclude cancelled
    },
    rsvpTime: {
      gte: BigInt(slotStart),
      lt: BigInt(slotEnd),
    },
  },
});

if (conflictingReservations.length > 0) {
  throw new SafeError(
    "This time slot is already booked. Please select a different time."
  );
}
```

**Impact:** High - Without this, double-booking is possible, violating business rule BR-RSVP-004.

---

### 4. Business Hours Validation (MEDIUM PRIORITY)

**Requirement:** "Facility availability must be verified for the new date/time"

**Current Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Issue:**
- Facility existence is checked
- Business hours validation is NOT checked server-side
- Client-side validation exists in `reservation-form.tsx` but can be bypassed

**Required Implementation:**

1. Check if store uses business hours (`Store.useBusinessHours`)
2. If facility has `businessHours` JSON, parse and validate
3. Verify the new `rsvpTime` falls within business hours
4. Throw error if outside business hours

**Reference:** See `reservation-form.tsx` lines 106-190 for client-side business hours validation logic.

**Impact:** Medium - Business hours validation should be enforced server-side to prevent invalid reservations.

---

## Summary

### Implementation Completeness: 60%

| Requirement | Status | Priority |
|------------|--------|----------|
| Authentication/Authorization | ✅ Complete | - |
| Status Constraint | ✅ Complete | - |
| Store Timezone Handling | ✅ Complete | - |
| Facility Validation | ✅ Complete | - |
| Modifiable Fields | ✅ Complete | - |
| `confirmedByStore` Reset | ❌ Missing | **CRITICAL** |
| `cancelHours` Validation | ❌ Missing | **CRITICAL** |
| Availability Validation | ❌ Missing | **HIGH** |
| Business Hours Validation | ⚠️ Partial | **MEDIUM** |

---

## Recommended Actions

### Immediate (Critical)

1. **Add `confirmedByStore: false` to update data** (5 minutes)
   - Add to line 129 in `update-reservation.ts`

2. **Implement `cancelHours` validation** (30 minutes)
   - Fetch `RsvpSettings`
   - Calculate hours until reservation
   - Validate and throw error if outside window

### High Priority

3. **Implement availability conflict checking** (1-2 hours)
   - Query existing reservations
   - Check for time slot overlaps
   - Consider facility duration

### Medium Priority

4. **Implement business hours validation** (1 hour)
   - Check store/facility business hours
   - Validate reservation time falls within hours

---

## Code References

- **Implementation:** `src/actions/store/reservation/update-reservation.ts`
- **Validation Schema:** `src/actions/store/reservation/update-reservation.validation.ts`
- **Documentation:** `doc/RSVP/TECHNICAL-REQUIREMENTS-RSVP.md` lines 275-293
- **Functional Requirements:** `doc/RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md` lines 408-414
- **Reference (Client-side validation):** `src/components/display-reservations.tsx` lines 183-345

---

## Notes

- Client-side validation exists but should not be relied upon for security
- All business rules must be enforced server-side
- The status constraint (Pending only) is implemented but was removed from documentation - consider whether this should remain or be removed from code
- Similar TODOs exist in `create-reservation.ts` - consider implementing availability validation as a shared utility function

