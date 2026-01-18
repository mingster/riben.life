# RSVP Implementation Review: Unfinished Logic

**Date:** 2025-01-XX  
**Status:** Active  
**Related:** [TODO.md](../TODO.md)

## Overview

This document identifies unfinished logic and incomplete features in the RSVP (Reservation) system implementation.

## 1. Service Staff Products (High Priority)

**Status:** Not Implemented  
**Location:** Related to TODO item in `doc/TODO.md`

### Description

The system needs a way to create products for service staff (e.g., "網球課10H" - tennis lessons 10 hours) that customers can purchase. Currently, the import system can parse product names like "網球課10H" from text, but there's no product management system for service staff.

### Current State

- **Import Parser** (`utils/rsvp-import-parser.ts`): Can parse product names like "網球課10H" and extract total hours (e.g., "10H" → 10 hours)
- **Import UI** (`client-import-rsvp.tsx`): Displays `productName` in preview but doesn't create actual products
- **Schema**: No `Product` model for service staff products
- **Order System**: Service staff costs are handled per-RSVP, not as purchasable products

### Missing Components

1. **Product Model**: Need a `ServiceStaffProduct` model or extend `Product` model to support:
   - Association with service staff member
   - Quantity of service hours/minutes (e.g., 10 hours)
   - Pricing information
   - Product name (e.g., "網球課10H")

2. **Product Management UI**: Store admin interface to:
   - Create service staff products
   - Edit product details
   - Set pricing and duration
   - Associate with service staff members

3. **Purchase Flow**: Customer-facing interface to:
   - Browse service staff products
   - Purchase products (e.g., buy 10 hours of tennis lessons)
   - Track remaining service hours after purchase

4. **Service Hour Tracking**: System to:
   - Track remaining service hours after purchase
   - Deduct hours when RSVPs are completed
   - Display remaining hours to customers

### Related Files

- `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp/components/client-import-rsvp.tsx` (lines 87-102)
- `web/src/utils/rsvp-import-parser.ts` (product name parsing)
- `web/src/actions/store/reservation/create-rsvp-store-order.ts` (service staff product name handling)

---

## 2. Service Staff Business Hours Validation (Medium Priority)

**Status:** ✅ Completed  
**Location:** Drag-and-drop operations in calendar views and slot picker

### Description

Service staff have a `businessHours` field in the schema, and business hours validation is now fully implemented in drag-and-drop operations and slot selection for RSVPs.

### Current State

- **Schema**: `ServiceStaff.businessHours` field exists (String, nullable)
- **Facility Business Hours**: Fully validated in drag-and-drop operations
- **Service Staff Business Hours**: ✅ Now validated on both client-side and server-side

### Implementation

1. **Database Queries Updated**: Both store admin and customer-side pages now include `ServiceStaff.businessHours` in RSVP queries
2. **Client-Side Validation**: Added business hours validation in:
   - `week-view-calendar.tsx` (store admin): Validates when dragging RSVPs to new time slots
   - `customer-week-view-calendar.tsx`: Validates when customers drag their RSVPs
   - `slot-picker.tsx`: Validates when selecting new time slots
3. **Error Messages**: Displays appropriate error messages using `rsvp_time_outside_business_hours_service_staff` translation key
4. **Validation Pattern**: Uses existing `checkTimeAgainstBusinessHours` utility function (same as facility validation)

### Related Files

- `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp/page.tsx` (updated query)
- `web/src/app/s/[storeId]/reservation/page.tsx` (updated query)
- `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp/components/week-view-calendar.tsx`
- `web/src/app/s/[storeId]/reservation/components/customer-week-view-calendar.tsx`
- `web/src/app/s/[storeId]/reservation/components/slot-picker.tsx`

---

## 3. Service Staff Cost in Admin-Created RSVPs (Medium Priority)

**Status:** ✅ Completed  
**Location:** `create-rsvp.ts`

### Description

When store admins create RSVPs, service staff cost is explicitly set to `null`, even when a service staff member is selected. This means admin-created RSVPs with service staff don't include service staff costs in orders.

### Current State

**In `create-rsvp.ts` (lines 260-267, 299-303, 385-401):**

- Service staff cost is now calculated from `serviceStaff.defaultCost` when service staff is provided
- Service staff cost is saved to the RSVP record (`serviceStaffCost` field)
- Service staff cost is included in the total cost calculation
- Service staff cost is passed to `createRsvpStoreOrder` instead of `null`

### Implementation

1. **Calculate Service Staff Cost** (lines 260-263): When `serviceStaffId` is provided, cost is calculated from `ServiceStaff.defaultCost`
2. **Include in Total Cost** (lines 265-267): Total cost now includes both facility and service staff costs
3. **Save to RSVP** (lines 299-303): Service staff cost is saved to the RSVP record in the database
4. **Include in Order** (lines 385-401): Service staff cost is calculated and passed to `createRsvpStoreOrder` separately from facility cost
5. **Order Note** (lines 375-383): Order note includes service staff name when service staff is provided

### Changes Made

- Added `calculatedServiceStaffCost` calculation from `serviceStaff.defaultCost`
- Updated `totalCost` calculation to include both facility and service staff costs
- Added `serviceStaffCost` field to RSVP creation
- Updated order creation to pass `serviceStaffCost` separately (matching customer-created RSVP pattern)
- Improved order note to conditionally include facility and service staff information

### Related Files

- `web/src/actions/storeAdmin/rsvp/create-rsvp.ts` (lines 112-153, 365-366)
- `web/src/actions/store/reservation/create-rsvp-store-order.ts` (serviceStaffCost parameter)

---

## 4. Notification for Unpaid Orders (Low Priority)

