# RSVP Statistics Dashboard

**Created:** 2025-01-27  
**Last Updated:** 2025-01-30  
**Status:** Active  
**Related:** [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md)

## Overview

The RSVP Statistics Dashboard provides store administrators with real-time overview metrics for reservation management. The dashboard displays key statistics including upcoming reservations, completed reservations for the selected period (week/month/year/all), and customer information.

The dashboard includes a period toggle that allows viewing completed reservations for the current week, month, year, or all time. The period calculation is based on the store's timezone (matching `RsvpHistoryClient` behavior) rather than UTC.

**Performance Optimization:** All periods are pre-fetched in parallel on component mount, enabling instant period switching without additional API calls.

The dashboard component is displayed on the store admin home page (`/storeAdmin/[storeId]`) when RSVP functionality is enabled for the store.

## Architecture

### Components

#### 1. Client Component (`rsvp-stats.tsx`)

**Location:** `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/rsvp-stats.tsx`

**Type:** Client Component (uses SWR for data fetching)

**Purpose:** Displays statistics cards in a responsive grid layout

**Key Features:**

- **Pre-fetches all periods in parallel** using multiple SWR hooks for instant switching
- Handles hydration to prevent SSR/CSR mismatches
- Displays loading skeleton states
- Responsive grid layout (1 column on mobile, 2 on tablet, 4 on desktop)
- Clickable cards that navigate to relevant pages
- Currency formatting for monetary values
- Conditional rendering (only shows when RSVP is enabled)
- **Period toggle** - Filter reservations by week, month, year, or all time
- **Instant period switching** - No loading delay when changing periods (data pre-loaded)
- **Staff filtering** - Staff users only see statistics for RSVPs they created

**Statistics Displayed:**

1. **Ready Reservations (within period)** - *First card*
   - **Main Value:** Count of Ready status RSVPs within the selected period
   - **Sub-values:** List of Ready RSVPs, each showing:
     - RSVP time (formatted as `MM/dd HH:mm` in store timezone)
     - Customer name
     - Facility name (if available)
   - Format: `01/18 14:00 - Customer Name - Facility Name`
   - Filtered by the selected period (week/month/year/all)
   - Only includes RSVPs with status = `Ready`
   - Links to RSVP history page
   - **Note:** Staff users only see Ready RSVPs they created

2. **Facility Usage** - *Second card*
   - **Main Value:** Total facility revenue (sum of all facility revenues, formatted currency)
   - **Sub-values:** Lists all facilities with completed RSVPs in the selected period:
     - Facility name
     - Total revenue (formatted currency) for that facility
     - Number of RSVPs (count) for that facility
   - Format: `Facility Name: NT$1,234 (5)`
   - Filtered by the selected period (week/month/year/all)
   - Only includes completed RSVPs
   - **Note:** Staff users only see statistics for RSVPs they created

3. **Service Staff Performance** - *Third card*
   - **Main Value:** Total service staff revenue (sum of all service staff revenues, formatted currency)
   - **Sub-values:** Lists all service staff with completed RSVPs in the selected period:
     - Staff name
     - Total revenue (formatted currency) for that staff member
     - Number of RSVPs (count) for that staff member
   - Format: `Staff Name: NT$1,234 / 5`
   - Filtered by the selected period (week/month/year/all)
   - Only includes completed RSVPs
   - **Note:** Staff users only see statistics for RSVPs they created

4. **General Statistics** - *Fourth card*
   - **Main Value:** Empty (shows sub-values only)
   - **Sub-values:**
     - **Completed Reservation Revenue** (`completedTotalRevenue`) - Total revenue from completed RSVPs in the selected period (formatted currency, with period interpolation)
     - **New Customers** (`newCustomerCount`) - Count of customers created in the selected period (filtered by period, with period interpolation)
     - **Unused Account Balance** (`totalUnusedCredit`) - Total unused fiat balance (formatted currency)
   - **Note:** Staff users only see statistics for RSVPs they created

**Period Toggle:**

- Component: Button group with four options
- Options: "This Week", "This Month", "This Year", "All"
- Default: "This Month"
- State managed in client component with `useState`
- **Pre-fetches all periods in parallel** on component mount
- **Instant switching** - No API calls when changing periods (data already loaded)
- Date range calculation matches `RsvpHistoryClient` behavior (store timezone-based)
- "All" period shows all completed RSVPs without date filtering

