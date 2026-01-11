# RSVP Import Assessment

**Date:** 2025-01-XX  
**Status:** Assessment  
**Purpose:** Document the approach for importing RSVP reservation data from text format

## Overview

This document assesses how to import RSVP reservation data from a specific text format that represents customer reservations for services (e.g., tennis lessons).

## Data Format

### Structure

The input format consists of text blocks, each representing a customer's reservation package:

```text
{name1} {name2} {product name} {paid date}
1- {date} {time}～{time}
2- {date} {time}～{time}
...
{n}- {date} {time}～{time}
```

### Example

```text
許達夫 網球課10H（12/17/2025）
1-   12/19 14:00～15:00
2-   12/24 14:00～15:00
3-   12/29 14:00～15:00
4-   12/31 14:00～15:00
2026
5-   1 / 2  14:00～15:00
6-
7-
8-
9-
10-
11-
```

### Format Rules

1. **First Line**: `{name1} {name2} {product name} {paid date}`
   - `{name1}`: Customer first name (may be empty)
   - `{name2}`: Customer last/full name
   - `{product name}`: Product/service name (e.g., "網球課10H")
   - `{paid date}`: Payment date in format `（MM/DD YYYY）` (optional, indicates all reservations are paid)

2. **Following Lines**: Each line represents one reservation
   - Format: `{number}- {date} {time}～{time}`
   - `{number}`: Sequential number (1, 2, 3, ...)
   - `{date}`: Date in format `MM/DD` or `M/DD` (year changes when "YYYY" line appears)
   - `{time}～{time}`: Time range in format `HH:MM～HH:MM`
   - Empty lines (e.g., `6-`) indicate unused slots

3. **Year Markers**: Lines like `2026` indicate year change for subsequent dates

4. **Product Name Interpretation**:
   - Format: `{service name}{quantity}H` (e.g., "網球課10H")
   - `{quantity}H` indicates total number of reservations (e.g., "10H" = 10 reservations)
   - Used to validate that all reservations are accounted for

## Import Requirements

### 1. Customer Resolution

**Requirement**: Find or create customer by name

**Approach**:

- Parse customer name from first line (`{name1} {name2}`)
- Search for existing customer by name in the store
- If not found, create a new customer:
  - Customer name: Combined `{name1} {name2}` or just `{name1}`
  - Store ID: Current store
  - No email/phone initially (can be added later)

**Technical Notes**:

- Customer model: `Customer` table with `name`, `storeId`
- Use `sqlClient.customer.findFirst()` to search by name and storeId
- Use `sqlClient.customer.create()` to create new customer if not found

### 2. Service Staff Resolution

**Requirement**: Use the current user (importer) as service staff

**Approach**:

- Get current user from session: `await auth.api.getSession({ headers: await headers() })`
- Find service staff record where `userId = session.user.id` and `storeId = current store`
- If service staff doesn't exist, create one:
  - `userId`: Current user ID
  - `storeId`: Current store ID
  - `defaultCost`: Use existing default (represents cost for `defaultDuration` minutes)
  - `defaultDuration`: Use existing default (typically 60 minutes)

**Technical Notes**:

- Service staff model: `ServiceStaff` table with `userId`, `storeId`, `defaultCost`, `defaultDuration`
- Use `sqlClient.serviceStaff.findFirst()` to find existing service staff
- Service staff `defaultCost` is stored as `Decimal` in Prisma
- Cost calculation: Calculate cost per hour from `defaultCost` and `defaultDuration`:
  - Cost per hour = `(defaultCost / defaultDuration) * 60`
  - Then calculate cost for reservation: `(costPerHour / 60) * reservationDuration` (in minutes)
- No facility cost (use service staff cost only)

### 3. Facility Resolution

No facility required

### 4. Date/Time Parsing and Completion Status

**Requirement**: Parse reservation date and time from each line, and handle completion status

**Approach**:

