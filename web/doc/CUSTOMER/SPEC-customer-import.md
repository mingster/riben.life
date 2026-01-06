# Customer Import Specification

**Date:** 2025-01-27  
**Status:** Active  
**Related:** [Customer Management](../storeAdmin/customers)

## Overview

This document specifies the customer import functionality in the store admin panel. The feature allows store administrators to bulk import customers from CSV files, automatically creating user accounts, managing organization memberships, and optionally setting initial credit balances.

## User Interface

### Location

- **Path:** `/storeAdmin/[storeId]/customers`
- **Component:** `ImportCustomerDialog` in `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/import-customer-dialog.tsx`

### UI Components

1. **Import Button**
   - Trigger: Opens import dialog
   - Icon: `IconUpload`
   - Label: "Import" (i18n key: `import`)

2. **Import Dialog**
   - **Title:** "Import Customers" (i18n key: `import`)
   - **Description:** Provides CSV format instructions
   - **File Input:**
     - Accepts: `.csv` files
     - MIME type: `text/csv`
     - Shows selected file name
   - **Actions:**
     - Cancel button
     - Import button (disabled when no file selected or importing)
     - Loading state with spinner during import

### User Flow

1. User clicks "Import" button
2. Dialog opens with file selection
3. User selects CSV file
4. User clicks "Import" button
5. File is read and sent to API as base64-encoded JSON
6. Success/error toast notification displayed
7. Dialog closes and customer list refreshes

## API Endpoint

### Route

```
POST /api/storeAdmin/[storeId]/customers/import
```

### Authentication

- Requires store admin access (checked via `CheckStoreAdminApiAccess`)
- User must be authenticated
- User must be a member of the store's organization with role: `owner`, `storeAdmin`, `staff`, or `sysAdmin`

### Request Format

The API accepts two Content-Type formats:

#### Option 1: Multipart Form Data

```
Content-Type: multipart/form-data

Form field: "file" (File object)
```

#### Option 2: JSON with Base64 (Current Implementation)

```
Content-Type: application/json

{
  "fileData": "base64-encoded-file-content",
  "fileName": "customers.csv"
}
```

**Note:** The current frontend implementation uses Option 2 (JSON with base64) as a workaround for Content-Type issues.

### Response Format

#### Success Response

```json
{
  "success": true,
  "imported": 10,
  "errors": ["Row 5: Name already exists", "Row 8: Phone number conflict"]
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Row 2: Validation error", "Row 3: Database error"]
}
```

## CSV Format

### Required Columns

- **name** (required): Customer name

### Optional Columns

- **email** (optional): Customer email address
  - If not provided, email is auto-generated
  - Format: `{sanitizedName}-{timestamp}-{random}@import.riben.life`
  - If phoneNumber provided: `{phoneNumber}@phone.riben.life`

- **phoneNumber** (optional): Customer phone number
  - Must be unique if provided
  - Format: E.164 format (e.g., `+886912345678`)

- **creditPoint** (optional): Initial credit points
  - Default: `0`
  - Creates ledger entry if value > 0
  - Must be a valid number >= 0

- **creditFiat** (optional): Initial fiat balance
  - Default: `0`
  - Creates ledger entry if value > 0
  - Must be a valid number >= 0

### CSV Example

```csv
name,email,phoneNumber,creditPoint,creditFiat
John Doe,john@example.com,+886912345678,100,500
Jane Smith,,+886987654321,50,0
Bob Wilson,bob@example.com,,0,1000
```

### CSV Parsing

- Handles quoted fields (e.g., `"John, Doe"`)
- Handles escaped quotes (e.g., `"John ""Doe"" Smith"`)
- Trims whitespace from all fields
- Filters out empty lines
- Case-insensitive column matching

## Business Logic

### User Matching Strategy

The import process uses a three-tier matching strategy to identify existing users:

1. **Email Match** (Primary)
   - If email is provided or generated, search for user by email
   - Email is normalized to lowercase

2. **Phone Number Match** (Secondary)
   - If phoneNumber is provided, search for user by phoneNumber
   - If phoneNumber belongs to a different user than email match, error is raised

3. **Name Match** (Conflict Check)
   - If name already exists for a different user, row is skipped
   - This prevents duplicate names in the system

### User Creation

When a new user is created:

- **Email:** Auto-generated if not provided (see CSV Format section)
- **Name:** From CSV `name` column (required)
- **Phone Number:** From CSV `phoneNumber` column (optional)
- **Role:** Always set to `"user"`
- **Locale:** Always set to `"tw"`
- **Password:** Not set (user must reset password via "Forgot Password")