**Data Fetching:**

- Uses **multiple SWR hooks** to pre-fetch all periods in parallel
- Each period (week, month, year, all) has its own `useSWR` hook
- All periods fetch simultaneously on component mount
- API endpoint: `/api/storeAdmin/[storeId]/rsvp/stats?period={period}&startEpoch={startEpoch}&endEpoch={endEpoch}`
- Query parameters:
  - `period`: `"week" | "month" | "year" | "all"` (default: "month")
  - `startEpoch`: BigInt epoch timestamp (start of period in store timezone, converted to UTC) - optional for "all" period
  - `endEpoch`: BigInt epoch timestamp (end of period in store timezone, converted to UTC) - optional for "all" period
- Only fetches when:
  - RSVP is enabled (`rsvpSettings?.acceptReservation`)
  - `storeId` is available
  - Component is hydrated (prevents SSR/CSR mismatch)
  - Date range is valid (`startEpoch` and `endEpoch` are available, except for "all" period)
- **Performance:** Period switching is instant because all data is pre-loaded

**UI States:**

- Loading: Skeleton cards with placeholder content (shows 4 skeleton cards)
- Error: Silently fails (returns `null`)
- Success: Displays statistics cards with actual data (4 cards total)

#### 2. Server Action (`get-rsvp-stats.ts`)

**Location:** `src/actions/storeAdmin/rsvp/get-rsvp-stats.ts`

**Type:** Server Action (wrapped with `storeActionClient`)

**Purpose:** Calculates and returns RSVP statistics

**Access Control:**

- Uses `storeActionClient` wrapper
- Requires authenticated user with store membership
- Validates user has appropriate role (owner, storeAdmin, staff, or sysAdmin)
- **Staff filtering:** If user role is `staff`, all RSVP queries are filtered by `createdBy = userId`
  - Staff users only see statistics for RSVPs they created
  - Store owners and admins see all RSVPs (no filtering)

**Input Parameters:**

- `period`: Optional enum `"week" | "month" | "year" | "all"` (default: `"month"`)
- `startEpoch`: BigInt epoch timestamp (start of period in UTC) - nullable, optional for "all" period
- `endEpoch`: BigInt epoch timestamp (end of period in UTC) - nullable, optional for "all" period

**Statistics Calculated:**

1. **Ready RSVPs (within period)** (`readyCount`, `readyRsvps`)
   - Count of RSVPs where:
     - Status is `Ready`
     - `rsvpTime` is within the selected period (`startEpoch` to `endEpoch`)
     - For "all" period, no date filtering (shows all Ready RSVPs)
   - Returns array of Ready RSVPs with:
     - `rsvpTime`: BigInt epoch timestamp
     - `customerName`: Customer name (from Customer.name or RSVP.name for anonymous)
     - `facilityName`: Facility name (if available, null otherwise)
   - Sorted by `rsvpTime` ascending

2. **Upcoming Count** (`upcomingCount`)
   - Count of RSVPs where:
     - `rsvpTime >= now` (future reservations)
     - Status is `Pending` or `Ready`, OR
     - `alreadyPaid = true`, OR
     - `confirmedByStore = true`, OR
     - `confirmedByCustomer = true`
     - Status is NOT `Completed`, `Cancelled`, or `NoShow`

3. **Upcoming Revenue** (`upcomingTotalRevenue`, `upcomingFacilityCost`, `upcomingServiceStaffCost`)
   - Calculated directly from upcoming RSVP records (`facilityCost` and `serviceStaffCost` fields)
   - `upcomingTotalRevenue`: Sum of `facilityCost + serviceStaffCost`
   - `upcomingFacilityCost`: Sum of `facilityCost` only
   - `upcomingServiceStaffCost`: Sum of `serviceStaffCost` only

4. **Completed Count** (`completedCount`)
   - Count of RSVPs where:
     - Status is `Completed`
     - `rsvpTime` is within the selected period (`startEpoch` to `endEpoch`)

5. **Completed Revenue** (`completedTotalRevenue`, `completedFacilityCost`, `completedServiceStaffCost`)
   - Calculated directly from completed RSVP records (`facilityCost` and `serviceStaffCost` fields)
   - `completedTotalRevenue`: Sum of `facilityCost + serviceStaffCost`
   - `completedFacilityCost`: Sum of `facilityCost` only
   - `completedServiceStaffCost`: Sum of `serviceStaffCost` only