- Parse date format: `MM/DD` (month/day)
- Parse time range: `HH:mm～HH:mm` (start time ~ end time)
- Handle year transitions (e.g., 2025 → 2026)
- Calculate duration: `endTime - startTime` (in minutes)
- Convert to UTC epoch BigInt for `rsvpTime` field
- Set `arriveTime` and status:
  - **If time range is provided**: Set `arriveTime` to same as `rsvpTime` (start time)
    - **Important**: If `arriveTime` is present, it indicates the RSVP is completed
      - Set RSVP status to `RsvpStatus.Completed`
      - If `alreadyPaid = false` and customer credit is enabled, process credit deduction
      - Create `StoreLedger` entry for completed RSVP (if credit deduction occurred)
        - This happens via `completeRsvpCore()` logic or equivalent
        - StoreLedger entry is created when credit is deducted for service
        - Amount: Cash value of credit points used (calculated from creditServiceExchangeRate)
        - Type: StoreLedgerType.CreditUsage
        - Balance: Calculate from last ledger balance + amount
        - Link to StoreOrder: Use orderId from RSVP's linked order
  - **If no arrive time** (time range not provided or empty line):
    - Set `arriveTime` to `null`
    - Set RSVP status to `RsvpStatus.Ready`
    - Make reservation recurring in the same time slot (weekly recurrence pattern)
    - Status `Ready` indicates the reservation is ready to be confirmed/completed when customer arrives

**Technical Notes**:

- Store timezone: Get from `store.defaultTimezone` (default: "Asia/Taipei")
- Use `convertDateToUtc()` from `@/utils/datetime-utils`
- Use `dateToEpoch()` from `@/utils/datetime-utils`
- RSVP `rsvpTime` field is `BigInt` (epoch milliseconds)
- RSVP `arriveTime` field is `BigInt | null` (can be same as `rsvpTime` or different)
- **If no arrive time**: Status should be `RsvpStatus.Ready` (40) - indicates recurring reservation ready for service
- **If arrive time present**: Status should be `RsvpStatus.Completed` (50) - indicates completed reservation

### 5. Payment Status and Order/Ledger Creation

**Requirement**: Mark reservations as paid if paid date exists, and create StoreOrder and StoreLedger accordingly

**Important**: If a paid date is present in the first line, it indicates that the customer has already paid for all reservations in that block (e.g., "10H" = 10 hours = 10 reservations). All reservations in that block should be marked as paid.

**Approach**:

- Parse paid date from first line: `（MM/DD YYYY）`
- If paid date exists:
  - Set `alreadyPaid = true` for all reservations in the block
  - Create `StoreOrder` with `isPaid = true` for each reservation (if customerId exists and cost > 0)
    - Use `createRsvpStoreOrder()` function from `@/actions/store/reservation/create-rsvp-store-order`
    - Payment method: Use "TBD" payment method (for admin-created orders)
    - Order total: Service staff cost (calculated from defaultCost)
    - Currency: Store's default currency
    - Order status: Confirmed
    - Payment status: Paid
    - Paid date: Use parsed paid date converted to UTC epoch
  - Create `StoreLedger` entry for revenue recognition (if order is paid)
    - Amount: Order total (positive for revenue)
    - Fee: 0 (no payment processing fee for admin-created orders)
    - Platform fee: 0
    - Currency: Store's default currency
    - Type: StoreLedgerType.Revenue (or appropriate type for paid orders)
    - Balance: Calculate from last ledger balance + amount
    - Description: Include RSVP ID and details
    - Link to StoreOrder: Use orderId from created StoreOrder
- If no paid date:
  - Set `alreadyPaid = false`
  - Create `StoreOrder` with `isPaid = false` (if customerId exists and cost > 0)
    - This allows customer to pay later
    - Same structure as paid orders, but `isPaid = false` and no paidDate

**Technical Notes**:

- **Paid Date**: If paid date is present, it means customer has paid for ALL reservations in that block (e.g., "10H" = 10 hours = 10 reservations). All reservations should be marked as `alreadyPaid = true`.
- RSVP `alreadyPaid` field is `boolean`
- StoreOrder must be created if `customerId` exists and `serviceStaffCost > 0`
- StoreOrder creation uses `createRsvpStoreOrder()` function
  - Requires shipping method (uses "reserve" if available, otherwise default)
  - Requires payment method (uses payment method with `payUrl = "TBD"` for admin-created orders)
  - Requires reservation prepaid product (ensured by `ensureReservationPrepaidProduct()`)
  - Links RSVP to order via `orderId` field
