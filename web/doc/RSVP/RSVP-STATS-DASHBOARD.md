# RSVP Statistics Dashboard

**Created:** 2025-01-27  
**Last Updated:** 2025-01-27  
**Status:** Active  
**Related:** [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)

## Overview

The RSVP Statistics Dashboard provides store administrators with real-time overview metrics for reservation management. The dashboard displays key statistics including upcoming reservations, completed reservations for the selected period (week/month/year), and customer credit information.

The dashboard includes a period toggle that allows viewing completed reservations for the current week, month, or year. The period calculation is based on the store's timezone (matching `RsvpHistoryClient` behavior) rather than UTC.

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
- Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
- Clickable cards that navigate to relevant pages
- Currency formatting for monetary values
- Conditional rendering (only shows when RSVP is enabled)
- **Period toggle** - Filter completed reservations by week, month, or year

**Statistics Displayed:**

1. **Upcoming Reservations**
   - Icon: Calendar (`IconCalendar`)
   - Value: Count of upcoming reservations
   - Sub-values:
     - Total Revenue (formatted currency)
     - Facility Cost (formatted currency)
     - Service Staff Cost (formatted currency)
   - Link: `/storeAdmin/[storeId]/rsvp`
   - Color: Blue

2. **Completed This Week/Month/Year**
   - Icon: Currency Dollar (`IconCurrencyDollar`)
   - Value: Count of completed RSVPs for the selected period
   - Title: Dynamically changes based on period selection ("Completed This Week", "Completed This Month", or "Completed This Year")
   - Sub-values:
     - Total Revenue (formatted currency)
     - Facility Cost (formatted currency)
     - Service Staff Cost (formatted currency)
   - Link: `/storeAdmin/[storeId]/rsvp`
   - Color: Green

3. **Customers with Credit**
   - Icon: Credit Card (`IconCreditCard`)
   - Value: Count of customers with unused credit
   - Sub-value: Total unused credit points (formatted number)
   - Link: `/storeAdmin/[storeId]/customers`
   - Color: Purple

**Period Toggle:**

- Component: Button group with three options
- Options: "This Week", "This Month", "This Year"
- Default: "This Month"
- State managed in client component with `useState`
- Updates date range calculation when selection changes
- SWR automatically refetches data when period changes
- Date range calculation matches `RsvpHistoryClient` behavior (store timezone-based)

**Data Fetching:**

- Uses SWR for client-side data fetching
- API endpoint: `/api/storeAdmin/[storeId]/rsvp/stats?period={period}&startEpoch={startEpoch}&endEpoch={endEpoch}`
- Query parameters:
  - `period`: `"week" | "month" | "year"` (default: "month")
  - `startEpoch`: BigInt epoch timestamp (start of period in store timezone, converted to UTC)
  - `endEpoch`: BigInt epoch timestamp (end of period in store timezone, converted to UTC)
- Only fetches when:
  - RSVP is enabled (`rsvpSettings?.acceptReservation`)
  - `storeId` is available
  - Component is hydrated (prevents SSR/CSR mismatch)
  - Date range is valid (`startEpoch` and `endEpoch` are available)

**UI States:**

- Loading: Skeleton cards with placeholder content (shows 3 skeleton cards)
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

- `period`: Optional enum `"week" | "month" | "year"` (default: `"month"`)
- `startEpoch`: BigInt epoch timestamp (start of period in UTC)
- `endEpoch`: BigInt epoch timestamp (end of period in UTC)

**Statistics Calculated:**

1. **Upcoming Count** (`upcomingCount`)
   - Count of RSVPs where:
     - `rsvpTime >= now` (future reservations)
     - Status is `Pending` or `Ready`, OR
     - `alreadyPaid = true`, OR
     - `confirmedByStore = true`, OR
     - `confirmedByCustomer = true`
     - Status is NOT `Completed`, `Cancelled`, or `NoShow`

2. **Upcoming Revenue** (`upcomingTotalRevenue`, `upcomingFacilityCost`, `upcomingServiceStaffCost`)
   - Calculated directly from upcoming RSVP records (`facilityCost` and `serviceStaffCost` fields)
   - `upcomingTotalRevenue`: Sum of `facilityCost + serviceStaffCost`
   - `upcomingFacilityCost`: Sum of `facilityCost` only
   - `upcomingServiceStaffCost`: Sum of `serviceStaffCost` only

