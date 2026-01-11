# RSVP Statistics Dashboard

**Created:** 2025-01-27  
**Last Updated:** 2025-01-27  
**Status:** Active  
**Related:** [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)

## Overview

The RSVP Statistics Dashboard provides store administrators with real-time overview metrics for reservation management. The dashboard displays key statistics including upcoming reservations, ready status counts, completed reservations for the current month, and customer credit information.

The dashboard includes a revenue type filter toggle that allows viewing revenue by facility cost, service staff cost, or both combined. The "current month" period is calculated based on the store's timezone (matching `RsvpHistoryClient` behavior) rather than UTC.

The dashboard component is displayed on the store admin home page (`/storeAdmin/[storeId]`) when RSVP functionality is enabled for the store.

## Architecture

### Components

#### 1. Client Component (`rsvp-stats.tsx`)

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/rsvp-stats.tsx`

**Type:** Client Component (uses SWR for data fetching)

**Purpose:** Displays statistics cards in a responsive grid layout

**Key Features:**

- Fetches data using SWR from API endpoint
- Handles hydration to prevent SSR/CSR mismatches
- Displays loading skeleton states
- Responsive grid layout (1 column on mobile, 2 on tablet, 4 on desktop)
- Clickable cards that navigate to relevant pages
- Currency formatting for monetary values
- Conditional rendering (only shows when RSVP is enabled)
- **Revenue type toggle** - Filter revenue by facility, service staff, or both (similar to `RsvpStatusLegend`)

**Statistics Displayed:**

1. **Upcoming Reservations**
   - Icon: Calendar (`IconCalendar`)
   - Value: Count of upcoming reservations
   - Link: `/storeAdmin/[storeId]/rsvp`
   - Color: Blue

2. **Ready Status**
   - Icon: Coins (`IconCoins`)
   - Value: Count of RSVPs in Ready status
   - Sub-value: Total amount in hold (formatted currency)
   - Link: `/storeAdmin/[storeId]/rsvp`
   - Color: Orange

3. **Completed This Month**
   - Icon: Currency Dollar (`IconCurrencyDollar`)
   - Value: Count of completed RSVPs this month
   - Sub-value: Total revenue earned (formatted currency)
   - Link: `/storeAdmin/[storeId]/rsvp`
   - Color: Green

4. **Customers with Credit**
   - Icon: Credit Card (`IconCreditCard`)
   - Value: Count of customers with unused credit
   - Sub-value: Total unused credit points (formatted number)
   - Link: `/storeAdmin/[storeId]/customers`
   - Color: Purple

**Revenue Type Toggle:**

- Component: `RsvpRevenueTypeToggle` (similar design to `RsvpStatusLegend`)
- Options: "All", "Facility", "Service Staff"
- Colors match `RsvpStatusLegend` style (left border accent, gray text, colored backgrounds)
- State managed in client component with `useState`
- Updates API URL query parameter when selection changes
- SWR automatically refetches data when toggle changes

**Data Fetching:**

- Uses SWR for client-side data fetching
- API endpoint: `/api/storeAdmin/[storeId]/rsvp/stats?revenueType={type}`
- Query parameter: `revenueType` (default: "all")
- Only fetches when:
  - RSVP is enabled (`rsvpSettings?.acceptReservation`)
  - `storeId` is available
  - Component is hydrated (prevents SSR/CSR mismatch)

**UI States:**

- Loading: Skeleton cards with placeholder content
- Error: Silently fails (returns `null`)
- Success: Displays statistics cards with actual data

#### 2. Server Action (`get-rsvp-stats.ts`)

**Location:** `src/actions/storeAdmin/rsvp/get-rsvp-stats.ts`

**Type:** Server Action (wrapped with `storeActionClient`)

**Purpose:** Calculates and returns RSVP statistics

**Access Control:**

- Uses `storeActionClient` wrapper
- Requires authenticated user with store membership
- Validates user has appropriate role (owner, storeAdmin, staff, or sysAdmin)

**Input Parameters:**

- `revenueType`: Optional enum `"all" | "facility" | "service_staff"` (default: `"all"`)
  - `"all"`: Sum of facility cost + service staff cost
  - `"facility"`: Only facility cost
  - `"service_staff"`: Only service staff cost

**Statistics Calculated:**

1. **Upcoming Count** (`upcomingCount`)
   - Count of RSVPs where:
     - `rsvpTime >= now` (future reservations)
     - Status is `Pending` or `Ready`, OR
     - `alreadyPaid = true`, OR
     - `confirmedByStore = true`, OR
     - `confirmedByCustomer = true`
     - Status is NOT `Completed`, `Cancelled`, or `NoShow`

2. **Completed This Month** (`completedThisMonthCount`)
   - Count of RSVPs where:
     - Status is `Completed`
     - `rsvpTime` is within current month (store timezone)

3. **Unused Credit** (`unusedCreditCount`, `totalUnusedCredit`)
   - Count of customers with `point > 0` in `CustomerCredit` table
   - Sum of all unused credit points

4. **Ready Status** (`readyCount`, `totalHoldAmount`)
   - Count of RSVPs with status `Ready` and `orderId IS NOT NULL`
   - Calculates total HOLD amount by:
     - Finding all `CustomerCreditLedger` entries with:
       - Type: `Hold`
       - `referenceId` in list of Ready RSVP order IDs
     - Summing absolute values of HOLD amounts
     - Converting credit points to cash using store's `creditExchangeRate`

5. **Revenue Earned This Month** (`totalRevenueEarned`)
   - Calculated directly from RSVP records (`facilityCost` and `serviceStaffCost` fields)
   - Sum of completed RSVPs in current month (store timezone)
   - Filtered by `revenueType`:
     - `"all"`: `facilityCost + serviceStaffCost`
     - `"facility"`: `facilityCost` only
     - `"service_staff"`: `serviceStaffCost` only

**Date Handling:**

- All timestamps use BigInt epoch milliseconds
- **Current month calculation uses store timezone** (matching `RsvpHistoryClient` behavior)
- Calculation process:
  1. Get current date/time in store timezone using `Intl.DateTimeFormat`
  2. Extract date components (year, month, day) in store timezone
  3. Use `startOfMonth()` and `endOfMonth()` from `date-fns` with store timezone date
  4. Convert month boundaries to UTC using `convertToUtc()` for database queries
  5. Start of month: 1st day at 00:00:00 in store timezone (converted to UTC)
  6. End of month: Last day at 23:59:59 in store timezone (converted to UTC)
- **This ensures "current month" matches what users see in RsvpHistoryClient when filtering by "This Month"**

**Performance:**

- Uses `Promise.all()` to fetch multiple statistics in parallel
- Minimizes database queries by batching operations

#### 3. API Route (`stats/route.ts`)

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/stats/route.ts`