6. **Facility Breakdown** (`facilityStats`)
   - Array of facility statistics for completed RSVPs in the selected period
   - Each facility stat includes:
     - `facilityId`: Facility ID
     - `facilityName`: Facility name
     - `totalRevenue`: Total revenue (facilityCost + serviceStaffCost) for all RSVPs using this facility
     - `count`: Number of completed RSVPs using this facility
   - Sorted by revenue (descending)
   - Only includes facilities that have completed RSVPs in the selected period

7. **Service Staff Breakdown** (`serviceStaffStats`)
   - Array of service staff statistics for completed RSVPs in the selected period
   - Each staff stat includes:
     - `serviceStaffId`: Service staff ID
     - `staffName`: Staff name (from User.name or User.email)
     - `totalRevenue`: Total revenue (facilityCost + serviceStaffCost) for all RSVPs with this staff
     - `count`: Number of completed RSVPs with this staff
   - Sorted by revenue (descending)
   - Only includes staff members that have completed RSVPs in the selected period

8. **Total Customer Count** (`totalCustomerCount`)
   - Count of all customers in the store (all `Member` records with `role = customer` in the store's organization)

9. **New Customer Count** (`newCustomerCount`)
   - Count of customers created in the selected period
   - Filtered by `Member.createdAt` within the period date range
   - For "all" period, shows all customers (same as `totalCustomerCount`)

10. **Unused Account Balance** (`customerCount`, `totalUnusedCredit`)
   - Count of customers with `fiat > 0` in `CustomerCredit` table
   - Sum of all unused fiat balances (not credit points)
   - **Note:** Uses `fiat` field (RSVP account balance), not `point` field (credit points)

**Date Handling:**

- All timestamps use BigInt epoch milliseconds
- **Period calculation uses store timezone** (matching `RsvpHistoryClient` behavior)
- Client component **pre-calculates all period date ranges** in a single `useMemo` hook
- Client component calculates period boundaries in store timezone, then converts to UTC for database queries
- Server action receives UTC epoch timestamps for database queries
- For `Member.createdAt` queries, epoch timestamps are converted to Date objects using `epochToDate()`
- Period boundaries:
  - Week: Start of week (Sunday 00:00:00) to end of week (Saturday 23:59:59) in store timezone
  - Month: Start of month (1st day 00:00:00) to end of month (last day 23:59:59) in store timezone
  - Year: Start of year (January 1st 00:00:00) to end of year (December 31st 23:59:59) in store timezone
  - All: No date filtering (shows all completed RSVPs and all customers)

**Performance:**

- Uses `Promise.all()` to fetch multiple statistics in parallel
- Minimizes database queries by batching operations
- Client-side pre-fetches all periods in parallel for instant switching
- SWR caching ensures minimal refetching when switching periods

#### 3. API Route (`stats/route.ts`)

**Location:** `src/app/api/storeAdmin/[storeId]/rsvp/stats/route.ts`

**Type:** Next.js API Route Handler (GET)

**Purpose:** HTTP endpoint for fetching RSVP statistics

**Implementation:**

- Calls `getRsvpStatsAction` server action
- Handles access control (via server action)
- Extracts query parameters from URL:
  - `period`: `"week" | "month" | "year" | "all"` (default: "month")
  - `startEpoch`: BigInt string (start of period) - optional for "all" period
  - `endEpoch`: BigInt string (end of period) - optional for "all" period
- Validates period type and date range (date range validation skipped for "all" period)
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
   - Fields: `id`, `storeId`, `rsvpTime`, `status`, `alreadyPaid`, `confirmedByStore`, `confirmedByCustomer`, `facilityCost`, `serviceStaffCost`, `createdBy`, `name` (used for revenue calculation and staff filtering)
   - `createdBy`: User ID who created the reservation (used for staff filtering)
   - `name`: Customer name for anonymous reservations
   - Relations: `Customer`, `Facility`, `ServiceStaff` (for name lookups)

2. **CustomerCredit Table**
   - Fields: `storeId`, `fiat` (aggregated for unused account balance stats)
   - **Note:** Uses `fiat` field (RSVP account balance), not `point` field (credit points)

3. **Member Table**
   - Fields: `organizationId`, `role`, `createdAt` (for customer count and new customer count)
   - Used to count total customers and new customers created in period

4. **Store Table**
   - Fields: `creditExchangeRate`, `organizationId`, `defaultCurrency`, `defaultTimezone` (for formatting and timezone-based period calculation)

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

### Customer Statistics Calculation

**Total Customer Count:**

- Counts all `Member` records with `role = customer` in the store's organization
- Not filtered by period (always shows total count)

**New Customer Count:**

- Counts `Member` records with `role = customer` created within the selected period
- Filtered by `Member.createdAt` within the period date range
- For "all" period, shows the same as total customer count

**Unused Account Balance:**

- Counts customers with `fiat > 0` in `CustomerCredit` table
- Sums all unused fiat balances (RSVP account balance)
- **Note:** Uses `fiat` field (always available), not `point` field (requires `useCustomerCredit` setting)
- This includes fiat that may be on HOLD for Ready RSVPs

## UI/UX Design

### Layout

- **Mobile (< 640px):** 1 column grid
- **Tablet (640px - 1024px):** 2 column grid (`@xl/main:grid-cols-2`)
- **Desktop (>= 1920px):** 4 column grid (`@5xl/main:grid-cols-4`)

### Period Toggle

**Component:** Button group with three buttons

**Features:**

- Four buttons: "This Week", "This Month", "This Year", "All"
- Active button uses `variant="default"`, inactive buttons use `variant="outline"`
- Responsive design (touch-friendly on mobile)
- **Instant switching** - No loading delay when changing periods (data pre-loaded)
- Date range calculation matches `RsvpHistoryClient` behavior
- "All" period shows all completed RSVPs without date filtering

### Cards

Each statistics card displays:

- **Header:** Badge with icon and title (with period interpolation where applicable)
- **Main Value:** Large, prominent number or currency (tabular font for alignment)
- **Sub-values (if applicable):**
  - For Ready Reservations: List of RSVPs with time, customer name, and facility name (format: `MM/dd HH:mm - Customer Name - Facility Name`)
  - For Facility Usage: List of facilities with revenue and count (format: `Facility Name: NT$1,234 (5)`)
  - For Service Staff: List of staff with revenue and count (format: `Staff Name: NT$1,234 / 5`)
  - For General Statistics: Completed Reservation Revenue, New Customers, Unused Account Balance
- **Interaction:** Entire card is clickable link to relevant page
- **Special Formatting:** Sub-values with empty value field display label only (no colon separator)

### Loading States

- Skeleton cards match final layout structure
- Placeholder content prevents layout shift
- Shows 4 skeleton cards during loading

### Error Handling

- Silently fails (returns `null`) if error occurs
- No error UI displayed to user
- Errors are logged server-side

## Internationalization

### Translation Keys Used

**Statistics Labels:**

- `rsvp_stat_ready_reservations` - "Upcoming Reservations {{period}}" (with period interpolation)
  - English: "Upcoming Reservations This Month"
  - Traditional Chinese: "本月待完成預約"
  - Japanese: "今月準備完了予約"
- `rsvp_stat_facility_usage` - "Facility Usage"
- `rsvp_stat_service_staff` - "Service Staff"
- `rsvp_stat_general_statistics` - "General Statistics"
- `rsvp_stat_completed_reservation_revenue` - "{{period}}收入" (with period interpolation)
  - English: "Completed Reservation Revenue"
  - Traditional Chinese: "本月收入" (with period)
  - Japanese: "完了した予約の総収入"
- `rsvp_stat_new_customers` - "{{period}}新增客戶數" (with period interpolation)
  - English: "New Customers"
  - Traditional Chinese: "本月新增客戶數" (with period)
  - Japanese: "新規顧客"
- `rsvp_stat_unused_account_balance` - "Unused Account Balance"
- `rsvp_stat_no_facilities` - "No facilities used"
- `rsvp_stat_no_service_staff` - "No service staff"

**Period Toggle:**

- `rsvp_stat_this_week` - "This Week" / "本週" / "今週"
- `rsvp_stat_this_month` - "This Month" / "本月" / "今月"
- `rsvp_stat_this_year` - "This Year" / "今年" / "今年"
- `rsvp_stat_all` - "All" / "全部" / "すべて"

### Currency Formatting

- Uses `Intl.NumberFormat` with locale from i18n provider
- Currency code from store's `defaultCurrency` (defaults to "TWD")
- Minimum/maximum fraction digits: 0 (displays whole numbers only)

## Performance Considerations

### Data Fetching

- Uses **multiple SWR hooks** to pre-fetch all periods in parallel
- All periods (week, month, year, all) fetch simultaneously on component mount
- SWR caching ensures minimal refetching when switching periods
- Client-side fetching reduces server load
- Parallel database queries minimize response time
- **Instant period switching** - No API calls when changing periods (data already loaded)

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
- **Staff Filtering:** Staff users (`Role.staff`) only see statistics for RSVPs they created
  - All RSVP queries are filtered by `createdBy = userId` for staff users
  - Store owners, store admins, and sys admins see all RSVPs (no filtering)
  - Filtering is applied server-side for security

### Data Exposure

- Statistics are aggregated (no individual customer data exposed)
- Currency amounts are display-only (no financial operations exposed)
- API endpoint validates access before returning data
- Staff users can only see data for RSVPs they created (enforced server-side)

## Future Enhancements

Potential improvements that are not currently implemented:

1. **Custom Date Range Filtering:** Allow admins to select custom date ranges instead of just predefined periods
2. **Historical Trends:** Show statistics over time (weekly, monthly trends)
3. **Export Functionality:** Download statistics as CSV/Excel
4. **Drill-Down Views:** Click statistics to see detailed breakdowns
5. **Comparison Views:** Compare current period with previous period
6. **Advanced Analytics:** Utilization rates, peak time analysis, resource occupancy rates
7. **Real-Time Updates:** WebSocket integration for live statistics updates
8. ~~**Ready Status Statistics:** Add statistics for Ready status RSVPs with HOLD amounts~~ ✅ **Implemented**

## Related Requirements

From [FUNCTIONAL-REQUIREMENTS-RSVP.md](./FUNCTIONAL-REQUIREMENTS-RSVP.md):

- **FR-RSVP-057:** Store admins must be able to view reservation statistics (Store Staff access not permitted)
  - **Note:** Current implementation allows staff access but filters to show only RSVPs created by the staff member
- **UI-RSVP-006:** Reservation dashboard must provide clear daily/weekly view (optimized for tablets and phones) - accessible to Store Staff and Store Admins
  - **Status:** ✅ Implemented - Dashboard is responsive and accessible to staff (with filtered data)

**Note:** Current implementation provides statistics overview with staff filtering. Detailed analytics and reporting features mentioned in FR-RSVP-058 and FR-RSVP-059 are not yet implemented.

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

The dashboard displays four key statistics:

1. **Ready Reservations** (within selected period) - Count and list of Ready status RSVPs with time, customer name, and facility name
2. **Facility Usage** - Total revenue and breakdown by facility (revenue and count per facility)
3. **Service Staff Performance** - Total revenue and breakdown by service staff (revenue and count per staff)
4. **General Statistics** - Completed reservation revenue, new customers, and unused account balance

**Key Features:**

- **Ready Reservations:** Shows count and list of Ready status RSVPs within the selected period
- **Period Selection:** Toggle between viewing reservations for the current week, month, year, or all time
- **Pre-fetched Periods:** All periods are pre-fetched in parallel for instant switching
- **Store Timezone-Based Periods:** Period boundaries are calculated based on store timezone (matching `RsvpHistoryClient`), not UTC
- **Revenue Totals:** Facility Usage and Service Staff cards show total revenue as main value
- **Revenue Breakdown:** Facility and service staff statistics show breakdown by individual items (revenue and count)
- **Direct Revenue Calculation:** Revenue is calculated from RSVP records (`facilityCost` and `serviceStaffCost`) rather than from `StoreLedger` entries
- **Customer Statistics:** Shows completed reservation revenue (with period), new customers (with period), and unused account balance (fiat)
- **Staff Filtering:** Staff users only see statistics for RSVPs they created (filtered server-side by `createdBy`)
- **Period Interpolation:** Translation keys support `{{period}}` placeholder for dynamic period labels
- **Responsive Layout:** 1 column (mobile), 2 columns (tablet), 4 columns (desktop)

All statistics are calculated server-side with proper access control, and displayed client-side with loading states and error handling.