- StoreLedger must be created if order is paid (`isPaid = true`)
  - StoreLedger entries require `orderId` (link to StoreOrder)
  - Balance calculation: Get last ledger balance, add amount, update balance
  - Description should include RSVP ID for reference
  - Type should reflect the payment method (revenue recognition)
- **Completion Status**:
  - If `arriveTime` is present, it indicates the RSVP is completed
    - Set RSVP status to `RsvpStatus.Completed`
    - If `alreadyPaid = false` and customer credit is enabled, process credit deduction
    - Credit deduction will automatically create StoreLedger entry via `deduceCustomerCredit()` function
    - StoreLedger entry for completed RSVP:
      - Amount: Cash value of credit points used
      - Type: StoreLedgerType.CreditUsage
      - Created when credit is deducted for service
  - If no `arriveTime` (empty line or no time range), it indicates a recurring reservation
    - Set RSVP status to `RsvpStatus.Ready`
    - Set `arriveTime` to `null`
    - Make reservation recurring in the same time slot (weekly recurrence pattern)
    - Status `Ready` indicates the reservation is ready to be confirmed/completed when the customer arrives
- All operations should be within the same transaction to ensure atomicity
- Use store's default currency from `store.defaultCurrency`

### 6. Cost Calculation

**Requirement**: Calculate facility cost from service staff's default cost and duration

**Approach**:

- Get service staff's `defaultCost` and `defaultDuration`
  - `defaultCost`: Total cost for `defaultDuration` minutes (stored as Decimal)
  - `defaultDuration`: Duration in minutes (typically 60)
- Calculate cost per hour: `costPerHour = (defaultCost / defaultDuration) * 60`
- Calculate duration from time range: `reservationDuration = endTime - startTime` (in minutes)
- Calculate cost for reservation: `serviceStaffCost = (defaultCost / defaultDuration) * reservationDuration`
  - This is equivalent to: `serviceStaffCost = (costPerHour / 60) * reservationDuration`
  - Example: If `defaultCost = 1000` for `defaultDuration = 60` minutes:
    - Cost per hour = (1000 / 60) * 60 = 1000
    - For 60-minute reservation: (1000 / 60) * 60 = 1000
    - For 30-minute reservation: (1000 / 60) * 30 = 500
- Convert `Decimal` to `number` for RSVP: `Number(serviceStaffCost)`

**Technical Notes**:

- Service staff `defaultCost` is `Decimal` (Prisma type), representing cost for `defaultDuration` minutes
- Service staff `defaultDuration` is `Int` (typically 60 minutes)
- RSVP `serviceStaffCost` field is `number | null`
- Store `defaultCurrency` should be used (from `store.defaultCurrency`)
- Formula: `serviceStaffCost = (defaultCost / defaultDuration) * reservationDuration`

### 7. Bulk Creation

**Requirement**: Create multiple RSVPs efficiently

**Approach**:

- Parse entire text block to extract all reservations
- Group reservations by customer (each text block = one customer)
- For each customer block:
  1. Resolve customer (find or create)
  2. Resolve service staff (current user)
  3. Resolve facility (optional)
  4. For each reservation line:
     - Skip empty lines (`6-` with no date/time)
     - Parse date/time
     - Calculate cost
     - Create RSVP using `createRsvpAction` (or batch create)
     - If `alreadyPaid = true` and `customerId` exists and cost > 0:
       - Create StoreOrder (via `createRsvpStoreOrder()`)
       - Create StoreLedger entry (within same transaction)

**Technical Notes**:

- Can use `createRsvpAction` individually for each RSVP (simpler, but slower)
  - `createRsvpAction` creates StoreOrder if `customerId` exists and cost > 0
  - StoreLedger creation must be handled separately after RSVP creation if `alreadyPaid = true`
