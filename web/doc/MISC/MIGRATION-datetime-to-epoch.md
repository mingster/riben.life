# Migration: DateTime to BigInt Epoch Time

**Date:** 2025-01-XX  
**Status:** Active  
**Related:** [Prisma Schema](../prisma/schema.prisma), [Server Actions Guide](../.cursor/rules/server-action.mdc)

## Overview

This document describes the migration from `DateTime` fields to `BigInt` epoch time (milliseconds since 1970-01-01 UTC) in the database schema and application code.

## Rationale

- **Consistency**: All datetime values stored as epoch time (milliseconds)
- **Type Safety**: BigInt provides better type safety than DateTime in TypeScript
- **Performance**: Epoch time is more efficient for calculations and comparisons
- **Timezone Independence**: Epoch time is always UTC, eliminating timezone confusion

## Schema Changes

### Before

```prisma
model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### After

```prisma
model User {
  id        String   @id @default(cuid())
  createdAt BigInt   // Epoch milliseconds
  updatedAt BigInt   // Epoch milliseconds
}
```

**Key Changes:**

- All `DateTime` fields changed to `BigInt`
- Removed `@default(now())` directives (not supported with BigInt)
- Removed `@updatedAt` directives (not supported with BigInt)
- Timestamps must be set manually in application code

## Helper Functions

### Date/Time Conversion Utilities

Located in `@/utils/datetime-utils.ts`:

- **`getUtcNowEpoch()`**: Get current UTC time as BigInt (epoch milliseconds)
- **`dateToEpoch(date)`**: Convert Date → BigInt (epoch milliseconds)
- **`epochToDate(epoch)`**: Convert BigInt → Date (returns Date | null)
- **`epochToDateOrNow(epoch)`**: Convert BigInt → Date with fallback to current time

### JSON Serialization Utilities

Located in `@/utils/utils.ts`:

- **`transformBigIntToNumbers(obj)`**: Recursively convert BigInt to numbers for JSON
- **`transformPrismaDataForJson(obj)`**: Convert both Decimal and BigInt for API responses

## Code Migration Patterns

### Server Actions (Create/Update)

**Before:**

```ts
import { getUtcNow } from "@/utils/datetime-utils";

await sqlClient.model.create({
  data: {
    name: "Example",
    createdAt: getUtcNow(), // Date object
    updatedAt: getUtcNow(), // Date object
  },
});
```

**After:**

```ts
import { getUtcNowEpoch } from "@/utils/datetime-utils";

await sqlClient.model.create({
  data: {
    name: "Example",
    createdAt: getUtcNowEpoch(), // BigInt
    updatedAt: getUtcNowEpoch(), // BigInt
  },
});
```

### Reading from Database

**Before:**

```ts
const record = await sqlClient.model.findUnique({
  where: { id: recordId },
});

// record.createdAt is already a Date object
const displayDate = format(record.createdAt, "yyyy-MM-dd");
```

**After:**

```ts
import { epochToDate } from "@/utils/datetime-utils";
import { format } from "date-fns";

const record = await sqlClient.model.findUnique({
  where: { id: recordId },
});

// Convert BigInt epoch to Date
const createdAtDate = epochToDate(record.createdAt); // Date | null
const displayDate = createdAtDate ? format(createdAtDate, "yyyy-MM-dd") : "N/A";
```

### User Input Dates (Forms)

**Before:**

```ts
const utcDate = new Date(formData.dateTime);
await sqlClient.model.create({
  data: {
    eventTime: utcDate, // Date object
  },
});
```

**After:**

```ts
import { dateToEpoch, convertStoreTimezoneToUtc } from "@/utils/datetime-utils";

// Convert user input (datetime-local string) to UTC Date, then to BigInt
const utcDate = convertStoreTimezoneToUtc(
  formData.dateTime, // "YYYY-MM-DDTHH:mm"
  storeTimezone // e.g., "Asia/Taipei"
);

await sqlClient.model.create({
  data: {
    eventTime: dateToEpoch(utcDate), // BigInt epoch milliseconds
  },
});
```

### JSON Serialization (API Routes)

**CRITICAL: Always use `transformPrismaDataForJson()` before `JSON.stringify()`**

**Before:**

```ts
export async function GET() {
  const data = await sqlClient.model.findMany({});
  return NextResponse.json(data); // Works with DateTime
}
```

**After:**

```ts
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET() {
  const data = await sqlClient.model.findMany({});
  
  // Transform BigInt and Decimal to numbers
  transformPrismaDataForJson(data);
  
  return NextResponse.json(data); // ✅ Safe to serialize
}
```

**Why this is required:**

- `JSON.stringify()` throws error with BigInt values
- `JSON.stringify()` doesn't handle Decimal objects properly
- `transformPrismaDataForJson()` converts both to numbers

### Server Components (Page Props)

**Before:**

```tsx
export default async function Page() {
  const data = await sqlClient.model.findMany({});
  return <ClientComponent data={data} />;
}
```

**After:**

```tsx
import { transformPrismaDataForJson } from "@/utils/utils";

