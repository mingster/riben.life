# Functional Requirements: RSVP System

**Date:** 2025-01-27
**Status:** Active
**Version:** 2.0

**Related Documents:**

* [PRD-restaurant-reservation.md](./PRD-restaurant-reservation.md)
* [TECHNICAL-REQUIREMENTS-RSVP.md](./TECHNICAL-REQUIREMENTS-RSVP.md)
* [GITHUB-ISSUES-CHECKLIST.md](./GITHUB-ISSUES-CHECKLIST.md)

***

## 1. Overview

The RSVP (Reservation/Appointment) system enables any business to accept, manage, and track customer reservations and appointments. The system is designed to be flexible and can be used by various business types including restaurants, salons, clinics, service providers, and any other business that requires appointment scheduling. The system supports online reservations, LINE reservations, waitlists, notifications, and integration with external platforms including Reserve with Google (Google's reservation service), Google Maps, and LINE.

**Note:** Throughout this document, terms like "facility" and "ready" are used generically. For restaurants, "facility" refers to dining tables. For other businesses, "facility" may represent service stations, treatment rooms, consultation rooms, or other bookable resources. "Ready" may mean "arrived" or "service started" depending on the business context.

***

## 2. System Actors

### 2.1 Customer

* Anonymous guests (no account required)
* Registered users (with account)
* LINE users (via LINE Login)

### 2.2 Store Admin

* Store owners
* Full administrative access to store settings and configuration
* Can manage all aspects of the RSVP system

### 2.3 Store Staff

* Store employees with operational permissions
* Can manage reservations and customer interactions
* Limited access to settings (as configured by Store Admin)

### 2.4 System Admin

* Platform administrators

***

## 2.5 Access Control Summary

### Store Staff Permissions (Operational Access)

Store Staff can:

* Create reservations for customers
* View all reservations
* Edit reservations
* Confirm reservations
* Mark reservation status (Ready, NoShow, Completed, and other status values)
* Cancel reservations
* View and manage waitlist
* View resource status
* Manually assign resources
* View customer signatures
* Send LINE broadcast messages
* View tags (but not create/manage)

Store Staff cannot:

* Configure RSVP settings
* Create/manage resources (facilities)
* Manage blacklist
* Create/manage tags
* View analytics and reports
* Override cancellation restrictions (unless configured by Store Admin)

### Store Admin Permissions (Full Administrative Access)

Store Admins have all Store Staff permissions, plus:

* Configure all RSVP settings
* Create and manage resources (facilities)
* Manage customer blacklist
* Create and manage customer tags
* View analytics and reports
* Override cancellation restrictions
* Configure Store Staff access permissions

***

## 3. Core Functional Requirements

### 3.1 Reservation Creation

#### 3.1.1 Online Reservation (Customer-Facing)

**FR-RSVP-001:** Customers must be able to create reservations through the store's public RSVP page.

**Note:** No sign-in is required to create reservations. Anonymous users can create reservations without authentication, even when prepaid is required (`minPrepaidPercentage > 0`).

**FR-RSVP-002:** The reservation form must collect the following information:

* Date and time of reservation (rsvpTime)
* Number of adults (numOfAdult, default: 1)
* Number of children (numOfChild, default: 0)
* Customer contact information:
  * If logged in, (optional), keep User ID and Email address in the reservation record
  * Phone number (required for anonymous users)
* Special requests or notes (message, optional)
* Facility preference (facilityId, optional)

**FR-RSVP-003:** The system must validate reservation availability based on:

* Store's RSVP settings (acceptReservation flag)
* **Reservation time window:**
  * Reservations must be at least `canReserveBefore` hours in the future (e.g., if `canReserveBefore = 2`, current time is 7PM, only reservations at 9PM or later are allowed)
  * Reservations must be no more than `canReserveAfter` hours in the future (e.g., if `canReserveAfter = 2190` (3 months), reservations beyond 3 months are not allowed)
* **Business hours validation (rsvpTime):**
  * **If `RsvpSettings.useBusinessHours = true`:** Validate `rsvpTime` against `RsvpSettings.rsvpHours`
  * **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = true`:** Validate `rsvpTime` against `StoreSettings.businessHours`
  * **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = false`:** No business hours validation (all times allowed)
  * Validation occurs both in the UI (real-time feedback) and on form submission
* Facility capacity and availability
* **UI Facility Filtering:**
  * The reservation form dynamically filters available facilities based on the selected time slot
  * Facilities that are already booked at the selected time are hidden from the facility dropdown
  * **Calendar Day Filtering:** Facilities are only filtered if existing reservations fall on the same calendar day (in store timezone) as the selected time slot. Reservations on different calendar days do not affect facility availability.
  * **If `singleServiceMode` is `true`:** If any reservation exists for the time slot on the same calendar day, all facilities are filtered out
  * **If `singleServiceMode` is `false` (default):** Only facilities with existing reservations on the same calendar day are filtered out
  * When editing an existing reservation, the current facility is always included even if it would normally be filtered out
* Existing reservations for the requested time slot
* **If `singleServiceMode` is `true`:** Only one reservation is allowed per time slot across all facilities (personal shop mode)
* **If `singleServiceMode` is `false` (default):** Multiple reservations can exist on the same time slot as long as they use different facilities

**FR-RSVP-004:** The system must support prepaid reservations when enabled:

* If `minPrepaidPercentage > 0`:
  * Anonymous users can create reservations without signing in
  * When a customer creates a reservation with prepaid required:
    * System creates a store order with the prepaid amount
    * Prepaid amount = `ceil(totalReservationCost * minPrepaidPercentage / 100)`; if total cost is missing or zero, prepaid is skipped
    * **Currency Handling:** Order currency is set to the store's `defaultCurrency` to ensure consistency across order creation and payment processing.
    * Payment method is determined based on store settings:
      * If `store.useCustomerCredit = true`: Order is created with "credit" payment method
      * If `store.useCustomerCredit = false`: Order is created with "TBD" (To Be Determined) payment method
    * **Payment Method Updates:** When marking orders as paid, the system explicitly uses the provided payment method ID to ensure correct payment method tracking. Payment methods are correctly specified during order payment and refund processes.
    * Order is created as unpaid (`isPaid = false`) for customer to complete payment at checkout
    * Customer is redirected to `/checkout/[orderId]` to select payment method and complete payment
    * **Checkout Success:** After successful payment, a brief success message is displayed before redirecting to the appropriate page (RSVP page, custom return URL, or order page).
  * Payment can be made using:
    * Customer credit (if `useCustomerCredit = true` and customer selects "credit" payment method)
    * Other payment methods (Stripe, LINE Pay, cash, etc.) available at checkout
* Payment status tracked via `alreadyPaid` flag (updated after payment completion)
* Reservation linked to order via `orderId` when prepaid
* Customer credit balance is deducted only when customer completes payment using credit at checkout
* **Store Membership:** When customers create orders (including RSVP prepaid orders), they are automatically added as store members with "user" role in the store's organization, ensuring they can access store-specific features and services.

**FR-RSVP-005:** The system must assign a reservation status:

* Default status: 0 (Pending)

* Status values (RsvpStatus enum):
  * `0` = Pending (待確認/尚未付款) - Initial status when reservation is created
  * `10` = ReadyToConfirm - if store doesn't require prepaid, reservation status is ReadyToConfirm; otherwise reservation is ReadyToConfirm once user completed payment.
  * `40` = Ready (已入場) - Customer has arrived and is ready for service
  * `50` = Completed (已完成) - Reservation/service has been completed
  * `60` = Cancelled (已取消) - Reservation has been cancelled
  * `70` = NoShow (未到) - Customer did not show up for the reservation

* Additional fields track payment and confirmation status separately:
  * `alreadyPaid` (Boolean) - Payment has been received
  * `confirmedByStore` (Boolean) - Store has confirmed the reservation
  * `confirmedByCustomer` (Boolean) - Customer has confirmed the reservation

**FR-RSVP-006:** The system must support dual confirmation:

* `confirmedByStore`: Store staff or admin has confirmed the reservation
* `confirmedByCustomer`: Customer has confirmed the reservation

#### 3.1.1a Use Case: Customer-Facing Online Reservation (Prepaid NOT Required)

**UC-RSVP-001:** Customer creates a reservation when prepaid is not required (`minPrepaidPercentage = 0`):

**Preconditions:**

* Store has RSVP enabled (`acceptReservation = true`)
* Prepaid is not required (`minPrepaidPercentage = 0`)
* Customer is on the store's public RSVP page

**Main Flow:**

1. **Customer Access:**

   * Customer navigates to the store's public RSVP page
   * Customer may be anonymous (not logged in) or logged in
   * No authentication required for reservation creation

2. **Reservation Form Display:**

   * System displays the reservation form with available time slots
   * Customer can view available dates/times based on:
     * Business hours (`useBusinessHours`, `rsvpHours`)
     * Existing reservations
     * Facility availability

3. **Customer Fills Form:**

   * Customer selects date and time (rsvpTime)
   * Customer enters party size:
     * Number of adults (numOfAdult, default: 1)
     * Number of children (numOfChild, default: 0)
   * Customer provides contact information:
     * If logged in: (optional) User ID and Email address are kept in the reservation record
     * If anonymous: Phone number required
   * Customer optionally selects facility preference (facilityId)
   * Customer optionally adds special requests or notes (message)

4. **Form Validation:**

   * System validates:
     * Selected time is within business hours
     * Selected time slot is available
     * Required fields are filled (phone number required for anonymous users, email optional)
     * Party size is valid (at least 1 adult)

5. **Reservation Creation:**

   * Customer submits the form
   * System creates reservation with:
     * Status: `Pending (0)`
     * `alreadyPaid`: `false` (initially)
     * `confirmedByStore`: `false`
     * `confirmedByCustomer`: `false`
     * No order is created (no `orderId`) (initially)
   * Reservation is saved to database

   **If `rsvpSettings.minPrepaidPercentage > 0`:**

   * System creates `storeOrder` for the prepaid amount with:
     * Payment method: "credit" if `store.useCustomerCredit = true`, otherwise "TBD"
     * Order status: `Pending` (unpaid)
     * Shipping method: "digital"
   * Reservation `orderId` is set to the created order ID
   * Reservation `status` is set to `Pending` (will be updated to `ReadyToConfirm` after payment)
   * Reservation `alreadyPaid` is set to `false` (will be updated after payment completion)
   * Customer is redirected to `/checkout/[orderId]` to complete payment
   * At checkout page:
     * Customer can select payment method (credit, Stripe, LINE Pay, cash, etc.)
     * If customer selects "credit" payment method:
       * System checks if customer has sufficient credit balance
       * If sufficient: System deducts credit and marks order as paid
       * If insufficient: Customer must recharge credit or select different payment method
     * If customer selects other payment method (Stripe, LINE Pay, etc.):
       * Customer completes payment through payment provider
       * System marks order as paid after payment confirmation
   * After payment completion:
     * System updates reservation `alreadyPaid` to `true`
     * System updates reservation `status` to `ReadyToConfirm`
     * System creates `storeLedger` entry to record the transaction (if applicable)
     * Flow continues to step 6

6. **Store Staff Notification:**

   * **No notification sent to store staff** unless status is ReadyToConfirm
   * **Notification sent to store staff** (if `alreadyPaid = true` after prepaid payment)
   * Store staff can view the reservation in the admin interface

7. **Confirmation to Customer:**

   * System displays on-screen confirmation message
   * System sends confirmation notifications:
     * Email confirmation (if email provided)
     * SMS confirmation (if `useReminderSMS` enabled and phone provided)
     * LINE notification (if `useReminderLine` enabled and LINE account linked)
   * Customer receives confirmation with reservation details

8. **Post-Creation:**

   * Customer can view reservation through:
     * Account dashboard (if logged in)
     * Reservation confirmation link (if anonymous)
   * Store staff can view and manage the reservation in admin interface
   * Reservation remains in `ReadyToConfirm` status until store confirms or customer confirms

**Alternative Flows:**

**A1: Invalid Time Slot Selected:**

* Customer selects unavailable time slot
* System displays error message
* Customer selects different time slot
* Flow continues from step 3

**A2: Missing Required Contact Information:**

* Customer submits form without required contact information (phone number required for anonymous users)
* System displays validation error
* Customer provides missing required information
* Flow continues from step 4

**A3: Business Hours Validation Failure:**

* Customer selects time outside business hours
* System displays error message
* Customer selects time within business hours
* Flow continues from step 4

**Postconditions:**

* Reservation is created with `Pending` status
* Customer receives confirmation notification
* Store staff can view reservation in admin interface
* No payment is required
* No store order is created

**Related Requirements:**

* FR-RSVP-001, FR-RSVP-002, FR-RSVP-003, FR-RSVP-005, FR-RSVP-006
* FR-RSVP-039 (Confirmation Notifications)

#### 3.1.2 Staff-Created Reservations

**FR-RSVP-007:** Store staff and Store admins must be able to add a reservation for a customer through the staff interface.

**FR-RSVP-008:** Staff-created reservations must support all fields available in online reservations.

**FR-RSVP-009:** Store staff and Store admins must be able to mark staff-created reservations with a source identifier (e.g., phone call, in-person request, walk-in).

**FR-RSVP-010:** Store staff and Store admins must be able to add multiple reservations for the same customer through the staff interface. The system must support recurring reservation patterns (e.g., every Wednesday at 3pm, repeat 10 times).

#### 3.1.3 Reservation Lifecycle

**FR-RSVP-011:** The system must manage the complete lifecycle of a reservation through defined status transitions:

**Initial State:**

* When a reservation is created (online or by staff), it starts with status `Pending (0)`
* If `minPrepaidPercentage > 0`, a store order is automatically created with the prepaid amount
* The reservation remains in `Pending` status until payment and/or confirmation occurs

**Payment Flow (if prepaid required and store uses credit system):**

* Customer can create a pending RSVP first, then be prompted to complete recharge of store credit if his/her credit is not sufficient.
* When customer's credit is recharged, system deduced needed credit for the RSVP, the `alreadyPaid` flag is set to `true`
* The transaction is saved to StoreOrder, CreditLedger, and StoreLeger for the recharge and the credit usage.
* The reservation status changes to `ReadyToConfirm (10)`
* The reservation is linked to the order via `orderId`
* Store staff notifications are sent only when `alreadyPaid = true` and status is `ReadyToConfirm (10)`

**Payment Flow (if prepaid required and store do not use credit system):**

* Customer can create a pending RSVP first, then be prompted for the needed payment.
* Customer completes the needed payment, the transaction is saved to StoreOrder, CreditLedger, and StoreLeger for the payment.
* The reservation status changes to `ReadyToConfirm (10)`
* Store staff notifications are sent only when `alreadyPaid = true` and status is `ReadyToConfirm (10)`

**Payment Flow (if prepaid is not required):**

* Customer create a RSVP, the reservation status is `ReadyToConfirm (10)`
* Store staff notifications are sent only when `alreadyPaid = true` and status is `ReadyToConfirm (10)`

**Confirmation Flow for store staff:**

* Store staff or admin receive notification to confirm the `ReadyToConfirm (10)` reservation.
* As staff confirm the reservation, reservation's `confirmedByStore = true`, the status changes to `Ready (40)`.
* Customer receives notification for the update.

**Confirmation Flow for customer:**

* Customer receives notification again 24 hours prior to the reservation time.
* Customer confirm the reservation, which will update reservation to `confirmedByCustomer = true`

**Service Flow:**

* When the customer arrives and service is completed, store staff marks status as `Completed (50)`
* The `arriveTime` field is recorded as the status changes.

**Termination States:**

* Customer can cancel RSVP without time restriction if `RSVPSettings.canCancel = true`.
* If the reservation is cancelled (by customer or store), status changes to `Cancelled (60)`
* **Refund Policy:** When cancelled, customer credit or payment will be refunded only if cancellation occurs OUTSIDE the `cancelHours` window (i.e., cancelled more than `cancelHours` hours before the reservation time). If cancellation occurs WITHIN the `cancelHours` window (i.e., less than `cancelHours` hours before the reservation time), no refund is given.
* If the customer does not show up for the reservation, store staff can mark status as `NoShow (70)`
* Once in `Cancelled` or `NoShow` status, the reservation cannot transition to active states.
* Customer can delete the RSVP when it still pending.

**Status Transition Rules:**

* Status transitions are generally forward-moving (e.g., `Pending` → `ReadyToConfirm` → `Ready` → `Completed`)
* Payment status (`alreadyPaid`) and confirmation flags (`confirmedByStore`, `confirmedByCustomer`) are tracked separately from the status enum
* Status can transition to `Cancelled` or `NoShow` from any active state
* Store admins can manually set status to any valid state (with appropriate business rule validation)
* Status transitions should be logged for audit purposes

**Lifecycle Diagram:**

```text
Pending (0)
  [Payment: alreadyPaid flag can be set to true if prepaid required]
  [Confirmation: confirmedByStore and/or confirmedByCustomer can be set to true]
  ↓
ReadyToConfirm (10) [when customer paid. Notification will be sent to store staff]
  ↓
Ready (40) [when staff confirmed the reservation request]
  ↓
Completed (50) [when service is finished]

[At any point before Completed:]
  → Cancelled (60) [if cancelled]
  → NoShow (70) [if customer doesn't show]
```

**Note:** The status enum values (0, 40, 50, 60, 70) are spaced to allow for future intermediate states if needed. Payment and confirmation status are tracked separately via boolean fields (`alreadyPaid`, `confirmedByStore`, `confirmedByCustomer`).

***

### 3.2 Reservation Management

#### 3.2.1 Customer Self-Service

**FR-RSVP-012:** Customers must be able to view their reservations:

* Through their account dashboard (if logged in)
* Via reservation confirmation link (for anonymous reservations)

**FR-RSVP-013:** Customers must be able to modify reservations:

* Change date/time (subject to availability and cancellation policy)
* Update party size
* Update special requests/notes
* Modify within the allowed cancellation window (`cancelHours`)
* When modified, `ConfirmedByStore` is set to false again.
* **Unpaid Reservation Redirect:** When editing an unpaid reservation (where `orderId` exists and `alreadyPaid = false`), the system automatically redirects the customer to the checkout page (`/checkout/[orderId]`) to complete payment before allowing modifications.

**FR-RSVP-014:** Customers must be able to cancel reservations:

* Self-service cancellation if within `cancelHours` before reservation time
* Cancellation blocked if outside the allowed window (when `canCancel` is true and time limit applies)
* Cancellation confirmation sent via configured notification channels

**FR-RSVP-015:** Customers must be able to confirm their reservations:

* Respond to confirmation requests from store
* Set `confirmedByCustomer` flag

**FR-RSVP-015a:** Customers must be able to provide their signature:

* Electronic signature interface for customers to sign reservations
* Signature can be captured via touch screen, mouse, or stylus
* Signature is stored and associated with the reservation
* Signature may be required before reservation confirmation (configurable by store)

#### 3.2.2 Reservation Management (Store Staff & Store Admin)

**FR-RSVP-016:** Store staff and Store admins must be able to view all reservations:

* Daily view (by date)
* Filter by status (Pending, Ready, Completed, Cancelled, NoShow)
* Filter by payment status (alreadyPaid = true/false)
* Filter by confirmation status (confirmedByStore = true/false, confirmedByCustomer = true/false)
* Filter by facility
* Search by customer name, email, or phone

**FR-RSVP-017:** Store staff and Store admins must be able to edit reservations:

* Modify date/time
* Change party size
* Add/edit special requests
* Update customer contact information

**FR-RSVP-018:** Store staff and Store admins must be able to confirm reservations:

* Manually confirm reservations (`confirmedByStore = true`)
* Send confirmation notifications to customers

**FR-RSVP-019:** Store staff and Store admins must be able to mark reservation status:

* Mark as "completed" when customers arrive (`arriveTime` recorded)
* Mark as "no-show" if customers don't arrive
* Cancel reservations (with reason tracking)
* View customer signature if provided

**FR-RSVP-020:** Store admins must be able to override cancellation restrictions (Store Staff access configurable by Store Admin):

* Cancel reservations outside normal cancellation window
* Override prepaid requirements when necessary

***

### 3.3 Resource Management (Facilities/Appointment Slots)

**Note:** The term "facility" is used generically throughout this section. Depending on the business type, a "facility" may represent:

* Dining tables (restaurants)
* Service stations (salons, spas)
* Treatment rooms (clinics, medical practices)
* Consultation rooms (professional services)
* Equipment or facilities (fitness centers, studios)
* Any other bookable resource

#### 3.3.1 Resource Configuration

**FR-RSVP-022:** Store admins must be able to create and manage resources (facilities/appointment slots):

* Facility name (facilityName, unique)
* Facility capacity (capacity, default: 2)
* Link facilities to store (storeId)

**FR-RSVP-023:** Store staff and Store admins must be able to view resource status:

* Available resources (facilities/appointment slots)
* Reserved resources with reservation details
* Occupied resources (currently in use/ready)

**FR-RSVP-024:** The system must automatically check resource availability:

* Verify capacity matches party size (adults + children) or service requirements
* Prevent double-booking of same resource at same time
* Consider resource capacity when showing availability
* **UI Facility Filtering:**
  * The reservation form (both customer-facing and admin) dynamically filters available facilities based on the selected time slot
  * Facilities that are already booked at the selected time are hidden from the facility dropdown
  * **If `singleServiceMode` is `true`:** If any reservation exists for the time slot, all facilities are filtered out
  * **If `singleServiceMode` is `false` (default):** Only facilities with existing reservations are filtered out
  * When editing an existing reservation, the current facility is always included even if it would normally be filtered out
* **If `singleServiceMode` is `true`:** Check if any reservation exists for the requested time slot (across all facilities) and block if one exists
* **If `singleServiceMode` is `false` (default):** Check if the specific facility is available for the requested time slot (allows multiple reservations on same time slot with different facilities)

#### 3.3.2 Resource Assignment

**FR-RSVP-025:** The system must support automatic resource assignment:

* Assign available resource based on party size or service requirements
* Consider resource capacity and reservation time

**FR-RSVP-026:** The system must support manual resource assignment:

* Store staff and Store admins can manually assign specific resources
* Override automatic assignment when needed

***

### 3.4 RSVP Settings

#### 3.4.1 Basic Settings

**FR-RSVP-027:** Store admins must be able to enable/disable RSVP system:

* Toggle `acceptReservation` to turn system on/off
* When disabled, no new reservations accepted

**FR-RSVP-028:** Store admins must be able to configure business hours:

* Use store's general business hours (`useBusinessHours = true`)
* Set custom RSVP hours (`rsvpHours`, format: "09:00-18:00")
* Define available reservation time slots

#### 3.4.2 Prepaid Settings

**FR-RSVP-029:** Store admins must be able to configure prepaid requirements:

* Configure minimum prepaid percentage (`minPrepaidPercentage`, 0–100)
* Prepaid is required iff `minPrepaidPercentage > 0`
* Required prepaid amount = `ceil(totalReservationCost * minPrepaidPercentage / 100)`
* If total reservation cost is missing or zero, prepaid is skipped
* When prepaid is required, a pending RSVP creates a store order with the prepaid amount and must be paid before confirmation

#### 3.4.3 Cancellation Settings

**FR-RSVP-030:** Store admins must be able to configure cancellation policy:

* Enable/disable customer cancellations (`canCancel`)
* Set cancellation window in hours (`cancelHours`, default: 24)
* Define when customers can no longer cancel

#### 3.4.4 Reminder Settings

**FR-RSVP-031:** Store admins must be able to configure reminder notifications:

* Set reminder time in hours before reservation (`reminderHours`, default: 24)
* Enable/disable reminder channels:
  * SMS reminders (`useReminderSMS`)
  * LINE reminders (`useReminderLine`)
  * Email reminders (`useReminderEmail`)

#### 3.4.5 Calendar Integration

**FR-RSVP-032:** Store admins must be able to enable calendar synchronization:

* Google Calendar sync (`syncWithGoogle`)
* Apple Calendar sync (`syncWithApple`)
* Automatic event creation for reservations

#### 3.4.7 Google Maps Integration Settings

**FR-RSVP-033:** Store admins must be able to configure Reserve with Google integration:

* Enable/disable Reserve with Google integration
* Connect store's Google Business Profile to the reservation system
* Configure Reserve with Google API credentials (API key, service account, OAuth tokens)
* Set up store location and business information for Reserve with Google
* Map store facilities to Reserve with Google reservation slots
* View Reserve with Google integration status and sync health
* Test and verify connection to Reserve with Google service

#### 3.4.8 Signature Settings

**FR-RSVP-034:** Store admins must be able to configure signature requirements:

* Enable/disable signature requirement for reservations
* Require signature before reservation confirmation
* Require signature at check-in/arrival
* Store signature data securely with reservation record

***

### 3.5 Waitlist Management

#### 3.5.1 Waitlist Creation

**FR-RSVP-035:** When no availability exists, customers must be able to join a waitlist:

* Select desired date/time
* Provide contact information
* Receive waitlist confirmation

**FR-RSVP-036:** The system must automatically add customers to waitlist when:

* Requested time slot is fully booked
* No facilities available for party size

#### 3.5.2 Waitlist Management

**FR-RSVP-037:** Store staff and Store admins must be able to view waitlist:

* See all waitlist entries
* Filter by date/time
* View customer contact information

**FR-RSVP-038:** Store staff and Store admins must be able to confirm waitlist entries:

* Manually convert waitlist to reservation when availability opens
* Notify customers when their waitlist request can be confirmed
* Auto-confirm option (future enhancement)

***

### 3.6 Notification System

#### 3.6.1 Confirmation Notifications

**FR-RSVP-039:** The system must send confirmation notifications:

* **To customers:** Immediately upon reservation creation (pending RSVP):
* On-screen confirmation message
* Email confirmation (if email provided)
* SMS confirmation (if `useReminderSMS` enabled and phone provided)
* LINE notification (if `useReminderLine` enabled and LINE account linked)
* **To store staff:** Only when `alreadyPaid = true`:
  * Store staff are notified when payment is received and the `alreadyPaid` flag is set to `true`
  * This ensures store staff are only notified of reservations that have been paid for
  * Notifications are not sent for pending RSVPs that have not yet been paid

**FR-RSVP-040:** Confirmation notifications must include:

* Reservation date and time
* Party size (adults and children)
* Facility assignment (if assigned)
* Store contact information
* Cancellation policy
* Calendar link (if calendar sync enabled)

#### 3.6.2 Reminder Notifications

**FR-RSVP-041:** The system must send reminder notifications:

* At configured time before reservation (`reminderHours`)
* Via enabled channels (SMS, LINE, Email)
* Include reservation details and confirmation request

**FR-RSVP-042:** The system must support multiple reminder times:

* Primary reminder (default: 24 hours before)
* Secondary reminder (future: 2 hours before, if configured)

#### 3.6.3 Update Notifications

**FR-RSVP-043:** The system must notify customers when reservations are modified:

* Date/time changes
* Facility reassignments
* Status changes (confirmed, cancelled, etc.)

**FR-RSVP-044:** The system must notify customers when reservations are cancelled:

* By customer (self-cancellation confirmation)
* By store (cancellation notice with reason if applicable)

***

### 3.7 Blacklist Management (Store Admin Only)

#### 3.7.1 Blacklist Configuration

**FR-RSVP-045:** Store admins must be able to manage customer blacklist (Store Staff access not permitted):

* Add users to blacklist (`RsvpBlacklist`)
* Remove users from blacklist
* View blacklist entries

**FR-RSVP-046:** The system must prevent blacklisted users from creating reservations:

* Check blacklist before allowing reservation creation
* Display appropriate message to blacklisted users
* Log blacklist check attempts

#### 3.7.2 Blacklist Reasons

**FR-RSVP-047:** Store admins must be able to track blacklist reasons:

* No-show history
* Cancellation abuse
* Policy violations
* Manual addition by store admin

***

### 3.8 Tag Management (Store Admin Only)

#### 3.8.1 Customer Tags

**FR-RSVP-048:** Store admins must be able to create and manage customer tags (Store Staff access not permitted):

* Create tags (`RsvpTag`) with unique names per store
* Assign tags to reservations/customers
* Use tags for customer segmentation and communication

**FR-RSVP-049:** Tag examples:

* VIP customers
* Regular customers
* Special dietary requirements
* Preferred seating areas

#### 3.8.2 Tag Usage

**FR-RSVP-050:** Store admins must be able to filter reservations by tags (Store Staff can view tags but not create/manage):

* View all reservations with specific tag
* Group customers by tags for targeted communications

***

### 3.9 Integration Requirements

#### 3.9.1 Reserve with Google Integration

**FR-RSVP-051:** The system must connect to and integrate with "Reserve with Google" service:

* Establish connection to Reserve with Google API
* Authenticate and authorize the store's Google Business Profile
* Link store's reservation system to Reserve with Google platform
* Enable customers to make reservations directly through Google Search and Google Maps
* Ensure reservations created via Reserve with Google appear in the system's reservation management interface

**FR-RSVP-051a:** The system must support Reserve with Google integration features:

* Sync reservation availability to Reserve with Google
* Accept reservations initiated from Reserve with Google
* Handle reservation modifications from Reserve with Google
* Handle cancellations from Reserve with Google
* Two-way synchronization of reservation data between the system and Reserve with Google
* Real-time availability updates sent to Reserve with Google

**FR-RSVP-052:** The system must support deep linking from Google Maps:

* Pre-fill store context when arriving from Google Maps
* Maintain reservation source tracking
* Preserve customer information when redirected from Google Maps
* Support direct reservation creation from Google Maps deep links

**FR-RSVP-052a:** The system must support Reserve with Google API configuration:

* Store admins can enable/disable Reserve with Google integration
* Connect store's Google Business Profile to the reservation system
* Configure Reserve with Google API credentials and authentication
* Set up store location and business information for Reserve with Google
* Map store facilities to Reserve with Google reservation slots
* Verify connection status and integration health

**FR-RSVP-052b:** The system must handle Reserve with Google reservation webhooks:

* Receive reservation creation notifications from Reserve with Google
* Receive reservation update notifications from Reserve with Google
* Receive reservation cancellation notifications from Reserve with Google
* Process and validate webhook payloads from Reserve with Google
* Update local reservation records based on Reserve with Google events
* Handle webhook authentication and security

**FR-RSVP-052c:** The system must display Reserve with Google integration status:

* Show whether Reserve with Google integration is enabled
* Display connection status with Google Business Profile
* Display sync status (active, error, disconnected)
* Show last successful sync timestamp
* Provide error messages if sync fails
* Display integration health metrics

#### 3.9.2 LINE Integration

**FR-RSVP-053:** The system must support LINE Login:

* Allow customers to authenticate via LINE
* Link LINE account to user profile
* Share contact information from LINE profile

**FR-RSVP-054:** The system must support LINE notifications:

* Send confirmations via LINE Official Account
* Send reminders via LINE messaging
* Send updates and cancellations via LINE

**FR-RSVP-055:** The system must support LINE broadcast messaging:

* Store staff and Store admins can send messages to waitlisted customers
* Broadcast day-of updates to confirmed reservations

***

### 3.10 Reporting and Analytics (Store Admin Only)

#### 3.10.1 Reservation Statistics

**FR-RSVP-056:** Store admins must be able to view reservation statistics (Store Staff access not permitted):

* Total reservations by date range
* Reservations by status
* Utilization rate (ready vs confirmed)
* No-show rate
* Cancellation rate

#### 3.10.2 Customer Analytics

**FR-RSVP-057:** Store admins must be able to view customer history (Store Staff access not permitted):

* Reservation history per customer
* Frequency of visits
* Average party size
* Preferred times/dates

#### 3.10.3 Resource Utilization

**FR-RSVP-058:** Store admins must be able to view resource utilization (Store Staff access not permitted):

* Resource occupancy rates
* Most/least used resources
* Peak time analysis

***

## 4. Data Requirements

### 4.1 Reservation Data Model

**FR-RSVP-059:** The system must store the following reservation data:

* Unique reservation ID
* Store ID
* User ID (optional, for logged-in users)
* Order ID (if prepaid)
* Facility ID (if assigned)
* Number of adults
* Number of children
* Reservation date/time (rsvpTime)
* Arrival time (arriveTime, when ready)
* Status (Pending, Ready, Completed, Cancelled, NoShow)
* Payment status (alreadyPaid - Boolean flag)
* Confirmation flags (confirmedByStore, confirmedByCustomer - Boolean flags)
* Special requests/message
* Payment method (credit, alternative payment)
* Customer signature (if provided, stored as image/data)
* Signature timestamp (when signature was captured)
* Creation and update timestamps

**Note:** When customer credit is used for prepaid reservation, the system must reference the `CustomerCredit` table to check balance and deduct amount.

### 4.2 Settings Data Model

**FR-RSVP-060:** The system must store RSVP settings per store:

* `singleServiceMode` (Boolean, default: `false`) - When enabled, only ONE reservation per time slot is allowed across all facilities. This is designed for personal shops where the service provider can only handle one reservation at a time. When disabled (default), multiple reservations can exist on the same time slot as long as they use different facilities.

* Accept reservation flag

* Prepaid requirements and amount (can be dollar amount or CustomerCredit amount)

* Cancellation policy (enabled, hours)

* Business hours configuration

* Reminder settings (hours, channels)

* Calendar sync preferences

* Reserve with Google integration settings (enabled/disabled, API credentials, Google Business Profile connection, sync status)

* Signature requirements (enabled, required before confirmation, required at check-in)

### 4.3 Resource Data Model (Facilities/Appointment Slots)

**FR-RSVP-061:** The system must store resource information (facilities/appointment slots):

* Unique resource ID
* Store ID
* Resource name (unique, stored as facilityName in database)
* capacity (number of people/seats or service capacity)

### 4.4 Customer Credit Data Model

**FR-RSVP-062:** The system must store customer credit information:

* Unique credit record ID
* Store ID
* User ID
* Credit balance (Decimal, default: 0)
* Unique constraint on storeId + userId combination
* Update timestamp

**Note:** Customer credit is store-specific. Each customer can have separate credit balances at different stores.

***

## 5. Business Rules

### 5.1 Availability Rules

**BR-RSVP-001:** Reservations can only be created during configured business hours. The business hours validation follows this priority:

* **If `RsvpSettings.useBusinessHours = true`:** Validate `rsvpTime` against `RsvpSettings.rsvpHours`
* **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = true`:** Validate `rsvpTime` against `StoreSettings.businessHours`
* **If `RsvpSettings.useBusinessHours = false` AND `Store.useBusinessHours = false`:** No business hours validation (all times allowed)
  Validation occurs both in the UI (real-time feedback when user selects a time) and on form submission (server-side validation).

**BR-RSVP-002:** Reservations cannot be created for past dates/times.

**BR-RSVP-003:** Resource capacity must accommodate party size (adults + children) or service requirements.

**BR-RSVP-004:** Same resource cannot be double-booked at the same time.

**BR-RSVP-004a:** When `singleServiceMode` is `true` in `RsvpSettings`, only ONE reservation is allowed per time slot across all facilities. This mode is designed for personal shops where the service provider can only handle one reservation at a time, regardless of which facility is used.

**BR-RSVP-004b:** When `singleServiceMode` is `false` (default), multiple reservations can exist on the same time slot as long as they use different facilities. This allows multiple concurrent reservations when different resources are available.

### 5.2 Cancellation Rules

**BR-RSVP-005:** Customers can cancel without time restriction if `canCancel` is true in `RsvpSettings`. Refunds are only provided if cancellation occurs outside the `cancelHours` window (i.e., cancelled more than `cancelHours` hours before the reservation time). If cancellation occurs within the `cancelHours` window (i.e., less than `cancelHours` hours before the reservation time), no refund is given.

**BR-RSVP-006:** If `canCancel` is false, customers cannot self-cancel (store staff or store admin must cancel).

**BR-RSVP-007:** Store staff and Store admins can always cancel reservations regardless of cancellation policy.

### 5.3 Prepaid Rules

**BR-RSVP-008:** No sign-in is required to create reservations. Anonymous users can create reservations without authentication, even when prepaid is required (`minPrepaidPercentage > 0`).

**BR-RSVP-009:** If `minPrepaidPercentage > 0`, when a customer creates a pending RSVP, a store order is automatically created with the prepaid amount (percentage of total). Reservation is not confirmed until payment is received.

**BR-RSVP-010:** Required prepaid amount = `ceil(totalReservationCost * minPrepaidPercentage / 100)`. If total cost is missing/0, prepaid is skipped. Prepaid must be paid before reservation time.

**BR-RSVP-010a:** Customers can pay prepaid amount using existing credit from `CustomerCredit` table.

**BR-RSVP-010b:** If customer credit is insufficient to cover the prepaid amount, customer must top up credit or purchase products to refill credit.

**BR-RSVP-010c:** When customer credit is used for prepaid reservation, the credit balance must be deducted immediately upon reservation confirmation.

**BR-RSVP-011:** Refund policy for prepaid cancellations follows store's refund policy.

### 5.4 Confirmation Rules

**BR-RSVP-012:** Reservations require confirmation from both store and customer (dual confirmation).

**BR-RSVP-013:** Store can confirm reservations immediately upon creation.

**BR-RSVP-014:** Customers must confirm reservations when requested by store.

### 5.5 Blacklist Rules

**BR-RSVP-015:** Blacklisted users cannot create new reservations.

**BR-RSVP-016:** Existing reservations from blacklisted users remain valid until cancelled.

**BR-RSVP-017:** Blacklist is store-specific (user blacklisted at one store can still reserve at others).

### 5.6 Signature Rules

**BR-RSVP-018:** If signature is required before confirmation, reservation cannot be confirmed until signature is provided.

**BR-RSVP-019:** If signature is required at check-in, customer must provide signature upon arrival.

**BR-RSVP-020:** Signature data must be stored securely and associated with the reservation record.

**BR-RSVP-021:** Store staff and Store admins can view customer signatures for verification purposes.

### 5.5 Reserve with Google Integration Rules

**BR-RSVP-022:** The system must establish and maintain an active connection to Reserve with Google service.

**BR-RSVP-023:** Reservations created from Reserve with Google must be tracked with source identifier.

**BR-RSVP-024:** When Reserve with Google integration is enabled, reservation availability must be synced in real-time.

**BR-RSVP-025:** Reservations modified in Reserve with Google must be reflected in the system within the configured sync interval.

**BR-RSVP-026:** If Reserve with Google sync fails, the system must continue to accept reservations through other channels.

**BR-RSVP-027:** Reserve with Google reservations must follow the same business rules as regular reservations (prepaid requirements, cancellation policy, etc.).

**BR-RSVP-028:** The system must handle Reserve with Google connection failures gracefully and provide clear error messages to store admins.

***

## 6. User Interface Requirements

### 6.1 Device/Platform Requirements

**UI-RSVP-001:** The system must support the following device types:

* **Customer Interface:**
  * Mobile phones (primary platform)
  * Must be optimized for phone screen sizes and touch interactions
* **Staff/Store Admin Interface:**
  * Tablets (primary platform)
  * Mobile phones (secondary platform)
  * Must be optimized for both tablet and phone screen sizes
  * Touch-friendly interface for both device types

### 6.2 Customer-Facing Interface

**UI-RSVP-002:** Reservation form must be intuitive and mobile-friendly (optimized for phones).

**UI-RSVP-003:** Availability calendar must clearly show available time slots (optimized for phone display).

**UI-RSVP-004:** Confirmation page must display all reservation details clearly (optimized for phone display).

**UI-RSVP-005:** Reservation management page must allow easy modification and cancellation (optimized for phone display).

**UI-RSVP-005a:** Signature interface must be user-friendly and accessible:

* Support touch screen input (primary for phones)
* Provide clear signature area with appropriate size for phone screens
* Allow customers to clear and re-sign if needed
* Display signature preview after capture
* Optimized for phone devices
* Provide clear instructions for signature capture

### 6.3 Store Staff & Store Admin Interface

**UI-RSVP-006:** Reservation dashboard must provide clear daily/weekly view (optimized for tablets and phones) - accessible to Store Staff and Store Admins.

**UI-RSVP-007:** Reservation list must support filtering and searching (optimized for tablets and phones) - accessible to Store Staff and Store Admins.

**UI-RSVP-008:** Resource view must show current status and assignments (facilities/appointment slots) (optimized for tablets and phones) - accessible to Store Staff and Store Admins.

**UI-RSVP-009:** Settings page must be organized by functional area (basic, prepaid, cancellation, reminders, etc.) (optimized for tablets and phones) - Store Admin only.

**UI-RSVP-010:** Staff interface must be touch-friendly and support both portrait and landscape orientations on tablets and phones - accessible to Store Staff and Store Admins.

**UI-RSVP-013:** The staff interface must provide a recurring reservation creation feature that allows Store Staff and Store Admins to specify:

* Base reservation details (customer, party size, facility preference, etc.)
* Recurrence pattern (e.g., weekly, bi-weekly, monthly)
* Day of week and time
* Number of occurrences or end date
* All recurring reservations must be created as individual reservation records (optimized for tablets and phones).

**UI-RSVP-011:** Analytics and reporting pages must be clearly marked as Store Admin only (optimized for tablets and phones).

**UI-RSVP-012:** Blacklist and tag management pages must be clearly marked as Store Admin only (optimized for tablets and phones).

**UI-RSVP-014:** Reserve with Google integration settings page must allow Store Admins to:

* Enable/disable Reserve with Google integration
* Connect store's Google Business Profile
* Configure API credentials securely
* Test connection to Reserve with Google service
* View integration status and sync health
* Map facilities to Reserve with Google reservation slots
* View error logs and sync history (optimized for tablets and phones).

***

## 7. Performance Requirements

### 7.1 Response Time

**PERF-RSVP-001:** Reservation creation must complete within 3 seconds.

**PERF-RSVP-002:** Availability check must respond within 1 second.

**PERF-RSVP-003:** Reservation list loading must complete within 2 seconds for daily view.

### 7.2 Scalability

**PERF-RSVP-004:** System must support at least 1000 reservations per store per day.

**PERF-RSVP-005:** System must handle concurrent reservation creation from multiple users.

***

## 8. Security Requirements

### 8.1 Access Control

**SEC-RSVP-001:** Store staff and Store admins can access store reservation management. Store Staff have operational permissions (view, create, edit reservations). Store Admins have full administrative access including settings configuration.

**SEC-RSVP-001a:** Store Staff access to certain features (e.g., override cancellation restrictions, view analytics) is configurable by Store Admin.

**SEC-RSVP-002:** Customers can only view/modify their own reservations.

**SEC-RSVP-003:** Anonymous reservations require confirmation link for access.

### 8.2 Data Protection

**SEC-RSVP-004:** Customer contact information must be protected and not exposed to unauthorized users.

**SEC-RSVP-005:** Payment information must be handled securely (PCI compliance if storing).

**SEC-RSVP-006:** Customer signature data must be stored securely and encrypted.

**SEC-RSVP-007:** Signature data must only be accessible to authorized store staff, store admins, and the customer who provided it.

***

## 9. Error Handling

### 9.1 Validation Errors

**ERR-RSVP-001:** System must validate all required fields before creating reservation.

**ERR-RSVP-002:** System must display clear error messages for validation failures.

**ERR-RSVP-003:** System must prevent reservation creation when no availability exists.

### 9.2 System Errors

**ERR-RSVP-004:** System must handle concurrent reservation conflicts gracefully.

**ERR-RSVP-005:** System must log all reservation operations for audit trail.

**ERR-RSVP-006:** System must handle notification failures gracefully (retry mechanism).

***

## 10. Future Enhancements (Out of Scope)

### 10.1 Advanced Features

* Automated facility allocation optimization
* Customer loyalty program integration
* POS system integration
* Advanced analytics and reporting dashboards
* Multi-language support (beyond current i18n)
* Automated waitlist confirmation
* Advanced recurring reservation patterns (custom schedules, exceptions)
* Group reservation management
* Reservation deposit/no-show fee collection

***

## 11. Dependencies

### 11.1 External Services

* Email service provider (for email notifications)
* SMS service provider (for SMS notifications)
* LINE Messaging API (for LINE notifications)
* Reserve with Google API (for Google integration)
* Payment processing (for prepaid reservations)

### 11.2 Internal Systems

* User authentication system
* Store management system
* Order management system (for prepaid reservations)
* Notification queue system

***

## 12. Acceptance Criteria

### 12.1 Core Functionality

* ✅ Customers can create online reservations
* ✅ Store staff and Store admins can create reservations for customers through staff interface
* ✅ Store staff and Store admins can create multiple recurring reservations for the same customer (e.g., every Wednesday at 3pm, repeat 10 times)
* ✅ Reservations can be viewed, edited, and cancelled
* ✅ Facility assignment works correctly
* ✅ Notifications are sent via configured channels
* ✅ Settings can be configured and saved
* ✅ Blacklist prevents blacklisted users from reserving

### 12.2 Integration

* ✅ Reserve with Google integration works (if enabled)
* ✅ Connection to Reserve with Google service is established and maintained
* ✅ LINE integration works (if enabled)
* ✅ Calendar sync works (if enabled)

### 12.3 Performance

* ✅ All performance requirements met
* ✅ System handles expected load

***

## 13. Glossary

* **RSVP**: Reservation/Appointment (Répondez s'il vous plaît)
* **Prepaid**: Payment required before reservation confirmation
* **Waitlist**: Queue of customers waiting for availability
* **Blacklist**: List of users blocked from making reservations
* **Dual Confirmation**: Both store and customer must confirm reservation
* **No-show**: Customer who doesn't arrive for reservation/appointment
* **Walk-in**: Customer who arrives without reservation
* **Facility/Resource**: Generic term for bookable resources. For restaurants, this refers to dining tables. For other businesses (salons, clinics, etc.), this may refer to service stations, treatment rooms, consultation rooms, or other bookable resources.
* **Ready**: Generic term meaning customer has arrived and is ready for service. For restaurants, this means customer has arrived and is ready to be seated. For other businesses, this may mean "arrived" or "service started".

***

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-01-27 | System | Updated authentication requirements: (1) Clarified that no sign-in is required to create reservations - anonymous users can create reservations without authentication, even when prepaid is required (`minPrepaidPercentage > 0`). (2) Updated FR-RSVP-001, FR-RSVP-002, FR-RSVP-004, and BR-RSVP-008 to reflect that anonymous users can create reservations regardless of prepaid requirements. |
| 1.9 | 2025-01-27 | System | Enhanced reservation system with authentication, timezone fixes, and UI improvements: (1) Added sign-in requirement for reservation page access - customers must authenticate before creating reservations. (2) Fixed facility filtering to only filter facilities on the same calendar day (in store timezone) as the selected time slot, preventing incorrect filtering across different days. (3) Fixed timezone handling in date/time selection - resolved one-day-off issue by ensuring date components are extracted in store timezone rather than UTC. (4) Improved payment method handling - payment methods are now explicitly specified and updated during order payment and refund processes. (5) Currency consistency - orders use store's `defaultCurrency` or order's `currency` consistently across creation and refund processes. (6) Auto store membership - customers are automatically added as store members (user role) when they create orders. (7) Order notes display - added option to display order notes in order detail views (default: hidden). (8) Fiat balance badge - added fiat balance badge to customer menu for quick balance visibility. (9) Checkout success UX - brief success message displayed before redirect on checkout success page. (10) Unpaid RSVP redirect - in edit mode, unpaid reservations automatically redirect to checkout page. (11) Date/time display - changed datetime-local input to display-only field in reservation form for better timezone handling. Updated FR-RSVP-001, FR-RSVP-003, FR-RSVP-004, and FR-RSVP-013 to reflect these enhancements. |
| 1.8 | 2025-01-27 | System | Updated customer-facing RSVP creation flow with checkout integration: (1) Changed prepaid payment flow - when prepaid is required, system now creates an unpaid store order and redirects customer to checkout page (`/checkout/[orderId]`) instead of processing payment immediately. (2) Payment method selection: Orders are created with "credit" payment method if `store.useCustomerCredit = true`, otherwise "TBD" payment method. Customer selects payment method at checkout. (3) Credit deduction: Customer credit is no longer deducted at reservation creation time; it's deducted only when customer completes payment using credit at checkout. (4) Updated FR-RSVP-004 and UC-RSVP-001 to reflect new checkout-based payment flow. |
| 1.7 | 2025-01-27 | System | Enhanced reservation validation and UI improvements: (1) Added detailed business hours validation logic with priority rules (RsvpSettings.useBusinessHours vs Store.useBusinessHours), including real-time UI validation and server-side validation on form submission. (2) Implemented dynamic facility filtering in reservation forms (both customer-facing and admin) - facilities already booked at the selected time slot are automatically filtered out from the dropdown, with special handling for singleServiceMode and edit mode. Updated FR-RSVP-003, FR-RSVP-024, and BR-RSVP-001 to document these enhancements. |
| 1.6 | 2025-01-27 | System | Added `singleServiceMode` field to RsvpSettings: Boolean field (default: `false`) for personal shops where only ONE reservation per time slot is allowed across all facilities. When enabled, availability checking blocks any reservation if another reservation exists for the same time slot, regardless of facility. When disabled (default), multiple reservations can exist on the same time slot as long as they use different facilities. Updated business rules (BR-RSVP-004a, BR-RSVP-004b) and functional requirements (FR-RSVP-003, FR-RSVP-024, FR-RSVP-060) to document this behavior. |
|---------|------|--------|---------|
| 1.5 | 2025-01-27 | System | Added explicit requirement for Reserve with Google service connection. Updated all references from "Google Maps Reserve" to "Reserve with Google" for clarity. Enhanced integration requirements to emphasize connection establishment and Google Business Profile linking. |
| 1.4 | 2025-01-27 | System | Added comprehensive Google Maps integration requirements including Reserve API integration, webhook handling, configuration settings, status monitoring, and business rules. Added new section 3.4.7 for Google Maps Integration Settings. |
| 1.3 | 2025-01-27 | System | Separated Store Admin and Store Staff into distinct roles with different access levels. Added access control summary section. Updated all requirements to specify which role has access to which features. |
| 1.2 | 2025-01-27 | System | Changed terminology from "table" to "facility" throughout document to better reflect generic bookable resources |
| 1.1 | 2025-01-27 | System | Updated to be business-agnostic: clarified that RSVP system can be used by any business type (not just restaurants), added generic terminology notes for "facility" and "seated", updated resource management terminology |
| 1.0 | 2025-01-27 | System | Initial functional requirements document |

***

## End of Document