- Or create bulk action similar to `create-products-bulk.ts` pattern:
  - Parse all data first
  - Validate all entries
  - Create in transaction using `sqlClient.$transaction()`:
    - Create RSVP
    - Create StoreOrder (if needed)
    - Create StoreLedger (if order is paid)
- Use `createRsvpAction` if validation/notification logic is needed
- Use direct Prisma create if performance is critical and validation can be skipped
- **Important**: StoreOrder and StoreLedger creation must be atomic with RSVP creation
- StoreLedger requires:
  - `orderId`: Link to created StoreOrder
  - `balance`: Calculated from last ledger entry + amount
  - `amount`: Order total (positive for revenue)
  - `currency`: Store's default currency
  - `type`: StoreLedgerType (appropriate for payment method)
  - `description`: Include RSVP ID and reservation details

## Implementation Approach

### Option 1: API Route + Server Action (Recommended)

**Structure**:

```plaintext
/web/src/app/api/storeAdmin/[storeId]/rsvp/import/route.ts
```

**Flow**:

1. Accept POST request with text file or text content
2. Parse text format into structured data
3. Validate parsed data
4. For each customer block:
   - Resolve customer/service staff/facility
   - Create RSVPs (use `createRsvpAction` or batch)
5. Return results (success count, errors, etc.)

**Advantages**:

- Follows existing import pattern (customers, service-staff, facilities)
- Can handle file uploads (multipart/form-data)
- Can return detailed error information
- Uses existing access control (`CheckStoreAdminApiAccess`)

### Option 2: Bulk Server Action

**Structure**:

```plaintext
/web/src/actions/storeAdmin/rsvp/create-rsvps-bulk.ts
/web/src/actions/storeAdmin/rsvp/create-rsvps-bulk.validation.ts
```

**Flow**:

1. Accept structured JSON array (pre-parsed on client)
2. Validate all entries
3. Create RSVPs in transaction
4. Return created RSVPs

**Advantages**:

- Type-safe with Zod validation
- Can be reused from different entry points
- Better for programmatic use

**Disadvantages**:

- Requires client-side parsing
- Less suitable for file uploads

## Parsing Logic

### Text Block Parser

```typescript
interface ParsedRsvpBlock {
  customerName: string; // Combined name
  productName: string; // e.g., "網球課10H"
  totalReservations: number; // Extracted from product name (10)
  paidDate: string | null; // Parsed paid date
  reservations: Array<{
    number: number;
    date: string; // MM/DD format
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  }>;
}

function parseRsvpBlock(text: string, defaultYear: number): ParsedRsvpBlock {
  // 1. Split into lines
  // 2. Parse first line for customer name, product name, paid date
  // 3. Extract total reservations from product name (regex: /(\d+)H/)
  // 4. Parse reservation lines
  // 5. Handle year markers (lines that are just "YYYY")
  // 6. Return structured data
}
```

### Date/Time Parser

```typescript
function parseReservationDateTime(
  dateStr: string, // "12/19" or "1/2"
  startTimeStr: string, // "14:00"
  endTimeStr: string, // "15:00"
  year: number, // Current year
  storeTimezone: string, // "Asia/Taipei"
): {
  rsvpTime: bigint; // UTC epoch milliseconds
  arriveTime: bigint | null; // UTC epoch milliseconds (can be same as rsvpTime)
  duration: number; // Duration in minutes
} {
  // 1. Parse date: Split "MM/DD" or "M/DD"
  // 2. Parse times: Split "HH:MM"
  // 3. Create Date objects in store timezone
  // 4. Convert to UTC using convertDateToUtc()
  // 5. Convert to BigInt epoch using dateToEpoch()
  // 6. Calculate duration: (endTime - startTime) in minutes
}
```

## Key Challenges

### 1. Name Parsing

**Challenge**: Separating `{name1}` and `{name2}` from product name

**Solution**:

- Use regex to identify product name pattern: `/\s+([^\s]+\d+H)（/`
- Extract product name first
- Remaining text before product name is customer name
- Split customer name by spaces to get `{name1}` and `{name2}`

### 2. Year Handling

**Challenge**: Year changes mid-block (e.g., "2026" line)

**Solution**:

- Track current year (start with current year or from paid date)
- When encountering a line that's just "YYYY" (4 digits), update current year
- Use current year for all subsequent date parsing

### 3. Empty Reservation Slots

**Challenge**: Lines like `6-` indicate unused slots

**Solution**:

- Skip lines where date/time is missing
- Only create RSVPs for lines with valid date/time data
- Validate that total created reservations <= expected (from product name)

### 4. Customer Name Matching

**Challenge**: Finding existing customers by name (fuzzy matching)

**Solution**:

- Use exact match first: `sqlClient.customer.findFirst({ where: { name: customerName, storeId } })`
- Consider case-insensitive matching
- If multiple matches, use first one or prompt user
- For import, exact match is acceptable (create new if not found)

### 5. Facility Name Matching

**Challenge**: Extracting facility name from product name (e.g., "網球課" from "網球課10H")

**Solution**:

- Use regex to extract: `/^(.+?)(\d+H)/` (capture everything before quantity)
- Search for facility by name
- Create facility if not found (if facility is required)
- Or leave facilityId as null (if facility is optional)

### 6. Transaction Management

**Challenge**: Creating multiple RSVPs atomically

**Solution**:

- Use `sqlClient.$transaction()` to wrap all RSVP creations
- If any RSVP fails, rollback all
- Or use individual `createRsvpAction` calls (each has its own transaction)
- Trade-off: Individual calls = better error isolation, batch = better performance

## Validation Requirements

### 1. Data Format Validation

- First line must match pattern: `{name} {product} {paid date?}`
- Reservation lines must match pattern: `{number}- {date} {time}～{time}`
- Dates must be valid (e.g., no 13/32, no Feb 30)
- Times must be valid (e.g., no 25:00)
- End time must be after start time

### 2. Business Logic Validation

- Total reservations should match product name (e.g., "10H" = 10 reservations)
- Dates must be in the future (or allow past dates for historical data)
- Service staff must exist and be active
- Customer must exist (or be created)
- Facility must exist (if required by RSVP settings)
- No overlapping reservations (if singleServiceMode is enabled)

### 3. RSVP Availability Validation

- Use `validateRsvpAvailability()` from existing code
- Check facility availability (if facility is provided)
- Check service staff availability (if service staff is provided)
- Respect RSVP settings (canReserveBefore, canReserveAfter)

## Error Handling

### 1. Parsing Errors

- Log detailed error with line number
- Continue parsing remaining blocks
- Return list of parsing errors

### 2. Validation Errors

- Validate all entries before creating any
- Return list of validation errors
- Allow partial import (skip invalid entries) or fail all

### 3. Creation Errors

- Use transaction for atomicity
- Rollback all if any creation fails
- Return detailed error information

## Success Response Format

```typescript
interface ImportResult {
  success: boolean;
  totalBlocks: number; // Number of customer blocks processed
  totalReservations: number; // Total reservations in input
  createdReservations: number; // Successfully created
  skippedReservations: number; // Skipped (empty slots, etc.)
  errors: Array<{
    blockIndex: number;
    customerName: string;
    reservationNumber?: number;
    error: string;
  }>;
  warnings: Array<{
    blockIndex: number;
    customerName: string;
    message: string;
  }>;
}
```

## Example Flow

### Input

```text
許達夫 網球課10H（12/17 2025）
1-   12/19 14:00～15:00
2-   12/24 14:00～15:00
```

### Processing Steps

1. **Parse Block**:
   - Customer name: "許達夫"
   - Product name: "網球課10H"
   - Total reservations: 10
   - Paid date: "12/17 2025"
   - Reservations: 2 valid entries

2. **Resolve Customer**:
   - Search: `customer.findFirst({ where: { name: "許達夫", storeId } })`
   - If not found: `customer.create({ name: "許達夫", storeId })`