3. **Completed Count** (`completedCount`)
   - Count of RSVPs where:
     - Status is `Completed`
     - `rsvpTime` is within the selected period (`startEpoch` to `endEpoch`)

4. **Completed Revenue** (`completedTotalRevenue`, `completedFacilityCost`, `completedServiceStaffCost`)
   - Calculated directly from completed RSVP records (`facilityCost` and `serviceStaffCost` fields)
   - `completedTotalRevenue`: Sum of `facilityCost + serviceStaffCost`
   - `completedFacilityCost`: Sum of `facilityCost` only
   - `completedServiceStaffCost`: Sum of `serviceStaffCost` only

5. **Unused Credit** (`customerCount`, `totalUnusedCredit`)
   - Count of customers with `point > 0` in `CustomerCredit` table
   - Sum of all unused credit points

**Date Handling:**

- All timestamps use BigInt epoch milliseconds
- **Period calculation uses store timezone** (matching `RsvpHistoryClient` behavior)
- Client component calculates period boundaries in store timezone, then converts to UTC for database queries
- Server action receives UTC epoch timestamps for database queries
- Period boundaries:
  - Week: Start of week (Sunday 00:00:00) to end of week (Saturday 23:59:59) in store timezone
  - Month: Start of month (1st day 00:00:00) to end of month (last day 23:59:59) in store timezone
  - Year: Start of year (January 1st 00:00:00) to end of year (December 31st 23:59:59) in store timezone

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
- Extracts query parameters from URL:
  - `period`: `"week" | "month" | "year"` (default: "month")
  - `startEpoch`: BigInt string (start of period)
  - `endEpoch`: BigInt string (end of period)
- Validates period type and date range
- Passes parameters to server action
- Transforms Prisma data (BigInt/Decimal) for JSON serialization
- Returns JSON response with statistics

**Error Handling:**