**Type:** Next.js API Route Handler (GET)

**Purpose:** HTTP endpoint for fetching RSVP statistics

**Implementation:**

- Calls `getRsvpStatsAction` server action
- Handles access control (via server action)
- Extracts `revenueType` query parameter from URL (default: "all")
- Passes `revenueType` to server action
- Transforms Prisma data (BigInt/Decimal) for JSON serialization
- Returns JSON response with statistics

**Error Handling:**

- Returns 403 if access denied
- Returns 500 if internal error occurs
- Logs errors with context (storeId, error message)

### Integration Points

#### Store Admin Dashboard

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/store-admin-dashboard.tsx`

The RSVP stats component is conditionally rendered on the store admin home page:

```tsx
{rsvpSettings?.acceptReservation && (
  <RsvpStats
    rsvpSettings={rsvpSettings}
    defaultCurrency={store.defaultCurrency}
  />
)}
```

**Conditions for Display:**

- RSVP must be enabled (`rsvpSettings?.acceptReservation === true`)
- Component receives:
  - `rsvpSettings`: RSVP configuration for the store
  - `defaultCurrency`: Store's default currency for formatting

## Data Model

### Database Tables Used

1. **Rsvp Table**
   - Fields: `id`, `storeId`, `rsvpTime`, `status`, `orderId`, `alreadyPaid`, `confirmedByStore`, `confirmedByCustomer`, `facilityCost`, `serviceStaffCost` (used for revenue calculation)

2. **CustomerCredit Table**
   - Fields: `storeId`, `point` (aggregated for unused credit stats)

3. **CustomerCreditLedger Table**
   - Fields: `storeId`, `type`, `referenceId`, `amount` (used for HOLD amount calculation)

4. **Store Table**
   - Fields: `creditExchangeRate`, `defaultCurrency`, `defaultTimezone` (for currency conversion, formatting, and timezone-based month calculation)

### Enums Used

- `RsvpStatus`: `Pending`, `Ready`, `Completed`, `Cancelled`, `NoShow`
- `CustomerCreditLedgerType`: `Hold`

### Revenue Type

- `"all"`: Sum of facility and service staff costs
- `"facility"`: Only facility costs
- `"service_staff"`: Only service staff costs

## Business Logic

### Upcoming Reservations Definition

A reservation is considered "upcoming" if it meets ALL of the following criteria:

1. **Time:** `rsvpTime >= now` (reservation is in the future)

2. **Status:** Must be active (not completed/cancelled/no-show)

3. **Confirmation State:** Must have at least one of:
   - Status is `Pending` or `Ready`
   - `alreadyPaid = true`
   - `confirmedByStore = true`
   - `confirmedByCustomer = true`

### HOLD Amount Calculation

The HOLD amount represents money that has been paid by customers but not yet recognized as revenue (because RSVP is not completed):

1. Find all RSVPs with status `Ready` and `orderId IS NOT NULL`
2. Get corresponding `CustomerCreditLedger` entries:
   - Type: `Hold`
   - `referenceId` matches the RSVP's `orderId`
3. Sum the absolute values of HOLD amounts (they're stored as negative values)
4. Convert credit points to cash: `totalHoldAmount = creditPoints * creditExchangeRate`

**Note:** HOLD entries are created when prepaid reservations are made using customer credit. The HOLD is released when:

- RSVP is completed (converted to revenue via `StoreLedger` entry)
- RSVP is cancelled/refunded (HOLD entry is reversed)

### Revenue Earned Calculation

Revenue is calculated directly from completed RSVP records (not from `StoreLedger`):

1. Find all RSVPs with status `Completed` in the current month (store timezone)
2. For each RSVP, extract:
   - `facilityCost`: Cost charged for facility (if applicable)
   - `serviceStaffCost`: Cost charged for service staff (if applicable)
3. Sum revenue based on `revenueType` filter:
   - `"all"`: Sum of `facilityCost + serviceStaffCost`
   - `"facility"`: Sum of `facilityCost` only
   - `"service_staff"`: Sum of `serviceStaffCost` only

**Note:**

- Revenue is only recognized when RSVP is marked as `Completed`. Prepaid reservations that haven't been completed don't count as revenue.
- Revenue is calculated directly from RSVP records (`facilityCost` and `serviceStaffCost` fields) rather than from `StoreLedger` entries.
- This approach allows filtering by revenue type (facility vs service staff) and matches the actual cost breakdown stored in RSVP records.

### Unused Credit Calculation

Unused credit represents customer credit that has not been consumed:

1. Count customers with `point > 0` in `CustomerCredit` table
2. Sum all unused credit points

**Note:** This includes credit that may be on HOLD for Ready RSVPs. The distinction is:

- **HOLD amount**: Credit reserved for specific Ready RSVPs (shown separately)
- **Unused credit**: Total credit balance across all customers (includes HOLD)

## UI/UX Design

### Layout

- **Mobile (< 640px):** 1 column grid
- **Tablet (640px - 1024px):** 2 column grid
- **Desktop (>= 1024px):** 4 column grid

### Revenue Type Toggle

**Component:** `RsvpRevenueTypeToggle`

**Location:** `src/components/rsvp-revenue-type-toggle.tsx`

**Design:** Similar to `RsvpStatusLegend` with matching color scheme

**Features:**

- Three toggle buttons: "All", "Facility", "Service Staff"
- Color-coded buttons with left border accent (matching `RsvpStatusLegend` style)
- Selection indicator with check icon
- Responsive design (touch-friendly on mobile)
- Updates revenue statistics when selection changes

**Styling:**

- Uses same color pattern as `RsvpStatusLegend`: left border (`border-l-2`), gray text (`text-gray-700`), colored backgrounds
- Colors: Blue for "All", Green for "Facility", Purple for "Service Staff"

### Cards

Each statistics card displays:

- **Header:** Badge with icon and title
- **Main Value:** Large, prominent number (tabular font for alignment)
- **Sub-value (if applicable):** Smaller text below main value (revenue amounts are filtered by selected revenue type)
- **Footer:** "Click to view" instruction text
- **Interaction:** Entire card is clickable link to relevant page

### Loading States

- Skeleton cards match final layout structure
- Placeholder content prevents layout shift
- Shows 3 skeleton cards during loading

### Error Handling

- Silently fails (returns `null`) if error occurs
- No error UI displayed to user
- Errors are logged server-side

## Internationalization

### Translation Keys Used

**Statistics Labels:**

- `rsvp_upcoming_reservations` - "Upcoming Reservations"
- `rsvp_ready_status` - "Ready Status"
- `rsvp_total_amount_in_hold` - "Total amount in hold"
- `rsvp_completed_this_month` - "Completed This Month"
- `rsvp_total_revenue_earned` - "Total revenue earned"
- `rsvp_unused_customer_credit` - "Customers with Credit"
- `rsvp_total_unused_credit` - "Total unused credit"
- `rsvp_stats_click_to_view` - "Click to view details"

**Revenue Type Toggle:**

- `rsvp_revenue_type` - "Revenue Type"
- `rsvp_revenue_type_all` - "All"
- `rsvp_revenue_type_facility` - "Facility"
- `rsvp_revenue_type_service_staff` - "Service Staff"

### Currency Formatting

- Uses `Intl.NumberFormat` with locale from i18n provider
- Currency code from store's `defaultCurrency` (defaults to "TWD")
- Minimum/maximum fraction digits: 0 (displays whole numbers only)

## Performance Considerations

### Data Fetching

- Uses SWR for automatic revalidation and caching
- Client-side fetching reduces server load
- Parallel database queries minimize response time

### Database Queries

- Uses `Promise.all()` to execute queries in parallel
- Minimizes number of queries by batching operations
- Uses appropriate indexes on frequently queried fields (`storeId`, `status`, `rsvpTime`)

### Rendering

- Conditional rendering prevents unnecessary component mounting
- Hydration check prevents SSR/CSR mismatch issues
- Skeleton loading states provide immediate feedback

## Security

### Access Control

- Server action validates user authentication and store membership
- Uses `storeActionClient` wrapper for consistent access control
- Only store members with appropriate roles can access statistics

### Data Exposure

- Statistics are aggregated (no individual customer data exposed)
- Currency amounts are display-only (no financial operations exposed)
- API endpoint validates access before returning data

## Future Enhancements

Potential improvements that are not currently implemented:

1. **Date Range Filtering:** Allow admins to select custom date ranges instead of just current month
2. **Historical Trends:** Show statistics over time (weekly, monthly trends)
3. **Export Functionality:** Download statistics as CSV/Excel
4. **Drill-Down Views:** Click statistics to see detailed breakdowns
5. **Comparison Views:** Compare current month with previous month
6. **Advanced Analytics:** Utilization rates, peak time analysis, resource occupancy rates
7. **Real-Time Updates:** WebSocket integration for live statistics updates

## Related Requirements

From [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md):

- **FR-RSVP-057:** Store admins must be able to view reservation statistics (Store Staff access not permitted)
- **UI-RSVP-006:** Reservation dashboard must provide clear daily/weekly view (optimized for tablets and phones) - accessible to Store Staff and Store Admins

**Note:** Current implementation provides statistics overview, but detailed analytics and reporting features mentioned in FR-RSVP-057, FR-RSVP-058, and FR-RSVP-059 are not yet implemented.

## File Structure

```text
src/
├── actions/
│   └── storeAdmin/
│       └── rsvp/
│           └── get-rsvp-stats.ts           # Server action for statistics calculation
├── app/
│   ├── api/
│   │   └── storeAdmin/
│   │       └── [storeId]/
│   │           └── rsvp/
│   │               └── stats/
│   │                   └── route.ts        # API route handler
│   └── storeAdmin/
│       └── (dashboard)/
│           └── [storeId]/
│               └── (routes)/
│                   ├── components/
│                   │   ├── rsvp-stats.tsx  # Client component
│                   │   └── store-admin-dashboard.tsx  # Integration point
│                   └── page.tsx            # Store admin home page
├── components/
│   └── rsvp-revenue-type-toggle.tsx        # Revenue type filter toggle component
```

## Testing Considerations

### Unit Tests

- Test statistics calculations in server action
- Test edge cases (no data, null values, boundary dates)
- Test date calculations (start/end of month, store timezone handling)
- Test revenue type filtering (all, facility, service_staff)
- Test revenue calculation from RSVP records (facilityCost, serviceStaffCost)

### Integration Tests

- Test API endpoint returns correct data
- Test access control (unauthorized users cannot access)
- Test data transformation (BigInt/Decimal serialization)

### UI Tests

- Test component renders correctly with data
- Test loading states
- Test error handling
- Test responsive layout
- Test navigation links
- Test revenue type toggle functionality
- Test toggle updates statistics when selection changes
- Test toggle matches `RsvpStatusLegend` styling

### Performance Tests

- Test query performance with large datasets
- Test parallel query execution
- Test client-side data fetching performance

## Summary

The RSVP Statistics Dashboard provides store administrators with a quick overview of key reservation metrics. The implementation uses a client-server architecture with SWR for efficient data fetching, parallel database queries for performance, and responsive UI design for mobile and desktop devices.

The dashboard displays four key statistics:

1. Upcoming reservations count
2. Ready status count with HOLD amount
3. Completed reservations this month with revenue earned (filterable by revenue type)
4. Customers with unused credit count and total

**Key Features:**

- **Revenue Type Filtering:** Toggle between viewing all revenue, facility-only revenue, or service staff-only revenue
- **Store Timezone-Based Periods:** "Current month" is calculated based on store timezone (matching `RsvpHistoryClient`), not UTC
- **Direct Revenue Calculation:** Revenue is calculated from RSVP records (`facilityCost` and `serviceStaffCost`) rather than from `StoreLedger` entries

All statistics are calculated server-side with proper access control, and displayed client-side with loading states and error handling.