### User Update

When an existing user is found:

- **Name:** Updated if provided in CSV
- **Phone Number:** Updated if provided in CSV
- **Email:** Not changed (preserves existing email)

### Member Relationship

All imported customers are added to the store's organization with role `"customer"`:

- If member relationship exists: Role is updated to `"customer"`
- If member relationship doesn't exist: New member record is created

### Credit Handling

Credits are processed in a database transaction:

#### Credit Points

- If `creditPoint > 0`:
  - Creates or updates `CustomerCredit` record
  - Increments existing balance if record exists
  - Creates `CustomerCreditLedger` entry with type `Topup`
  - Ledger note: `"storeAdmin Import: {creditPoint} points"`

#### Credit Fiat

- If `creditFiat > 0`:
  - Creates or updates `CustomerCredit` record
  - Increments existing balance if record exists
  - Creates `CustomerFiatLedger` entry with type `"TOPUP"`
  - Ledger note: `"storeAdmin import: {creditFiat} fiat"`

### Validation Rules

1. **Name:** Required, cannot be empty
2. **Email:** Optional, auto-generated if not provided
3. **Phone Number:** Optional, must be unique if provided
4. **Credit Point:** Must be >= 0, defaults to 0
5. **Credit Fiat:** Must be >= 0, defaults to 0
6. **Name Uniqueness:** If name already exists for another user, row is skipped
7. **Phone Uniqueness:** If phoneNumber already exists for another user, error is raised

### Error Handling

#### Row-Level Errors

Each row is processed independently. Errors for one row do not stop processing of other rows:

- **Validation Errors:** Row is skipped, error added to errors array
- **Database Errors:** Row is skipped, error added to errors array
- **Conflict Errors:** Row is skipped, error added to errors array

#### Error Messages

Error messages include row number for easy identification:

- `Row {rowNum}: {error message}`

Examples:

- `Row 5: Name is required`
- `Row 8: Phone number +886912345678 already belongs to a different user (existing@email.com)`
- `Row 12: Name "John Doe" already exists for user user@example.com. Skipping import.`

#### Response Handling

- If all rows fail: Returns `success: false` with HTTP 400
- If some rows succeed: Returns `success: true` with `imported` count and `errors` array
- If all rows succeed: Returns `success: true` with `imported` count and no `errors`

## Data Flow

### Import Process

```
1. User selects CSV file
   ↓
2. Frontend reads file as base64
   ↓
3. Frontend sends POST request with JSON body
   ↓
4. Backend parses CSV content
   ↓
5. For each row:
   a. Validate required fields
   b. Match existing user (email → phone → name check)
   c. Create or update user
   d. Create or update member relationship
   e. Process credits (if provided)
   ↓
6. Return success/error response
   ↓
7. Frontend displays toast notification
   ↓
8. Customer list refreshes
```

### Database Operations

#### User Table

- **Create:** New user with auto-generated email
- **Update:** Existing user name and phoneNumber

#### Member Table

- **Create:** New member relationship with role `"customer"`
- **Update:** Existing member role to `"customer"`

#### CustomerCredit Table

- **Upsert:** Create or update credit balance
- **Increment:** Add credit points or fiat to existing balance

#### CustomerCreditLedger Table

- **Create:** Ledger entry for credit point top-up
- **Type:** `Topup`
- **Creator:** Current store admin user

#### CustomerFiatLedger Table

- **Create:** Ledger entry for fiat top-up
- **Type:** `"TOPUP"`
- **Creator:** Current store admin user

## Security Considerations

### Access Control

- Only store administrators can import customers
- Access is verified via `CheckStoreAdminApiAccess`
- User must be authenticated and have appropriate role

### Data Validation

- All input is validated before database operations
- Phone numbers are checked for uniqueness
- Names are checked for conflicts
- Credit values are validated (>= 0)

### Email Generation

- Auto-generated emails use cryptographically secure random values
- Format prevents collisions: `{sanitizedName}-{timestamp}-{random}@import.riben.life`
- If collision occurs, new email is generated

### Password Security

- Imported users do not have passwords set
- Users must use "Forgot Password" to set initial password
- Prevents unauthorized access to imported accounts

## Logging

### Log Levels

- **Info:** Import request received, CSV parsed, row processing started
- **Debug:** User lookup results, member relationship checks, credit processing
- **Warn:** Validation errors, conflicts, skipped rows
- **Error:** Database errors, unexpected exceptions

