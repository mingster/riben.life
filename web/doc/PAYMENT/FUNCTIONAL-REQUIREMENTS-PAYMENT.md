# Functional Requirements: Payment System

**Date:** 2025-01-27
**Status:** Active
**Version:** 1.1

**Related Documents:**

- [FUNCTIONAL-REQUIREMENTS-RSVP.md](../RSVP/FUNCTIONAL-REQUIREMENTS-RSVP.md)
- [FUNCTIONAL-REQUIREMENTS-CREDIT.md](../CREDIT/FUNCTIONAL-REQUIREMENTS-CREDIT.md)
- [DESIGN-CUSTOMER-CREDIT.md](../CREDIT/DESIGN-CUSTOMER-CREDIT.md)

---

## 1. Overview

The Payment System enables customers to complete payments for various transaction types including store orders, credit recharges, reservation prepaid payments, and subscription payments. The system uses a plugin-based architecture where payment methods are installable plugins that can be added, configured, and managed dynamically.

The payment system handles:

- Store order payments (product purchases)
- Credit recharge payments (customer credit top-ups)
- RSVP prepaid payments (reservation deposits)
- Subscription payments (store subscription renewals)
- Payment method plugins (installable, configurable payment methods)
- Payment method installation and configuration
- Payment confirmation and success handling
- Fee calculation (payment gateway fees and platform fees)
- Store ledger integration

**Plugin Architecture:**

Payment methods are implemented as plugins that can be:

- Installed by System Admins to make them available to stores
- Configured at the platform level (default credentials, settings)
- Enabled/disabled by Store Admins for their stores
- Configured with store-specific credentials (if supported by plugin)
- Extended with custom payment methods without modifying core system

---

## 2. System Actors

### 2.1 Customer

- Registered users (with account)
- Anonymous users (limited payment capabilities)

### 2.2 Store Admin

- Store owners with full payment configuration access
- Can configure payment methods, fees, and settings

### 2.3 System Admin

- Platform administrators
- Manages platform-wide payment settings

---

## 3. Core Functional Requirements

### 3.1 Payment Methods

#### 3.1.1 Payment Method Plugin Architecture

**FR-PAY-001:** Payment methods must be implemented as installable plugins:

- Each payment method is a plugin that can be installed by System Admins
- Plugins implement a standard payment method interface/API
- Plugins provide payment processing, confirmation, and status verification capabilities
- Plugins can be enabled or disabled independently
- New payment methods can be added by installing new plugins without modifying core system code

**FR-PAY-002:** The system must support payment method plugin installation:

- System Admins can install payment method plugins
- Plugins are registered in the system upon installation
- Installed plugins become available for store configuration
- Plugin installation includes:
  - Plugin identifier/name
  - Display name and description
  - Plugin configuration schema (required settings, credentials)
  - Default fee structure
  - Payment processing implementation

**FR-PAY-003:** Default payment method plugins (built-in):

The system includes the following built-in payment method plugins:

- **Stripe Plugin**: Credit/debit card payments via Stripe payment gateway
- **LINE Pay Plugin**: Payments via LINE Pay service
- **Credit-based Payment Plugin**: Payments using customer credit balance
- **Cash/In-Person Payment Plugin**: Payments made in cash or in-person at the store location

**FR-PAY-004:** Payment method plugins must be configurable at multiple levels:

**Platform-level configuration:**

- System Admins can configure default credentials and settings for plugins
- Platform-level configuration provides fallback for stores without own configuration
- Platform credentials are used when store-level credentials are not configured

**Store-level configuration:**

- Store Admins can enable/disable specific payment method plugins
- Store Admins can configure store-specific credentials (if plugin supports it)
- Store Admins can override default fee structure (if plugin allows)
- Store-level configuration takes precedence over platform-level configuration

**FR-PAY-004.1:** When a store is created, the system must automatically create a special system product for credit recharge:

- **Product Name**: "Credit Recharge" or similar descriptive name
- **Product Description**: Description of credit recharge product
- **Price**: 0 (price is determined by `creditExchangeRate` at time of purchase)
- **Currency**: Store's default currency
- **Status**: Active
- **Is Featured**: false
- **Purpose**: This product is used as the `productId` in `OrderItem` entries for credit recharge orders
- **Note**: This product should be created during store creation to ensure it's available when customers initiate credit recharges

**FR-PAY-005:** Payment method plugins must implement a standard interface:

- **Payment Processing**: Handle payment initiation and processing
- **Payment Confirmation**: Verify payment status after customer completes payment
- **Payment Status Verification**: Check current payment status via payment gateway API
- **Configuration Management**: Handle plugin-specific configuration (credentials, settings)
- **Fee Calculation**: Provide fee structure (rate, additional fees)
- **Error Handling**: Handle and report payment errors consistently

#### 3.1.2 Payment Method Plugin Management

**FR-PAY-006:** System Admins must be able to manage payment method plugins:

**Plugin Installation:**

- System Admins can install new payment method plugins
- Installation process registers plugin in the system
- Installed plugins become available for store configuration
- Plugin metadata (name, description, version) is stored

**Plugin Configuration:**

- System Admins can configure platform-level settings for each plugin
- Platform configuration includes default credentials, settings, and fee structure
- Platform configuration serves as fallback for stores without own configuration

**Plugin Updates:**

- System Admins can update installed plugins
- Plugin updates can add new features, fix bugs, or update configuration schema
- Store configurations are preserved during plugin updates (when compatible)

**Plugin Removal:**

- System Admins can remove/uninstall payment method plugins
- Plugin removal should warn if any stores are currently using the plugin
- Stores using removed plugins must disable them before plugin can be removed

**FR-PAY-007:** Store Admins must be able to manage payment method plugins for their stores:

**Enable/Disable Plugins:**

- Store Admins can enable installed payment method plugins for their store
- Store Admins can disable plugins that are no longer needed
- Only enabled plugins are shown to customers during checkout

**Plugin Configuration:**

- Store Admins can configure plugin-specific settings (if plugin supports it)
- Configuration can include credentials, fee overrides, and plugin-specific options
- Store configuration overrides platform-level configuration

**FR-PAY-008:** Customers must be able to select from enabled payment methods during checkout:

- Available payment methods are displayed based on store configuration (enabled plugins)
- Payment method selection is required before order submission
- Only payment methods that are available and valid are shown to customers

**FR-PAY-009:** Payment method availability must be validated by the plugin:

- Each plugin implements availability validation logic
- Validation checks plugin-specific requirements:
- **Credit-based Payment Plugin**: Requires signed-in customer, store credit system enabled, sufficient credit balance
- **Stripe Plugin**: Requires valid credentials (store-level or platform-level)
- **LINE Pay Plugin**: Requires valid credentials (store-level or platform-level)
- **Cash/In-Person Payment Plugin**: Available for in-store transactions, order pickup, or when store allows offline payment
- **Other plugins**: Implement their own validation logic
- Plugins can prevent themselves from being available based on configuration or state

---

### 3.2 Order Payment Flow

#### 3.2.1 Regular Store Order Payment

**FR-PAY-005:** The system must process payments for regular store orders:

**Order Creation Flow:**

1. Customer completes checkout and selects payment method
2. System creates `StoreOrder` with:
   - `orderStatus`: `Pending`
   - `paymentStatus`: `Pending`
   - `isPaid`: `false`
   - Selected `paymentMethodId`
   - `orderTotal`: Total amount to be paid
   - Currency from store settings

**Payment Processing Flow:**

3. System delegates payment processing to the selected payment method plugin:
   - Plugin handles payment initiation according to its implementation
   - Plugins may redirect to external payment pages (Stripe, LINE Pay)
   - Plugins may process payments internally (Credit-based payments, Cash/In-Person payments)
   - Plugins handle plugin-specific payment flow logic

**Cash/In-Person Payment Specific Flow:**

- Orders with cash/in-person payment method are created with `paymentStatus = Pending`
- Payment can be confirmed in two ways:
  - **Immediate confirmation**: Order marked as paid immediately upon creation (if configured)
  - **Manual confirmation**: Store staff manually confirms payment receipt via admin interface
- Cash payments have zero processing fees (no gateway fees, no platform fees)
- Suitable for in-store transactions, order pickup, or delivery scenarios

4. After payment confirmation:
   - System updates order:
     - `isPaid`: `true`
     - `paidDate`: Current timestamp
     - `paymentStatus`: `Paid`
     - `orderStatus`: `Confirmed` (or `Processing` based on order type)
   - System creates `StoreLedger` entry for revenue recognition
   - System calculates and records fees (payment gateway fees, platform fees)

**FR-PAY-010:** Payment confirmation must be handled by payment method plugins:

- Each plugin implements payment confirmation logic
- Plugins verify payment status via their payment gateway API (if applicable)
- Plugins return payment status (success, failed, pending)
- Payment must be verified by plugin before marking order as paid
- Plugin-specific confirmation flow:
  - **Stripe Plugin**: Verifies `PaymentIntent` status via Stripe API
  - **LINE Pay Plugin**: Verifies transaction status via LINE Pay API
  - **Credit Plugin**: Verifies credit deduction was successful