3. **Resolve Service Staff**:
   - Get current user from session
   - Find: `serviceStaff.findFirst({ where: { userId: session.user.id, storeId } })`
   - If not found: Create service staff record

4. **Resolve Facility**:
   - Extract: "網球課" from "網球課10H"
   - Search: `storeFacility.findFirst({ where: { facilityName: "網球課", storeId } })`
   - If not found: Create facility (if required) or use null

5. **Parse Dates/Times**:
   - Reservation 1: 12/19/2025 14:00～15:00
     - Start: 2025-12-19 14:00 (store timezone)
     - End: 2025-12-19 15:00 (store timezone)
     - Duration: 60 minutes
     - Convert to UTC epoch BigInt
   - Reservation 2: 12/24/2025 14:00～15:00
     - Similar process

6. **Calculate Costs**:
   - Get service staff defaultCost (e.g., 1000 TWD) and defaultDuration (e.g., 60 minutes)
   - Calculate cost per hour: (1000 / 60) * 60 = 1000 TWD/hour
   - Reservation 1 (60 minutes): (1000 / 60) * 60 = 1000 TWD
   - Reservation 2 (60 minutes): (1000 / 60) * 60 = 1000 TWD

7. **Create RSVPs**:
   - For each reservation:
     - Call `createRsvpAction` with:
       - customerId
       - serviceStaffId
       - facilityId (or null)
       - rsvpTime (BigInt epoch)
       - arriveTime (same as rsvpTime, or null)
       - numOfAdult: 1 (default)
       - numOfChild: 0 (default)
       - alreadyPaid: true (because paid date exists)
       - serviceStaffCost: calculated cost
       - status:
         - If `arriveTime` is present: `RsvpStatus.Completed`
         - If no `arriveTime`: `RsvpStatus.Ready` (recurring reservation)
       - arriveTime:
         - If time range is provided: Set to same as rsvpTime (start time)
         - If no time range or empty line: Set to `null`
     - Note: `createRsvpAction` will automatically create StoreOrder if `customerId` exists and cost > 0
     - Note: StoreLedger for payment should be created separately after RSVP creation if `alreadyPaid = true`:
       - Create StoreLedger entry with orderId from created StoreOrder
       - Calculate balance from last ledger entry
       - Set appropriate ledger type (revenue recognition)
       - Include RSVP ID in description
     - Note: If `arriveTime` is present (RSVP is completed) and `alreadyPaid = false`:
       - Process credit deduction via `completeRsvpCore()` or equivalent
       - This will automatically create StoreLedger entry for credit usage
       - StoreLedger type: StoreLedgerType.CreditUsage
       - Amount: Cash value of credit points used

## UI Specification

### Component Structure

The RSVP import UI should be implemented as a regular client component (not a dialog), similar to other client components in the store admin.

**Component Location**: `/web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp/components/client-import-rsvp.tsx`

### UI Components

#### 1. Textarea for Data Input

**Purpose**: Allow users to paste raw RSVP data in text format

**Specifications**:

- Component: `<Textarea>` from `@/components/ui/textarea`
- Placeholder: Example format text showing the expected input format
- Minimum height: `min-h-[200px]` (allow for multi-line input)
- Styling: Use standard form field styling
- Validation: Mark as required field with asterisk (*)
- Label: "RSVP Data" or similar translation key

**Example**:

```tsx
<FormField
  control={form.control}
  name="rsvpData"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        {t("rsvp_import_data")} <span className="text-destructive">*</span>
      </FormLabel>
      <FormControl>
        <Textarea
          placeholder={t("rsvp_import_data_placeholder")}
          disabled={loading || isParsing}
          className="min-h-[200px] font-mono text-sm"
          {...field}
        />
      </FormControl>
      <FormDescription className="text-xs font-mono text-gray-500">
        {t("rsvp_import_data_description")}
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 2. Parse/Preview Button

**Purpose**: Parse the pasted data and display preview in datatable

**Specifications**:

- Button variant: `outline`
- Position: Below textarea, before datatable
- Label: "Parse & Preview" or similar
- Behavior:
  - On click: Parse the textarea content
  - Show loading state while parsing
  - Display parsed results in datatable
  - Show validation errors if parsing fails
  - Enable import button only if parsing succeeds

**Example**:

```tsx
<Button
  type="button"
  variant="outline"
  onClick={handleParse}
  disabled={!form.watch("rsvpData") || loading || isParsing}