### Log Metadata

All logs include:

- `storeId`: Store identifier
- `rowNum`: Row number (for row-specific logs)
- `userId`: User identifier (when available)
- `organizationId`: Organization identifier
- `creatorId`: Current store admin user ID

### Log Tags

- `["customer", "import"]`: General import logs
- `["customer", "import", "debug"]`: Detailed processing logs
- `["customer", "import", "error"]`: Error logs

## Error Scenarios

### File Upload Errors

- **No file selected:** Frontend validation prevents submission
- **Invalid file type:** Backend rejects non-CSV files
- **Empty file:** Returns error "No data found in CSV file"
- **Parse error:** Returns error with details

### Validation Errors

- **Missing name:** Row skipped, error logged
- **Invalid credit value:** Value set to 0, processing continues
- **Negative credit value:** Value set to 0, processing continues

### Conflict Errors

- **Name already exists:** Row skipped, error logged
- **Phone number conflict:** Row skipped, error logged
- **Email collision (generated):** New email generated, processing continues

### Database Errors

- **Transaction failure:** Row skipped, error logged
- **Constraint violation:** Row skipped, error logged
- **Connection error:** Entire import fails, HTTP 500 returned

## Performance Considerations

### Batch Processing

- Rows are processed sequentially (one at a time)
- Each row is processed in a transaction for credit operations
- Errors in one row do not affect other rows

### Database Queries

- User lookup: Up to 3 queries per row (email, phone, name)
- Member relationship: 1 query to check, 1 query to create/update
- Credit operations: Transaction with multiple queries

### Scalability

- Suitable for imports of hundreds to low thousands of rows
- For very large imports (>10,000 rows), consider:
  - Batch processing in chunks
  - Background job processing
  - Progress indicators

## Testing Scenarios

### Happy Path

1. Import CSV with valid data
2. All rows processed successfully
3. Users created/updated correctly
4. Credits applied correctly
5. Member relationships created correctly

### Edge Cases

1. **Empty CSV:** Should return error
2. **CSV with only header:** Should return error
3. **Missing name column:** Should return error
4. **Duplicate names:** Should skip rows with conflicts
5. **Duplicate phone numbers:** Should skip rows with conflicts
6. **Invalid credit values:** Should default to 0
7. **Mixed new and existing users:** Should handle both correctly
8. **Users with existing credits:** Should increment existing balances

### Error Cases

1. **Unauthorized access:** Should return 403
2. **Store not found:** Should return 404
3. **Invalid CSV format:** Should return 400
4. **Database connection error:** Should return 500
5. **Transaction rollback:** Should handle gracefully

## Future Enhancements

### Potential Improvements

1. **Progress Indicator:** Show import progress for large files
2. **Preview Mode:** Show what will be imported before confirming
3. **Template Download:** Provide CSV template with example data
4. **Batch Size Limits:** Enforce maximum rows per import
5. **Background Processing:** Process large imports asynchronously
6. **Import History:** Track import operations and results
7. **Rollback Capability:** Ability to undo an import
8. **Field Mapping:** Allow custom CSV column names
9. **Validation Preview:** Show validation errors before import
10. **Duplicate Handling Options:** Choose behavior for duplicates (skip, update, create new)

## Related Documentation

- [Customer Management](../storeAdmin/customers)
- [Credit System Design](./CUSTOMER-CREDIT-DESIGN.md)
- [Store Admin Access Control](../storeAdmin/access-control)

## Code References

### Frontend

- **Component:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/import-customer-dialog.tsx`
- **Client Component:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/client-customer.tsx`

### Backend

- **API Route:** `web/src/app/api/storeAdmin/[storeId]/customers/import/route.ts`
- **Access Control:** `web/src/app/api/api_helper.ts` (CheckStoreAdminApiAccess)

### Database Models

- **User:** `prisma/schema.prisma` (User model)
- **Member:** `prisma/schema.prisma` (Member model)
- **CustomerCredit:** `prisma/schema.prisma` (CustomerCredit model)
- **CustomerCreditLedger:** `prisma/schema.prisma` (CustomerCreditLedger model)
- **CustomerFiatLedger:** `prisma/schema.prisma` (CustomerFiatLedger model)

## Summary

The customer import feature provides a robust, secure way for store administrators to bulk import customers from CSV files. It handles user creation, organization membership, and credit initialization with comprehensive error handling and logging. The system is designed to be fault-tolerant, processing rows independently and providing detailed feedback on successes and failures.