#### 3.2.2 Payment Method Plugin Configuration

**FR-PAY-011:** Payment method plugins must support multi-level configuration:

**Platform-level Configuration:**

- System Admins configure default settings for each plugin
- Platform configuration includes default credentials, fee structure, and plugin settings
- Platform configuration serves as fallback for stores

**Store-level Configuration:**

- Store Admins can override platform configuration with store-specific settings
- Store configuration includes credentials, fee overrides, and plugin-specific options
- Store configuration takes precedence over platform configuration
- Configuration priority: Store-level > Platform-level > Plugin defaults

**FR-PAY-012:** Payment processing must determine configuration routing:

- Plugins check for store-level configuration first
- If store-level configuration is not available, plugins use platform-level configuration
- If platform-level configuration is not available, plugins use default configuration
- Free-level stores: Configuration may be restricted (e.g., must use platform credentials)
- Pro-level stores: Can configure store-specific credentials and settings

**FR-PAY-013:** Plugin configuration must be validated:

- Plugins validate configuration when enabled or updated
- Invalid configuration prevents plugin from being enabled
- Configuration validation includes credential validation (when applicable)
- Configuration errors are reported to System/Store Admins

---

### 3.3 Credit Recharge Payment Flow

#### 3.3.1 Credit Recharge Order Creation (點數儲值)

**FR-PAY-009:** The system must support credit recharge payments:

**Preconditions:**

- Store must have customer credit system enabled (`useCustomerCredit = true`)
- Customer must be signed in (authentication required)
- Credit exchange rate must be configured

**Recharge Order Creation:**

1. Customer navigates to credit recharge page
2. Customer enters credit amount (in credit points)
3. System validates credit amount against store limits:
   - Minimum purchase (`creditMinPurchase`)
   - Maximum purchase (`creditMaxPurchase`)
4. System calculates dollar amount: `dollarAmount = creditAmount * creditExchangeRate`
5. Customer selects payment method from available payment methods for the store
6. System creates `StoreOrder` for recharge with:
   - `orderStatus`: `Pending`
   - `paymentStatus`: `Pending`
   - `isPaid`: `false`
   - `paymentMethodId`: Selected payment method ID
   - `orderTotal`: Calculated dollar amount
   - `checkoutAttributes`: JSON string containing `rsvpId` (if provided) and `creditRecharge: true`
7. System creates or retrieves the special system product for credit recharge:
   - If the product doesn't exist for the store, create it with:
     - `storeId`: The store ID
     - `name`: "Credit Recharge" or similar descriptive name
     - `description`: Description of credit recharge product
     - `price`: 0 (price is determined by `creditExchangeRate` at time of purchase)
     - `currency`: Store's default currency
     - `status`: Active
     - `isFeatured`: false
   - If the product already exists, use the existing product ID
8. System creates `OrderItem` entry for the recharge:
   - `orderId`: The created StoreOrder ID
   - `productId`: System product ID for credit recharge (the special system product created/retrieved in step 7)
   - `productName`: "Credit Recharge" or similar descriptive name (e.g., "Credit Recharge: {creditAmount} points")
   - `quantity`: Number of credit points being purchased (the `creditAmount` entered by the customer)
   - `unitPrice`: Calculated dollar amount per credit point (i.e., `creditExchangeRate`)
   - `unitDiscount`: 0 (no discount for credit recharge)
   - `variants`: null (no product variants for credit recharge)
   - `variantCosts`: null

**FR-PAY-010:** Credit recharge orders can be linked to RSVP prepaid payments:

- If `rsvpId` is provided during recharge:
  - System stores `rsvpId` in order's `checkoutAttributes`
  - After successful payment, system attempts to process RSVP prepaid payment
  - If RSVP prepaid is processed, customer is redirected to reservation page

#### 3.3.2 Credit Recharge Payment Processing Flow

**FR-PAY-011:** After successful credit recharge payment:

1. System processes credit top-up:
   - Calculates credit amount from dollar amount
   - Applies bonus credits (if configured)
   - Updates customer credit balance
   - Creates `CustomerCreditLedger` entry for top-up
   - Creates `StoreLedger` entry for unearned revenue (type: `CreditRecharge`)