>
  {isParsing ? (
    <>
      <Loader className="mr-2 h-4 w-4" />
      {t("parsing") || "Parsing..."}
    </>
  ) : (
    t("parse_preview") || "Parse & Preview"
  )}
</Button>
```

#### 3. DataTable for Parsed RSVPs Preview

**Purpose**: Display parsed RSVP data in a structured table format before import

**Specifications**:

- Component: `<DataTable>` from `@/components/dataTable`
- Data: Array of parsed RSVP objects
- Columns: Display key information for each reservation:
  - Customer Name
  - Reservation Date/Time
  - Duration (calculated from time range)
  - Service Staff (current user name)
  - Cost (calculated from service staff defaultCost)
  - Payment Status (paid/unpaid)
  - Status/Validation (success/error indicators)
- Row selection: Optional (allow deselecting specific reservations)
- Sorting: Enable sorting by date/time
- Pagination: If many reservations (use DataTablePagination if needed)
- Styling: Standard table styling with responsive design

**Column Definitions**:

```typescript
interface ParsedRsvpPreview {
  customerName: string;
  rsvpTime: Date; // Parsed date/time
  duration: number; // Minutes
  serviceStaffName: string;
  cost: number;
  alreadyPaid: boolean;
  status: "valid" | "error";
  error?: string; // Error message if parsing/validation failed
  blockIndex: number; // Which customer block this belongs to
  reservationNumber: number; // Original line number
}