export default async function Page() {
  const data = await sqlClient.model.findMany({});
  
  // Transform for JSON serialization (Next.js serializes props as JSON)
  transformPrismaDataForJson(data);
  
  return <ClientComponent data={data} />;
}
```

## Migration Checklist

### Database

- [x] Update Prisma schema: Change all `DateTime` to `BigInt`
  - [x] Member.createdAt migrated to BigInt (2025-01-XX)
  - [x] All other models already use BigInt
- [x] Remove `@default(now())` directives
- [x] Remove `@updatedAt` directives
- [ ] Create and run Prisma migration for Member.createdAt
- [ ] Migrate existing Member.createdAt data (convert DateTime to BigInt epoch)

### Application Code

- [x] Add helper functions to `datetime-utils.ts`
- [x] Add JSON serialization utilities to `utils.ts`
- [x] Update all server actions to use `getUtcNowEpoch()` and `dateToEpoch()`
  - [x] Member creation in customer import route (2025-01-XX)
  - [x] Member creation in store creation action (2025-01-XX)
  - [x] Member creation in customer update action (2025-01-XX)
- [x] Update all queries to use `epochToDate()` when reading
- [x] Update all API routes to use `transformPrismaDataForJson()`
- [x] Update all server components to use `transformPrismaDataForJson()`
- [x] Update all form components to convert Date ↔ BigInt
- [x] Update all display components to convert BigInt → Date

### Documentation

- [x] Update server-action.mdc rule
- [x] Update web-prisma.mdc rule
- [x] Update data-fetching.mdc rule
- [x] Update CRUD-Guide.mdc rule
- [x] Create migration document (this file)

## TypeScript Considerations

### BigInt Support

TypeScript fully supports BigInt:

- Native `bigint` type (since TypeScript 3.2)
- Prisma returns `bigint` for BigInt fields
- Use `Number(bigintValue)` to convert to number when needed
- Use `BigInt(numberValue)` to convert to BigInt

### JSON Serialization

**Problem:** `JSON.stringify()` doesn't support BigInt natively

**Solution:** Always use `transformPrismaDataForJson()` before serialization

```ts
// ❌ This will throw an error
const data = { timestamp: 1234567890123n };
JSON.stringify(data); // TypeError: Do not know how to serialize a BigInt

// ✅ This works
import { transformPrismaDataForJson } from "@/utils/utils";
const data = { timestamp: 1234567890123n };
transformPrismaDataForJson(data);
JSON.stringify(data); // ✅ Works: {"timestamp":1234567890123}
```

## Best Practices

1. **Always convert Date → BigInt before saving**
   - Use `dateToEpoch()` or `getUtcNowEpoch()`

2. **Always convert BigInt → Date when reading**
   - Use `epochToDate()` or `epochToDateOrNow()`

3. **Always transform before JSON serialization**
   - Use `transformPrismaDataForJson()` before `JSON.stringify()`

4. **Handle null/undefined BigInt values**
   - Use `epochToDate()` which returns `Date | null`
   - Check for null before using the Date object

5. **Use timezone-aware conversion for user input**
   - Use `convertStoreTimezoneToUtc()` for datetime-local inputs
   - Then convert to BigInt with `dateToEpoch()`

## Related Files

- **Schema**: `prisma/schema.prisma`
- **Date Utilities**: `src/utils/datetime-utils.ts`
- **JSON Utilities**: `src/utils/utils.ts`
- **Server Action Rules**: `.cursor/rules/server-action.mdc`
- **Prisma Rules**: `.cursor/rules/web-prisma.mdc`
- **Data Fetching Rules**: `.cursor/rules/data-fetching.mdc`
- **CRUD Guide**: `.cursor/rules/CRUD-Guide.mdc`

## Summary

This migration standardizes all datetime storage to BigInt epoch time (milliseconds), providing:

- ✅ Consistent storage format
- ✅ Better type safety
- ✅ Improved performance
- ✅ Timezone independence

**Remember:** Always use `transformPrismaDataForJson()` before `JSON.stringify()` on Prisma query results!