- Returns 400 if date range is invalid
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
    storeTimezone={store.defaultTimezone || "Asia/Taipei"}
  />
)}
```

**Conditions for Display:**

- RSVP must be enabled (`rsvpSettings?.acceptReservation === true`)
- Component receives:
  - `rsvpSettings`: RSVP configuration for the store
  - `defaultCurrency`: Store's default currency for formatting
  - `storeTimezone`: Store's default timezone for period calculation

## Data Model

### Database Tables Used

1. **Rsvp Table**
   - Fields: `id`, `storeId`, `rsvpTime`, `status`, `alreadyPaid`, `confirmedByStore`, `confirmedByCustomer`, `facilityCost`, `serviceStaffCost` (used for revenue calculation)

2. **CustomerCredit Table**
   - Fields: `storeId`, `point` (aggregated for unused credit stats)

3. **Store Table**
   - Fields: `creditExchangeRate`, `defaultCurrency`, `defaultTimezone` (for formatting and timezone-based period calculation)

### Enums Used

- `RsvpStatus`: `Pending`, `Ready`, `Completed`, `Cancelled`, `NoShow`

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

### Revenue Calculation

Revenue is calculated directly from RSVP records (not from `StoreLedger`):

1. For upcoming RSVPs: Extract `facilityCost` and `serviceStaffCost` from all upcoming RSVP records
2. For completed RSVPs: Extract `facilityCost` and `serviceStaffCost` from completed RSVPs in the selected period
3. Calculate totals:
   - `totalRevenue`: Sum of `facilityCost + serviceStaffCost`
   - `facilityCost`: Sum of `facilityCost` only
   - `serviceStaffCost`: Sum of `serviceStaffCost` only

**Note:**

- Revenue is only recognized when RSVP is marked as `Completed`. Prepaid reservations that haven't been completed don't count as revenue for completed statistics.
- Revenue breakdown (facility vs service staff) is always shown for both upcoming and completed statistics.
- Revenue is calculated directly from RSVP records (`facilityCost` and `serviceStaffCost` fields) rather than from `StoreLedger` entries.
- This approach matches the actual cost breakdown stored in RSVP records.

### Unused Credit Calculation

Unused credit represents customer credit that has not been consumed:

1. Count customers with `point > 0` in `CustomerCredit` table
2. Sum all unused credit points

**Note:** This includes credit that may be on HOLD for Ready RSVPs. The total unused credit represents the sum of all customer credit balances.

## UI/UX Design

### Layout

- **Mobile (< 640px):** 1 column grid
- **Tablet (640px - 1024px):** 2 column grid (`@xl/main:grid-cols-2`)
- **Desktop (>= 1920px):** 3 column grid (`@5xl/main:grid-cols-3`)

### Period Toggle

**Component:** Button group with three buttons

**Features:**

- Three buttons: "This Week", "This Month", "This Year"
- Active button uses `variant="default"`, inactive buttons use `variant="outline"`
- Responsive design (touch-friendly on mobile)
- Updates completed statistics when selection changes
- Date range calculation matches `RsvpHistoryClient` behavior

### Cards

Each statistics card displays:

- **Header:** Badge with icon and title
- **Main Value:** Large, prominent number (tabular font for alignment)
- **Sub-values (if applicable):** List of revenue breakdown items (Total Revenue, Facility Cost, Service Staff Cost)
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
- `rsvp_completed_this_week` - "Completed This Week"
- `rsvp_completed_this_month` - "Completed This Month"
- `rsvp_completed_this_year` - "Completed This Year"
- `rsvp_total_revenue` - "Total Revenue"
- `rsvp_facility_cost` - "Facility Cost"
- `rsvp_service_staff_cost` - "Service Staff Cost"
- `rsvp_customers_with_credit` - "Customers with Credit"
- `rsvp_total_unused_credit` - "Total Unused Credit"
- `rsvp_stats_click_to_view` - "Click to view details"

**Period Toggle:**

- `this_week` - "This Week"
- `this_month` - "This Month"
- `this_year` - "This Year"

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

1. **Custom Date Range Filtering:** Allow admins to select custom date ranges instead of just predefined periods
2. **Historical Trends:** Show statistics over time (weekly, monthly trends)
3. **Export Functionality:** Download statistics as CSV/Excel
4. **Drill-Down Views:** Click statistics to see detailed breakdowns
5. **Comparison Views:** Compare current period with previous period
6. **Advanced Analytics:** Utilization rates, peak time analysis, resource occupancy rates
7. **Real-Time Updates:** WebSocket integration for live statistics updates
8. **Ready Status Statistics:** Add statistics for Ready status RSVPs with HOLD amounts

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
```

## Testing Considerations

### Unit Tests

- Test statistics calculations in server action
- Test edge cases (no data, null values, boundary dates)
- Test date calculations (start/end of period, store timezone handling)
- Test revenue calculation from RSVP records (facilityCost, serviceStaffCost)

### Integration Tests

- Test API endpoint returns correct data
- Test access control (unauthorized users cannot access)
- Test data transformation (BigInt/Decimal serialization)
- Test period parameter validation

### UI Tests

- Test component renders correctly with data
- Test loading states
- Test error handling
- Test responsive layout
- Test navigation links
- Test period toggle functionality
- Test period toggle updates statistics when selection changes

### Performance Tests

- Test query performance with large datasets
- Test parallel query execution
- Test client-side data fetching performance

## Summary

The RSVP Statistics Dashboard provides store administrators with a quick overview of key reservation metrics. The implementation uses a client-server architecture with SWR for efficient data fetching, parallel database queries for performance, and responsive UI design for mobile and desktop devices.

The dashboard displays three key statistics:

1. Upcoming reservations count with revenue breakdown (total, facility, service staff)
2. Completed reservations for the selected period (week/month/year) with revenue breakdown
3. Customers with unused credit count and total

**Key Features:**

- **Period Selection:** Toggle between viewing completed reservations for the current week, month, or year
- **Store Timezone-Based Periods:** Period boundaries are calculated based on store timezone (matching `RsvpHistoryClient`), not UTC
- **Revenue Breakdown:** All revenue statistics show breakdown by facility cost and service staff cost
- **Direct Revenue Calculation:** Revenue is calculated from RSVP records (`facilityCost` and `serviceStaffCost`) rather than from `StoreLedger` entries

All statistics are calculated server-side with proper access control, and displayed client-side with loading states and error handling.