const columns: ColumnDef<ParsedRsvpPreview>[] = [
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("customer")} />
    ),
  },
  {
    accessorKey: "rsvpTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("rsvp_time")} />
    ),
    cell: ({ row }) => {
      const date = row.getValue("rsvpTime") as Date;
      return format(date, "yyyy-MM-dd HH:mm");
    },
  },
  {
    accessorKey: "duration",
    header: t("duration"),
    cell: ({ row }) => `${row.getValue("duration")} min`,
  },
  {
    accessorKey: "serviceStaffName",
    header: t("service_staff"),
  },
  {
    accessorKey: "cost",
    header: t("cost"),
    cell: ({ row }) => formatCurrency(row.getValue("cost"), storeCurrency),
  },
  {
    accessorKey: "alreadyPaid",
    header: t("payment_status"),
    cell: ({ row }) => {
      const paid = row.getValue("alreadyPaid") as boolean;
      return (
        <Badge variant={paid ? "success" : "default"}>
          {paid ? t("paid") : t("unpaid")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: t("status"),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return status === "valid" ? (
        <Badge variant="success">{t("valid")}</Badge>
      ) : (
        <Badge variant="destructive">{t("error")}</Badge>
      );
    },
  },
];
```

**DataTable Usage**:

```tsx
{parsedRsvps.length > 0 && (
  <div className="mt-4">
    <div className="mb-2 text-sm font-medium">
      {t("parsed_reservations")} ({parsedRsvps.length})
    </div>
    <DataTable<ParsedRsvpPreview>
      columns={columns}
      data={parsedRsvps}
      searchKey="customerName"
    />
  </div>
)}
```

#### 4. Import Button

**Purpose**: Start the import process after parsing and preview

**Specifications**:

- Button variant: `default` (primary action)
- Position: In bottom
- Label: "Import RSVPs" or similar
- State management:
  - Disabled if no parsed data or parsing failed
  - Show loading state during import
  - Disable during import process
- Behavior:
  - On click: Call import API endpoint
  - Show success/error toast notifications
  - Reset form/state after successful import
  - Call `onImported` callback to refresh RSVP list

**Example**:

```tsx
<div className="mt-4 flex justify-end">
  <Button
    type="button"
    onClick={handleImport}
    disabled={parsedRsvps.length === 0 || importing || hasErrors}
  >
    {importing ? (
      <>
        <Loader className="mr-2 h-4 w-4" />
        {t("importing") || "Importing..."}
      </>
    ) : (
      <>
        <IconUpload className="mr-2 h-4 w-4" />
        {t("import_rsvps") || "Import RSVPs"} ({parsedRsvps.length})
      </>
    )}
  </Button>
</div>
```

### Component Layout

**Client Component**:

- Regular client component (no dialog wrapper)
- Can be integrated into the RSVP admin page directly
- Use standard page layout and spacing
- Container: Use `<Container>` or standard page container
- Responsive: Full width on mobile, constrained on larger screens

**Component Sections**:

1. **Header**: Section title and description (optional, if separate page)
2. **Content**:
   - Textarea for data input
   - Parse/Preview button
   - DataTable for parsed preview (conditional, shown after parsing)
   - Error summary (if parsing/validation errors)
3. **Actions**: Import button (Cancel not needed without dialog)

### State Management

**Required State**:

- `loading`: Loading state for import operation
- `isParsing`: Loading state for parse operation
- `parsedRsvps`: Array of parsed RSVP preview objects
- `hasErrors`: Boolean indicating if there are parsing/validation errors
- Form state: For textarea value (using react-hook-form)

### User Flow

1. **Navigate to Import Page/Section**: User navigates to RSVP import page or section
2. **Paste Data**: User pastes RSVP data into textarea
3. **Parse Data**: User clicks "Parse & Preview" button
   - Parse textarea content
   - Display results in datatable
   - Show validation errors if any
4. **Review Preview**: User reviews parsed reservations in datatable
5. **Import**: User clicks "Import RSVPs" button
   - Send parsed data to import API
   - Show loading state
   - Display success/error notification
   - Reset form/state after successful import
   - Refresh RSVP list (via callback or router refresh)

### Error Handling UI

**Parsing Errors**:

- Display error messages below textarea (using FormMessage)
- Show error summary box if multiple parsing errors
- Disable import button if parsing fails

**Validation Errors**:

- Mark invalid rows in datatable (e.g., red border, error icon)
- Show error column in datatable with error messages
- Show error summary above datatable
- Disable import button if validation errors exist

**Import Errors**:

- Show error toast with detailed error message
- Keep component state intact to allow user to fix data and retry
- Display per-row errors if partial import fails
- Allow user to modify textarea and re-parse if needed

### Accessibility

- Use proper form labels and ARIA attributes
- Ensure keyboard navigation works (Tab order: textarea → parse button → table → import button)
- Screen reader support for table data
- Loading states announced to screen readers

### Responsive Design

- Mobile: Full-width component, stacked layout
- Tablet: Wider component, horizontal layout
- Desktop: Maximum width constraint, optimal column sizing
- Textarea: Scrollable on smaller screens
- DataTable: Horizontal scroll on mobile if needed

## Next Steps

1. **Create Parser Module**: Implement text parsing logic
2. **Create API Route**: `/api/storeAdmin/[storeId]/rsvp/import/route.ts`
3. **Create UI Component**: Import client component (`client-import-rsvp.tsx`)
4. **Add Parse Endpoint**: Optional endpoint for parsing without importing (for preview)
5. **Integration**: Add import component to RSVP admin page (e.g., as a tab or section)
6. **Testing**: Test with various input formats
7. **Error Handling**: Implement comprehensive error reporting
8. **Documentation**: Add user-facing documentation

## Related Files

- `/web/src/actions/storeAdmin/rsvp/create-rsvp.ts` - Single RSVP creation
- `/web/src/app/api/storeAdmin/[storeId]/customers/import/route.ts` - Customer import pattern
- `/web/src/app/api/storeAdmin/[storeId]/service-staff/import/route.ts` - Service staff import pattern
- `/web/src/actions/storeAdmin/product/create-products-bulk.ts` - Bulk creation pattern
- `/web/src/utils/datetime-utils.ts` - Date/time conversion utilities