**Status:** ✅ Completed  
**Location:** `create-rsvp.ts`

### Description

When an unpaid store order is created for an admin-created RSVP, there's a TODO to notify the customer, but this is not implemented.

### Current State

**In `create-rsvp.ts` (lines 423-485):**

- Notification is now sent after unpaid order is created
- Uses new event type `"unpaid_order_created"` in notification router
- Includes order details, RSVP time, facility/service staff info, and payment link

**In `rsvp-notification-router.ts` (lines 31, 131-133, 789-844):**

- Added new event type `"unpaid_order_created"` to `RsvpEventType`
- Added handler method `handleUnpaidOrderCreated` to send notification to customer
- Added message builder `buildUnpaidOrderCreatedMessage` for notification content

### Implementation

1. **Notification Integration** (lines 423-485): Uses existing notification router to send notification after order creation
2. **Notification Type** (line 31): Added new event type `"unpaid_order_created"` to notification router
3. **Notification Content** (lines 823-844): Includes order details, RSVP time, facility/service staff information, party size, and payment link

### Changes Made

- Added `"unpaid_order_created"` event type to `RsvpEventType` union
- Added `handleUnpaidOrderCreated` method to notification router
- Added `buildUnpaidOrderCreatedMessage` method for notification message content
- Updated `create-rsvp.ts` to send notification after unpaid order is created (only if `finalOrderId` is set and `customerId` exists)
- Payment URL links to `/checkout/{orderId}` for easy payment completion
- Notification sent via both onsite and email channels with high priority (priority: 1)

### Related Files

- `web/src/actions/storeAdmin/rsvp/create-rsvp.ts` (lines 423-485)
- `web/src/lib/notification/rsvp-notification-router.ts` (lines 31, 131-133, 789-844)

---

## 5. Refund Function Transaction Atomicity (Low Priority)

**Status:** ✅ Completed  
**Location:** `cancel-rsvp.ts`, `process-rsvp-refund-fiat.ts`, `process-rsvp-refund-credit-point.ts`

### Description

Refund functions now accept an optional transaction client parameter, allowing refunds and status updates to be truly atomic within a single transaction.

### Current State

- **Refund Functions Refactored**: Both `processRsvpFiatRefund` and `processRsvpCreditPointsRefund` now accept optional `tx` parameter
- **Transaction Atomicity**: When `tx` is provided, refund functions use the provided transaction client instead of creating a new transaction
- **Backward Compatible**: If `tx` is not provided, functions create their own transaction (legacy behavior maintained)

### Implementation

1. **Refactored `processRsvpFiatRefund`**: Now accepts optional `tx?: TransactionClient` parameter
2. **Refactored `processRsvpCreditPointsRefund`**: Now accepts optional transaction client parameter
3. **Updated `cancelRsvpAction`**: Passes transaction client to refund functions for atomicity
4. **Updated `cancelReservationAction`**: Passes transaction client to refund functions for atomicity

### Changes Made

- Added `TransactionClient` type to refund functions
- Refactored refund logic to use provided transaction client when available
- Updated all call sites to pass transaction client from parent transaction
- Updated TODO comments to reflect completion

### Related Files

- `web/src/actions/storeAdmin/rsvp/cancel-rsvp.ts` (uses transaction client)
- `web/src/actions/store/reservation/process-rsvp-refund-fiat.ts` (refactored)
- `web/src/actions/store/reservation/process-rsvp-refund-credit-point.ts` (refactored)
- `web/src/actions/store/reservation/cancel-reservation.ts` (uses transaction client)

---

## 6. Service Staff Availability Validation in Slot Picker (Medium Priority)

**Status:** ✅ Completed  
**Location:** `slot-picker.tsx`

### Description

The slot picker now validates both facility availability and service staff business hours when selecting time slots.

### Current State

- **Service Staff Business Hours**: ✅ Now validated when selecting time slots
- **Service Staff Data**: Found from existing reservations that include `ServiceStaff.businessHours`
- **Error Messages**: Displays appropriate error messages when time is outside business hours

### Implementation

1. **Service Staff Data Retrieval**: Finds service staff from existing reservations that match the selected `serviceStaffId`
2. **Business Hours Validation**: Uses `checkTimeAgainstBusinessHours` utility to validate selected time
3. **Error Handling**: Displays error message using `rsvp_time_outside_business_hours_service_staff` translation key
4. **Conflict Validation**: Still checks for conflicting reservations after business hours validation

### Related Files

- `web/src/app/s/[storeId]/reservation/components/slot-picker.tsx` (lines 442-509)
- `web/src/app/s/[storeId]/reservation/page.tsx` (updated query to include ServiceStaff)

---

## Summary

### High Priority

1. **Service Staff Products**: Complete product management system for service staff (e.g., "網球課10H")

### Medium Priority

1. ~~**Service Staff Business Hours Validation**: Complete client-side validation in drag-and-drop and slot picker~~ ✅ Completed
2. ~~**Service Staff Cost in Admin RSVPs**: Calculate and include service staff cost in admin-created RSVPs~~ ✅ Completed
3. ~~**Service Staff Availability in Slot Picker**: Complete business hours validation~~ ✅ Completed

### Low Priority

1. ~~**Unpaid Order Notifications**: Notify customers when unpaid orders are created~~ ✅ Completed
2. ~~**Refund Transaction Atomicity**: Refactor refund functions for true atomicity~~ ✅ Completed

### Implementation Notes

- Service staff products will require schema changes and new UI components
- Business hours validation can reuse existing `checkTimeAgainstBusinessHours` utility
- Service staff cost calculation should follow the same pattern as facility cost calculation
- Notification system already exists, just needs integration
- Refund refactoring requires careful testing to ensure backward compatibility