2. System marks order as paid:
   - Updates `StoreOrder`: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Completed`
   - Records payment fees (if applicable)

3. If `rsvpId` is present:
   - System checks if RSVP exists and is still pending
   - System attempts to process RSVP prepaid payment using customer credit
   - If successful, updates RSVP: `alreadyPaid = true`, `orderId = recharge order ID`
   - Redirects customer to reservation page

**FR-PAY-012:** Credit recharge must be idempotent:

- System checks for existing credit ledger entry with same `referenceId` (order ID)
- If credit already processed, only updates order status (if needed)
- Prevents duplicate credit top-ups

---

### 3.4 RSVP Prepaid Payment Flow

#### 3.4.1 RSVP Prepaid Payment Requirements

**FR-PAY-013:** The system must support prepaid payments for reservations:

**Preconditions:**

- RSVP settings must have `prepaidRequired = true`
- Customer must be signed in
- Store must have customer credit system enabled (for credit-based prepaid)

**Prepaid Payment Options:**

1. **Credit-based Prepaid (if `useCustomerCredit = true`)**:
   - Customer must have sufficient credit balance
   - Credit is deducted from customer balance
   - `StoreOrder` is created with credit payment method
   - RSVP is marked as `alreadyPaid = true` immediately

2. **External Payment Gateway Prepaid**:
   - Customer is redirected to payment page (Stripe or LINE Pay)
   - After successful payment, `StoreOrder` is created
   - RSVP is marked as `alreadyPaid = true`

**FR-PAY-014:** RSVP prepaid payment amount:

- Minimum prepaid amount is specified in `RsvpSettings.minPrepaidAmount`
- Amount can be specified as:
  - Dollar amount (currency value)
  - Credit points (if credit system enabled)
- If customer has insufficient credit, must recharge before completing prepaid payment

#### 3.4.2 RSVP Prepaid Payment Processing

**FR-PAY-015:** When processing RSVP prepaid payment with credit:

1. System checks customer credit balance
2. System calculates required credit amount:
   - If `minPrepaidAmount` is in dollars: Convert to credit using `creditExchangeRate`
   - If `minPrepaidAmount` is already in credit points: Use directly
3. If sufficient balance:
   - Creates `StoreOrder` with credit payment method
   - Deducts credit from customer balance
   - Creates `CustomerCreditLedger` entry for deduction
   - Updates RSVP: `alreadyPaid = true`, `orderId = order ID`, `status = ReadyToConfirm`
   - Creates `StoreLedger` entry for revenue
4. If insufficient balance:
   - System redirects customer to credit recharge page
   - `rsvpId` is passed to recharge flow for automatic processing after recharge

**FR-PAY-016:** RSVP prepaid payment after credit recharge:

- When credit recharge includes `rsvpId`:
  - After successful recharge, system checks if RSVP is still pending
  - System processes prepaid payment using newly added credit
  - Updates RSVP status accordingly
  - Redirects customer to reservation page

---

### 3.5 Subscription Payment Flow

#### 3.5.1 Subscription Payment Processing

**FR-PAY-017:** The system must support subscription payments:

- Subscription payments use Stripe for recurring billing
- Payment is processed via Stripe subscription management
- Subscription status is tracked separately from order payment status
- Failed subscription payments trigger subscription status updates

**FR-PAY-018:** Subscription payment flow:

1. Store subscribes to a subscription package
2. System creates Stripe subscription
3. Stripe handles recurring billing
4. System receives webhook notifications for subscription events
5. System updates subscription status based on payment success/failure

---

### 3.6 Fee Calculation

#### 3.6.1 Payment Gateway Fees

**FR-PAY-019:** The system must calculate payment gateway fees:

- Payment gateway fees are determined by payment method configuration
- Fee structure includes:
  - Fee rate (percentage)
  - Additional fee (flat amount)
  - Fee formula: `fee = (orderTotal * feeRate) + feeAdditional`
- Fee is recorded as negative amount in `StoreLedger`

**FR-PAY-020:** Payment gateway fee routing:

- If store uses platform gateway: Platform receives fees
- If store uses own gateway: Fees go to gateway provider, not platform

#### 3.6.2 Platform Fees

**FR-PAY-021:** The system must calculate platform fees:

- Platform fee is charged to Free-level stores only
- Platform fee rate: 1% of order total
- Platform fee is calculated: `platformFee = orderTotal * 0.01`
- Platform fee is recorded as negative amount in `StoreLedger`
- Pro-level stores are not charged platform fees

**FR-PAY-022:** Platform fee calculation for credit recharges:

- Platform fee applies to credit recharge orders for Free-level stores
- Fee is calculated on dollar amount of recharge
- Fee is recorded in `StoreLedger` entry for credit recharge

---

### 3.7 Payment Confirmation and Success Handling

#### 3.7.1 Payment Confirmation Pages

**FR-PAY-023:** The system must provide payment confirmation pages:

**Payment Confirmation Flow:**

- After payment gateway redirects customer back, customer is redirected to confirmation page
- Confirmation page delegates to payment method plugin for verification:
  - Plugin verifies payment status via its payment gateway API
  - Plugin returns payment confirmation result
  - System processes payment completion (updates order, processes credit top-up if applicable)
  - Redirects to success page

**Plugin-specific Confirmation Examples:**

- **Stripe Plugin**: Verifies `PaymentIntent` status with Stripe API
- **LINE Pay Plugin**: Verifies transaction status with LINE Pay API
- **Credit Plugin**: Verifies credit deduction was successful (immediate confirmation)
- **Cash/In-Person Plugin**:
  - Option 1: Marked as paid immediately upon order creation (for trusted scenarios)
  - Option 2: Requires manual confirmation by store staff (via admin interface)
  - Store staff can mark cash orders as paid after receiving payment
  - No external API verification required

**FR-PAY-024:** Payment confirmation must be secure:

- Payment intent/transaction must be verified via payment gateway API
- Payment status must be confirmed before processing order completion
- Invalid or failed payments must not mark orders as paid

#### 3.7.2 Payment Success Pages

**FR-PAY-025:** The system must provide success pages for different payment types:

**Order Payment Success:**

- Displays order confirmation
- Shows order details (order number, amount, items)
- Provides navigation options (back to store, view order history)

**Credit Recharge Success:**

- Displays recharge confirmation
- Shows credit amount added and new balance
- If linked to RSVP, redirects to reservation page automatically
- Provides navigation options (back to store, view credit balance)

**FR-PAY-026:** Success page redirects must handle RSVP prepaid flow:

- If credit recharge was for RSVP prepaid payment:
  - System checks if RSVP prepaid was successfully processed
  - If RSVP is now paid, redirects customer to reservation page
  - Otherwise, shows success page with navigation options

---

### 3.8 Payment Status Tracking

#### 3.8.1 Order Payment Status

**FR-PAY-027:** The system must track payment status for all orders:

- `paymentStatus` field in `StoreOrder`:
  - `Pending`: Payment not yet initiated or in progress
  - `Paid`: Payment completed successfully
  - `Failed`: Payment failed
  - `Refunded`: Payment was refunded

- `isPaid` boolean flag: Indicates if payment has been received
- `paidDate`: Timestamp when payment was completed

**FR-PAY-028:** Payment status updates must be synchronized:

- Order status and payment status must be updated atomically
- Payment confirmation must verify payment before updating status
- Failed payments must not update order or payment status

#### 3.8.2 Payment Error Handling

**FR-PAY-029:** The system must handle payment errors gracefully:

- Payment gateway errors must be logged with full context
- Customer-facing error messages must be user-friendly
- Payment failures must not create duplicate orders or charges
- Partial payment states must be prevented

**FR-PAY-030:** Payment retry must be supported:

- Customers must be able to retry failed payments
- Payment retry must use same order ID
- Payment retry must not create duplicate orders or charges

---

### 3.9 Store Ledger Integration

#### 3.9.1 Revenue Recognition

**FR-PAY-031:** The system must create `StoreLedger` entries for all payments:

- Regular order payments: Create ledger entry with order amount
- Credit recharges: Create ledger entry as unearned revenue (type: `CreditRecharge`)
- RSVP prepaid payments: Create ledger entry with prepaid amount
- Ledger entries must include:
  - Order reference (`orderId`)
  - Amount (positive for revenue, negative for fees)
  - Currency
  - Fees (payment gateway fees, platform fees)
  - Balance (running balance after transaction)
  - Availability date (for revenue recognition timing)

**FR-PAY-032:** Store ledger balance calculation:

- Each ledger entry updates store balance
- Balance = previous balance + amount + fees + platform fees
- Balance must be calculated atomically within transaction

---

## 4. Use Cases

### 4.1 Use Case: Regular Order Payment with Stripe

**UC-PAY-001:** Customer completes order payment using Stripe

**Preconditions:**

- Customer has items in cart
- Customer has selected Stripe as payment method
- Store has Stripe configured (store-level or platform-level)

**Main Flow:**

1. Customer completes checkout form
2. Customer submits order
3. System creates `StoreOrder` with `paymentStatus = Pending`
4. System redirects customer to Stripe payment page
5. Customer enters payment details and confirms payment on Stripe
6. Stripe processes payment and redirects to confirmation page
7. System verifies payment via Stripe API
8. System updates order: `isPaid = true`, `paymentStatus = Paid`, `orderStatus = Confirmed`
9. System creates `StoreLedger` entry for revenue
10. System calculates and records fees
11. Customer is redirected to success page

**Alternative Flows:**

- **4a. Payment fails:**
  - Stripe returns error
  - System logs error
  - Customer sees error message
  - Order remains in `Pending` status
  - Customer can retry payment

### 4.2 Use Case: Credit Recharge with RSVP Prepaid

**UC-PAY-002:** Customer recharges credit to complete RSVP prepaid payment

**Preconditions:**

- Customer created RSVP with prepaid required
- Customer has insufficient credit balance
- Customer is signed in

**Main Flow:**

1. Customer is redirected to credit recharge page with `rsvpId` parameter
2. Customer enters credit amount to recharge
3. System validates amount against store limits
4. System creates recharge order with `rsvpId` in `checkoutAttributes`
5. Customer is redirected to Stripe payment page
6. Customer completes payment
7. System processes credit top-up after payment confirmation
8. System checks for `rsvpId` in order's `checkoutAttributes`
9. System processes RSVP prepaid payment using newly added credit
10. System updates RSVP: `alreadyPaid = true`, `status = ReadyToConfirm`
11. Customer is redirected to reservation page

**Alternative Flows:**

- **2a. Insufficient amount entered:**
  - System validates amount is less than minimum
  - System shows error message
  - Customer must enter valid amount

- **6a. Payment fails:**
  - Payment fails on Stripe
  - Order remains unpaid
  - Customer can retry payment

### 4.3 Use Case: Cash/In-Person Order Payment

**UC-PAY-003:** Customer places order with cash/in-person payment method

**Preconditions:**

- Customer has items in cart
- Customer has selected Cash/In-Person as payment method
- Store has Cash/In-Person payment method enabled

**Main Flow:**

1. Customer completes checkout form and selects Cash/In-Person payment
2. Customer submits order
3. System creates `StoreOrder` with:
   - `paymentMethodId`: Cash/In-Person payment method ID
   - `paymentStatus`: `Pending` (or `Paid` if configured for immediate confirmation)
   - `orderStatus`: `Pending`
   - `isPaid`: `false` (or `true` if immediate confirmation mode)
4. Order is created and customer receives order confirmation
5. **If manual confirmation mode:**
   - Store staff receives order notification
   - Customer pays in cash when picking up order or on delivery
   - Store staff marks order as paid via admin interface
   - System updates order: `isPaid = true`, `paymentStatus = Paid`, `paidDate = current timestamp`
   - System creates `StoreLedger` entry with zero fees
6. **If immediate confirmation mode:**
   - Order is marked as paid immediately
   - System creates `StoreLedger` entry with zero fees
   - Customer receives payment confirmation

**Alternative Flows:**

- **5a. Store staff marks order as paid:**
  - Store staff confirms cash payment received
  - System updates order status and creates ledger entry
  - No fees are charged for cash payments

---

## 5. Business Rules

### 5.1 Payment Processing Rules

**BR-PAY-001:** Payment processing must be idempotent:

- Multiple payment confirmations for same order must not create duplicate charges
- Payment status checks must prevent duplicate processing
- Credit top-ups must check for existing ledger entries

**BR-PAY-002:** Payment method plugin configuration routing rules:

- Configuration priority: Store-level > Platform-level > Plugin defaults
- Free-level stores: May be restricted to platform-level configuration only
- Pro-level stores: Can configure store-specific settings (if plugin supports it)
- Platform fees apply to Free-level stores only

**BR-PAY-003:** Plugin-specific payment rules:

- Each plugin implements its own payment rules and requirements
- **Credit Plugin**: Requires signed-in customer, sufficient balance, atomic credit deduction
- **Stripe Plugin**: Requires valid credentials (store or platform level)
- **LINE Pay Plugin**: Requires valid credentials (store or platform level)
- **Cash/In-Person Plugin**:
  - No external payment gateway required
  - No processing fees
  - Payment confirmation can be immediate or manual (by store staff)
  - Suitable for in-store, pickup, or delivery scenarios
- Other plugins: Implement their own rules

### 5.2 Fee Calculation Rules

**BR-PAY-004:** Fee calculation order:

1. Calculate payment gateway fee (if applicable)
2. Calculate platform fee (if applicable - Free stores only)
3. Calculate fee tax (5% of gateway fee)
4. Record all fees as negative amounts in ledger

**BR-PAY-005:** Fee routing rules:

- Payment gateway fees go to gateway provider (via plugin)
- Platform fees go to platform (only for Free-level stores)
- Fee tax is always 5% of gateway fee
- Plugins provide fee structure through `calculateFees()` method

---

## 6. Integration Points

### 6.1 Payment Method Plugin Interface

**INT-PAY-001:** Payment method plugins must implement a standard interface:

**Core Interface Methods:**

- `processPayment(order: Order, config: PluginConfig): PaymentResult`
  - Initiates payment processing
  - Returns payment initiation result (redirect URL, internal processing status, etc.)
  
- `confirmPayment(orderId: string, paymentData: PaymentData, config: PluginConfig): PaymentConfirmation`
  - Confirms payment after customer completes payment flow
  - Verifies payment status with payment gateway
  - Returns confirmation result (success, failed, status details)

- `verifyPaymentStatus(orderId: string, paymentData: PaymentData, config: PluginConfig): PaymentStatus`
  - Verifies current payment status
  - Can be called to check payment status at any time
  - Returns current payment status

- `calculateFees(amount: number, config: PluginConfig): FeeStructure`
  - Calculates fees for payment amount
  - Returns fee structure (rate, additional fees, total fees)

- `validateConfiguration(config: PluginConfig): ValidationResult`
  - Validates plugin configuration
  - Returns validation result (valid, errors)

- `checkAvailability(order: Order, config: PluginConfig): AvailabilityResult`
  - Checks if payment method is available for order
  - Returns availability status and reason if unavailable

**Plugin Configuration Schema:**

- Each plugin defines its configuration schema
- Schema includes required/optional fields, field types, validation rules
- Configuration is validated against schema before being saved

**Plugin Metadata:**

- Plugin identifier (unique, immutable)
- Display name and description
- Version information
- Required system capabilities
- Supported currencies
- Supported payment types (one-time, recurring, etc.)

### 6.2 Built-in Payment Method Plugins

**INT-PAY-002:** Stripe Plugin Integration:

- Payment Intent creation
- Payment Intent confirmation
- Payment status verification
- Customer management (optional)
- Subscription management (for store subscriptions)
- Implements standard payment method plugin interface

**INT-PAY-003:** LINE Pay Plugin Integration:

- Payment request creation
- Transaction confirmation
- Transaction status verification
- Refund processing (if supported)
- Implements standard payment method plugin interface

**INT-PAY-004:** Credit-based Payment Plugin Integration:

- Credit balance checking
- Credit deduction processing
- Credit ledger entry creation
- Payment confirmation (immediate)
- Implements standard payment method plugin interface

**INT-PAY-005:** Cash/In-Person Payment Plugin Integration:

- **Payment Processing**:
  - No external payment gateway integration required
  - Orders created with cash payment method have `paymentStatus = Pending` (or `Paid` if configured for immediate confirmation)
  - Payment confirmation can be immediate or require manual store staff confirmation

- **Manual Payment Confirmation**:
  - Store staff can mark cash orders as paid via admin interface
  - Confirmation updates order: `isPaid = true`, `paymentStatus = Paid`, `paidDate = current timestamp`
  - Creates `StoreLedger` entry with zero fees

- **Fee Structure**:
  - No payment gateway fees (fee = 0)
  - No platform fees (platformFee = 0)
  - Total fees = 0

- **Use Cases**:
  - In-store transactions (customer pays at store)
  - Order pickup (customer pays when picking up order)
  - Delivery (customer pays on delivery)
  - Store operator credit recharges (cash payment for credit top-up)

- **Configuration**:
  - Can be enabled/disabled by Store Admins
  - Supports immediate payment confirmation or manual confirmation mode
  - No credentials or external API keys required

- Implements standard payment method plugin interface

### 6.3 Internal System Integration

**INT-PAY-006:** Order System Integration:

- Order creation triggers payment flow
- Payment completion updates order status
- Order cancellation triggers refund flow (if applicable)

**INT-PAY-007:** Credit System Integration:

- Credit recharge payments update customer credit balance
- RSVP prepaid payments deduct customer credit
- Credit ledger entries reference order IDs

**INT-PAY-008:** Store Ledger Integration:

- All payments create store ledger entries
- Ledger entries track revenue, fees, and balance
- Ledger entries support revenue recognition timing

**INT-PAY-009:** RSVP System Integration:

- RSVP prepaid payments link orders to reservations
- Credit recharge can automatically process RSVP prepaid
- RSVP status updates based on payment completion

---

## 7. Security Requirements

### 7.1 Payment Security

**SEC-PAY-001:** Payment data security:

- Payment gateway credentials must be stored securely
- Payment API keys must not be exposed to client-side code
- Payment intent/transaction IDs must be verified server-side
- Payment confirmations must be validated via payment gateway API

**SEC-PAY-002:** Payment processing security:

- Payment processing must occur server-side only
- Payment status verification must be performed before order updates
- Payment amounts must be validated server-side
- Payment retry must use same order to prevent duplicate charges

---

## 8. Non-Functional Requirements

### 8.1 Performance

**NFR-PAY-001:** Payment processing performance:

- Payment confirmation should complete within 5 seconds
- Payment status verification should complete within 3 seconds
- Credit top-up processing should complete within 2 seconds

### 8.2 Reliability

**NFR-PAY-002:** Payment system reliability:

- Payment processing must be transactional (all-or-nothing)
- Payment failures must not leave orders in inconsistent states
- Payment retry mechanisms must prevent duplicate charges
- Payment webhooks must be idempotent

### 8.3 Usability

**NFR-PAY-003:** Payment user experience:

- Payment flow should be clear and intuitive
- Payment errors should provide actionable error messages
- Payment success should provide clear confirmation
- Payment progress should be visible to customers

---

## 9. Glossary

- **Payment Method Plugin**: Installable component that implements a payment method (e.g., Stripe, LINE Pay, Credit, Cash/In-Person)
- **Plugin Interface**: Standard API that payment method plugins must implement
- **Payment Method Plugin**: Installable component that implements a payment method (e.g., Stripe, LINE Pay, Credit, Cash/In-Person)
- **Plugin Interface**: Standard API that payment method plugins must implement
- **Payment Gateway**: Third-party service that processes payments (Stripe, LINE Pay)
- **Payment Intent**: Stripe's object representing a customer's intent to pay
- **Platform Configuration**: Payment method configuration at platform level (shared by stores)
- **Store Configuration**: Payment method configuration at store level (store-specific)
- **Cash/In-Person Payment**: Payment method for cash transactions at store location, pickup, or delivery
- **Credit Recharge**: Process of adding credit to customer's credit balance
- **RSVP Prepaid**: Prepayment required for reservation deposits
- **Store Ledger**: System for tracking store revenue, fees, and balance
- **Payment Status**: Status of payment processing (Pending, Paid, Failed, Refunded)
- **Order Status**: Status of order fulfillment (Pending, Confirmed, Processing, Completed)

---

## 10. Appendix

### 10.1 Payment Method Plugin Configuration

Payment method plugins are registered in the system and configured at multiple levels:

**Plugin Registration:**

- Plugin identifier: Unique identifier for the plugin (e.g., "stripe", "linepay", "credit", "cash")
- Plugin metadata: Name, description, version, capabilities
- Plugin implementation: Implements payment method plugin interface

**Payment Method Configuration (Platform Level):**

- Default credentials and settings for each plugin
- Default fee structure (rate, additional fees)
- Platform-level configuration stored in system settings

**Payment Method Configuration (Store Level):**

Payment methods are configured in the `PaymentMethod` table:

- `id`: Payment method identifier (references plugin)
- `name`: Display name
- `payUrl`: Payment URL identifier (plugin identifier: "stripe", "linepay", "credit", "cash")
- `fee`: Fee rate (percentage) - can override plugin default
- `feeAdditional`: Additional fee (flat amount) - can override plugin default
- `isDeleted`: Soft delete flag
- Plugin-specific configuration stored in plugin configuration table/schema

**Plugin Configuration Storage:**

- Platform-level configuration: System-wide settings for each installed plugin
- Store-level configuration: Store-specific overrides stored per store per plugin
- Configuration includes credentials, settings, fee overrides

### 10.2 Payment Status Values

Payment status values (from `PaymentStatus` enum):

- `Pending`: Payment not yet initiated
- `Paid`: Payment completed successfully
- `Failed`: Payment failed
- `Refunded`: Payment was refunded

### 10.3 Store Ledger Types

Store ledger entry types (from `StoreLedgerType` enum):

- `Order`: Regular order payment
- `CreditRecharge`: Credit recharge payment (unearned revenue)
- Other types as defined in the system

---

**Document End**
