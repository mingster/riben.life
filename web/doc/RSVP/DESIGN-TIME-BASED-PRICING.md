# Design: Time-Based Facility Pricing

**Date:** 2025-01-27  
**Status:** Design  
**Version:** 1.0  
**Related Documents:**

- [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [TECHNICAL-REQUIREMENTS-RSVP.md](./TECHNICAL-REQUIREMENTS-RSVP.md)

---

## 1. Overview

This document describes the design for time-based pricing of StoreFacility resources. The system allows store staff to configure different costs for facility usage based on:

- Day of week (weekend vs weekday, or specific days)
- Time of day (specific time ranges)
- Facility-specific or store-wide rules

---

## 2. Use Cases

### 2.1 Weekend Pricing

**Scenario:** A restaurant charges 20% more for table reservations on weekends (Saturday and Sunday).

**Example:**

- Default cost: $100
- Weekend cost: $120
- Customer books for Saturday 7:00 PM → Charged $120

### 2.2 Peak Hours Pricing

**Scenario:** A salon charges premium rates during peak hours (6:00 PM - 9:00 PM on weekdays).

**Example:**

- Default cost: $50
- Peak hours cost: $75
- Customer books for Tuesday 7:00 PM → Charged $75

### 2.3 Combined Rules

**Scenario:** A restaurant has different pricing for:

- Weekday lunch (11:00 AM - 2:00 PM): $80
- Weekday dinner (6:00 PM - 10:00 PM): $120
- Weekend all day: $150

**Example:**

- Customer books Saturday 1:00 PM → Charged $150 (weekend rule takes precedence)
- Customer books Wednesday 7:00 PM → Charged $120 (weekday dinner rule)
- Customer books Wednesday 12:00 PM → Charged $80 (weekday lunch rule)

### 2.4 Facility-Specific Pricing

**Scenario:** A restaurant has a VIP room that costs more during peak hours.

**Example:**

- Regular tables: Default $100, Peak $120
- VIP room: Default $200, Peak $250
- Customer books VIP room on Saturday 8:00 PM → Charged $250

---

## 3. Database Schema Design

### 3.1 New Model: FacilityPricingRule

```prisma
model FacilityPricingRule {
  id              String   @id @default(uuid())
  storeId         String
  facilityId      String?  // null = applies to all facilities in store
  name            String   // e.g., "Weekend Pricing", "Peak Hours"
  priority        Int      @default(0) // Higher priority = evaluated first
  
  // Day of week rules
  // null = applies to all days
  // Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
  // Special values: "weekend" = [0, 6], "weekday" = [1,2,3,4,5]
  dayOfWeek       String?  // JSON array: [0,6] or "weekend" or "weekday" or null
  
  // Time range (in store's timezone)
  startTime       String?  // HH:mm format, e.g., "18:00"
  endTime         String?  // HH:mm format, e.g., "22:00"
  // If both null, applies to all times
  
  // Pricing
  cost            Decimal? // Override defaultCost (null = use facility default)
  credit          Decimal? // Override defaultCredit (null = use facility default)
  
  // Status
  isActive        Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Store    Store          @relation(fields: [storeId], references: [id], onDelete: Cascade)
  Facility StoreFacility? @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  rsvps    Rsvp[]
  
  @@index([storeId])
  @@index([facilityId])
  @@index([storeId, facilityId, isActive])
  @@index([priority])
}
```

### 3.2 Updated Rsvp Model

Add fields to track the pricing used at reservation time:

```prisma
model Rsvp {
  // ... existing fields ...
  
  // Pricing at time of reservation
  facilityCost    Decimal? // The cost that was charged
  facilityCredit  Decimal? // The credit that was charged
  pricingRuleId   String?   // Reference to the pricing rule used
  
  // ... rest of fields ...
}
```

---

## 4. Business Logic

### 4.1 Pricing Calculation Algorithm

When calculating the cost for a reservation at a specific date/time:

1. **Get all applicable rules:**
   - Rules for the specific facility (if `facilityId` matches)
   - Store-wide rules (where `facilityId` is null)
   - Only active rules (`isActive = true`)

2. **Filter by day of week:**
   - Parse `dayOfWeek` field
   - Check if reservation day matches
   - Special handling for "weekend" and "weekday"

3. **Filter by time range:**
   - If `startTime` and `endTime` are set, check if reservation time falls within range
   - Handle time ranges that span midnight (e.g., 22:00 - 02:00)

4. **Select matching rule:**
   - Sort rules by priority (descending)
   - First matching rule wins
   - If no rule matches, use facility's `defaultCost` and `defaultCredit`

5. **Apply pricing:**
   - Use rule's `cost` if set, otherwise use facility's `defaultCost`
   - Use rule's `credit` if set, otherwise use facility's `defaultCredit`

### 4.2 Priority System

Rules are evaluated in priority order (highest first):

- **Priority 100+:** Facility-specific rules
- **Priority 50-99:** Store-wide rules with time ranges
- **Priority 1-49:** Store-wide rules without time ranges
- **Priority 0:** Default (facility defaults)

**Example:**

``` text
Rule 1: Facility "VIP Room", Weekend, Priority 100 → $250
Rule 2: Store-wide, Weekend, Priority 50 → $150
Rule 3: Facility "VIP Room", All days, Priority 10 → $200
Rule 4: Store-wide, All days, Priority 1 → $100
```

For VIP Room on Saturday:

- Rule 1 matches → $250

For Regular Table on Saturday:

- Rule 1 doesn't match (wrong facility)
- Rule 2 matches → $150

For VIP Room on Monday:

- Rule 1 doesn't match (not weekend)
- Rule 2 doesn't match (not weekend)
- Rule 3 matches → $200

### 4.3 Day of Week Parsing

The `dayOfWeek` field supports multiple formats:

```typescript
// JSON array of day numbers
"[0,6]"  // Sunday and Saturday
"[1,2,3,4,5]"  // Monday through Friday

// Special keywords
"weekend"  // Saturday (6) and Sunday (0)
"weekday"  // Monday (1) through Friday (5)

// null
null  // All days
```

### 4.4 Time Range Handling

Time ranges are in the store's timezone:

```typescript
// Normal range
startTime: "18:00"
endTime: "22:00"
// Matches: 18:00:00 - 21:59:59

// Range spanning midnight
startTime: "22:00"
endTime: "02:00"
// Matches: 22:00:00 - 23:59:59 OR 00:00:00 - 01:59:59

// All day (both null)
startTime: null
endTime: null
// Matches: All times
```

---

## 5. API Design

### 5.1 Server Actions

**Location:** `src/actions/storeAdmin/facilityPricing/`

#### 5.1.1 Create Pricing Rule

```typescript
// create-facility-pricing-rule.ts
export const createFacilityPricingRuleAction = storeOwnerActionClient
  .metadata({ name: "createFacilityPricingRule" })
  .schema(createFacilityPricingRuleSchema)
  .action(async ({ parsedInput }) => {
    // Implementation
  });
```

**Schema:**

```typescript
const createFacilityPricingRuleSchema = z.object({
  storeId: z.string().uuid(),
  facilityId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  priority: z.number().int().min(0).max(1000).default(0),
  dayOfWeek: z.string().nullable().optional(), // JSON array or "weekend"/"weekday"
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  credit: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().default(true),
});
```

#### 5.1.2 Update Pricing Rule

```typescript
// update-facility-pricing-rule.ts
export const updateFacilityPricingRuleAction = storeOwnerActionClient
  .metadata({ name: "updateFacilityPricingRule" })
  .schema(updateFacilityPricingRuleSchema)
  .action(async ({ parsedInput }) => {
    // Implementation
  });
```

#### 5.1.3 Delete Pricing Rule

```typescript
// delete-facility-pricing-rule.ts
export const deleteFacilityPricingRuleAction = storeOwnerActionClient
  .metadata({ name: "deleteFacilityPricingRule" })
  .schema(deleteFacilityPricingRuleSchema)
  .action(async ({ parsedInput }) => {
    // Implementation
  });
```

#### 5.1.4 Calculate Pricing

```typescript
// calculate-facility-pricing.ts
export const calculateFacilityPricingAction = baseClient
  .metadata({ name: "calculateFacilityPricing" })
  .schema(calculateFacilityPricingSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, facilityId, dateTime } = parsedInput;
    
    if (!facilityId) {
      return { serverError: "facilityId is required" };
    }
    
    // Get facility
    const facility = await sqlClient.storeFacility.findUnique({
      where: { id: facilityId },
    });
    
    if (!facility) {
      return { serverError: "Facility not found" };
    }
    
    // Get applicable rules
    const rules = await getApplicablePricingRules(storeId, facilityId, dateTime);
    
    // Calculate pricing
    const pricing = calculatePricing(facility, rules, dateTime);
    
    return { pricing };
  });
```

### 5.2 Utility Functions

**Location:** `src/utils/facility-pricing.ts`

```typescript
/**
 * Get all applicable pricing rules for a given date/time
 * 
 * @param storeId - The store ID
 * @param facilityId - The facility ID (null for store-wide rules)
 * @param dateTime - The date/time to check (must be in store's timezone)
 * @returns Array of matching pricing rules, sorted by priority (descending)
 * 
 * Note: The dateTime parameter should already be converted to the store's timezone
 * before calling this function. Use the store's defaultTimezone to convert UTC dates.
 */
export async function getApplicablePricingRules(
  storeId: string,
  facilityId: string | null,
  dateTime: Date,
): Promise<FacilityPricingRule[]> {
  // Get all active rules for this store and facility (or store-wide)
  const rules = await sqlClient.facilityPricingRule.findMany({
    where: {
      storeId,
      isActive: true,
      OR: [
        { facilityId: facilityId },
        { facilityId: null }, // Store-wide rules
      ],
    },
    orderBy: { priority: "desc" },
  });
  
  // Filter by day of week and time range
  return rules.filter((rule) => {
    if (!matchesDayOfWeek(dateTime, rule.dayOfWeek)) {
      return false;
    }
    
    const timeStr = formatTime(dateTime); // "HH:mm" format
    if (!matchesTimeRange(timeStr, rule.startTime, rule.endTime)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Calculate the cost and credit for a reservation
 * 
 * @param facility - The facility
 * @param rules - Array of matching pricing rules (already sorted by priority)
 * @param dateTime - The date/time of the reservation
 * @returns Calculated pricing with the rule ID that was applied
 */
export function calculatePricing(
  facility: StoreFacility,
  rules: FacilityPricingRule[],
  dateTime: Date,
): {
  cost: Decimal;
  credit: Decimal;
  ruleId: string | null;
} {
  // Use the first matching rule (highest priority)
  const rule = rules[0];
  
  if (rule) {
    return {
      cost: rule.cost ?? facility.defaultCost,
      credit: rule.credit ?? facility.defaultCredit,
      ruleId: rule.id,
    };
  }
  
  // No rule matches, use facility defaults
  return {
    cost: facility.defaultCost,
    credit: facility.defaultCredit,
    ruleId: null,
  };
}

/**
 * Check if a date/time matches a day of week rule
 * 
 * @param dateTime - The date/time to check
 * @param dayOfWeek - The day of week rule (JSON array, "weekend", "weekday", or null)
 * @returns True if the date/time matches the rule
 */
export function matchesDayOfWeek(
  dateTime: Date,
  dayOfWeek: string | null,
): boolean {
  if (!dayOfWeek) {
    return true; // null = all days
  }
  
  const day = dateTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === "weekend") {
    return day === 0 || day === 6; // Sunday or Saturday
  }
  
  if (dayOfWeek === "weekday") {
    return day >= 1 && day <= 5; // Monday to Friday
  }
  
  // Parse JSON array
  try {
    const days = JSON.parse(dayOfWeek) as number[];
    return days.includes(day);
  } catch {
    return false;
  }
}

/**
 * Check if a time matches a time range
 * 
 * @param time - The time to check (HH:mm format)
 * @param startTime - Start of range (HH:mm format, or null)
 * @param endTime - End of range (HH:mm format, or null)
 * @returns True if the time falls within the range
 */
export function matchesTimeRange(
  time: string, // HH:mm format
  startTime: string | null,
  endTime: string | null,
): boolean {
  // Both null = all day
  if (!startTime && !endTime) {
    return true;
  }
  
  // Parse time strings to minutes since midnight
  const timeMinutes = parseTimeToMinutes(time);
  const startMinutes = startTime ? parseTimeToMinutes(startTime) : 0;
  const endMinutes = endTime ? parseTimeToMinutes(endTime) : 1439; // 23:59
  
  // Normal range (startTime < endTime)
  if (startTime && endTime && startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }
  
  // Range spanning midnight (startTime > endTime)
  if (startTime && endTime && startMinutes > endMinutes) {
    return timeMinutes >= startMinutes || timeMinutes < endMinutes;
  }
  
  // Only startTime set (from startTime to end of day)
  if (startTime && !endTime) {
    return timeMinutes >= startMinutes;
  }
  
  // Only endTime set (from start of day to endTime)
  if (!startTime && endTime) {
    return timeMinutes < endMinutes;
  }
  
  return false;
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format a Date object to HH:mm string
 */
function formatTime(dateTime: Date): string {
  const hours = dateTime.getHours().toString().padStart(2, "0");
  const minutes = dateTime.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
```

---

## 6. UI Design

### 6.1 Pricing Rules Management Page

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility-pricing/page.tsx`

**Features:**

- List all pricing rules
- Filter by facility
- Sort by priority
- Enable/disable rules
- Create, edit, delete rules

### 6.2 Pricing Rule Form

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility-pricing/components/edit-pricing-rule-dialog.tsx`

**Fields:**

- **Name:** Text input
- **Facility:** Dropdown (optional, "All Facilities" option)
- **Priority:** Number input (0-1000)
- **Day of Week:**
  - Radio buttons: "All Days", "Weekdays", "Weekends", "Custom"
  - If "Custom": Multi-select checkboxes for days
- **Time Range:**
  - Start time: Time picker (optional)
  - End time: Time picker (optional)
  - Checkbox: "All day" (clears time inputs)
- **Pricing:**
  - Cost: Number input (optional, "Use facility default" checkbox)
  - Credit: Number input (optional, "Use facility default" checkbox)
- **Status:** Toggle (Active/Inactive)

### 6.3 Pricing Preview

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility-pricing/components/pricing-preview.tsx`

**Features:**

- Select facility
- Select date and time
- Display calculated cost and credit
- Show which rule applies
- Preview for multiple dates/times

### 6.4 Reservation Form Integration

When creating a reservation, show the calculated cost:

```typescript
// In reservation form
const [calculatedPricing, setCalculatedPricing] = useState<{
  cost: number;
  credit: number;
} | null>(null);

useEffect(() => {
  if (selectedFacility && selectedDateTime) {
    calculateFacilityPricingAction({
      storeId,
      facilityId: selectedFacility.id,
      dateTime: selectedDateTime,
    }).then((result) => {
      if (result.data) {
        setCalculatedPricing(result.data.pricing);
      }
    });
  }
}, [selectedFacility, selectedDateTime]);
```

---

## 7. Implementation Steps

### Phase 1: Database Schema

1. Add `FacilityPricingRule` model to Prisma schema
2. Add pricing fields to `Rsvp` model
3. Create and run migration

### Phase 2: Core Logic

1. Implement utility functions for pricing calculation
2. Implement day-of-week matching
3. Implement time range matching
4. Implement priority-based rule selection

### Phase 3: Server Actions

1. Create CRUD actions for pricing rules
2. Create pricing calculation action
3. Update reservation creation to use calculated pricing

### Phase 4: UI Components

1. Create pricing rules management page
2. Create pricing rule form dialog
3. Create pricing preview component
4. Integrate pricing display in reservation forms

### Phase 5: Testing

1. Unit tests for pricing calculation logic
2. Integration tests for rule matching
3. E2E tests for pricing rule management

---

## 8. Edge Cases & Considerations

### 8.1 Overlapping Rules

**Scenario:** Multiple rules match the same date/time.

**Solution:** Priority system ensures only the highest priority rule applies.

### 8.2 Time Zone Handling

**Consideration:** Store timezone vs UTC.

**Solution:** All time comparisons use store's timezone. Store `defaultTimezone` from `Store` model.

### 8.3 Historical Pricing

**Consideration:** What if pricing rules change after a reservation is made?

**Solution:** Store `facilityCost`, `facilityCredit`, and `pricingRuleId` in `Rsvp` model at reservation creation time. This preserves the price that was charged.

### 8.4 Rule Conflicts

**Scenario:** Facility-specific rule and store-wide rule both match.

**Solution:** Priority system. Facility-specific rules should have higher priority (100+) than store-wide rules (50-99).

### 8.5 Missing Rules

**Scenario:** No rules match a reservation time.

**Solution:** Fall back to facility's `defaultCost` and `defaultCredit`.

### 8.6 Time Range Validation

**Consideration:** Invalid time ranges (e.g., endTime < startTime when not spanning midnight).

**Solution:** Validate in schema and form. Allow ranges that span midnight.

---

## 9. Example Scenarios

### Scenario 1: Simple Weekend Pricing

**Rule:**

```json
{
  "name": "Weekend Pricing",
  "facilityId": null,
  "priority": 50,
  "dayOfWeek": "weekend",
  "startTime": null,
  "endTime": null,
  "cost": 120,
  "credit": null
}
```

**Result:**

- Saturday 10:00 AM → Cost: $120
- Monday 7:00 PM → Cost: $100 (default)

### Scenario 2: Peak Hours on Weekdays

**Rule:**

```json
{
  "name": "Weekday Peak Hours",
  "facilityId": null,
  "priority": 50,
  "dayOfWeek": "weekday",
  "startTime": "18:00",
  "endTime": "22:00",
  "cost": 120,
  "credit": null
}
```

**Result:**

- Tuesday 7:00 PM → Cost: $120
- Tuesday 3:00 PM → Cost: $100 (default)

### Scenario 3: Facility-Specific VIP Pricing

**Rule:**

```json
{
  "name": "VIP Room Weekend",
  "facilityId": "vip-room-id",
  "priority": 100,
  "dayOfWeek": "weekend",
  "startTime": null,
  "endTime": null,
  "cost": 250,
  "credit": null
}
```

**Result:**

- VIP Room, Saturday 2:00 PM → Cost: $250
- Regular Table, Saturday 2:00 PM → Cost: $150 (store-wide weekend rule)

---

## 10. Future Enhancements

### 10.1 Seasonal Pricing

- Add date range support (e.g., "December 1 - January 15")
- Support for holiday pricing

### 10.2 Dynamic Pricing

- Adjust pricing based on demand
- Surge pricing during high-demand periods

### 10.3 Discount Rules

- Percentage-based discounts
- Fixed amount discounts
- Coupon code integration

### 10.4 Package Pricing

- Multi-hour pricing
- Package deals (e.g., "3 hours for price of 2")

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-27 | System | Initial design document |

---

## End of Document
