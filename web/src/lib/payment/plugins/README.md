# Payment Method Plugins

This directory contains the implementation of the Payment Method Plugin system as defined in the [Payment System Technical Requirements](../../../../doc/PAYMENT/TECHNICAL-REQUIREMENTS-PAYMENT.md).

## Overview

The payment system uses a plugin-based architecture where each payment method is implemented as a plugin that implements the `PaymentMethodPlugin` interface. This allows for:

- Dynamic payment method registration
- Consistent payment processing interface
- Easy addition of new payment methods
- Isolated payment method logic

## Plugin Interface

All payment method plugins must implement the `PaymentMethodPlugin` interface defined in `types.ts`:

```typescript
interface PaymentMethodPlugin {
  // Plugin metadata
  readonly identifier: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  // Core payment methods
  processPayment(order: StoreOrder, config: PluginConfig): Promise<PaymentResult>;
  confirmPayment(orderId: string, paymentData: PaymentData, config: PluginConfig): Promise<PaymentConfirmation>;
  verifyPaymentStatus(orderId: string, paymentData: PaymentData, config: PluginConfig): Promise<PaymentStatus>;

  // Fee calculation
  calculateFees(amount: number, config: PluginConfig): FeeStructure;

  // Configuration
  validateConfiguration(config: PluginConfig): ValidationResult;

  // Availability check
  checkAvailability(order: StoreOrder, config: PluginConfig): AvailabilityResult | Promise<AvailabilityResult>;
}
```

## Built-in Plugins

The system includes the following built-in payment method plugins:

### 1. Stripe Plugin (`stripe`)

- **Identifier:** `stripe`
- **Description:** Credit/debit card payments via Stripe payment gateway
- **Features:**
  - Payment intent creation
  - Payment confirmation via Stripe API
  - Payment status verification
  - Fee calculation (default: 2.9% + 30¢)

### 2. LINE Pay Plugin (`linepay`)

- **Identifier:** `linepay`
- **Description:** Payments via LINE Pay service
- **Features:**
  - Payment request creation
  - Transaction confirmation
  - Payment status verification
  - Fee calculation (default: 3.0%)

### 3. Credit Plugin (`credit`)

- **Identifier:** `credit`
- **Description:** Payments using customer credit balance (儲值點數)
- **Features:**
  - Credit balance checking
  - Credit deduction processing
  - Immediate payment confirmation
  - Zero fees

### 4. Cash/In-Person Plugin (`cash`)

- **Identifier:** `cash`
- **Description:** Cash or in-person payments at store location (現金)
- **Features:**
  - Immediate or manual payment confirmation
  - Manual confirmation by store staff
  - Zero fees

## Usage

### Registering a Plugin

Plugins are automatically registered when the module is imported:

```typescript
import "@/lib/payment/plugins"; // Registers all built-in plugins
```

Or register a custom plugin:

```typescript
import { registerPaymentPlugin } from "@/lib/payment/plugins";

class MyCustomPlugin implements PaymentMethodPlugin {
  // ... implement interface
}

registerPaymentPlugin(new MyCustomPlugin());
```

### Getting a Plugin

```typescript
import { getPaymentPlugin } from "@/lib/payment/plugins";

const plugin = getPaymentPlugin("stripe");
if (plugin) {
  // Use plugin
}
```

### Using a Plugin for Payment Processing

```typescript
import { getPaymentPlugin } from "@/lib/payment/plugins";
import type { StoreOrder } from "@prisma/client";

const plugin = getPaymentPlugin(order.PaymentMethod?.payUrl || "");
if (!plugin) {
  throw new Error("Payment method plugin not found");
}

const config: PluginConfig = {
  storeId: order.storeId,
  platformConfig: {}, // Platform-level configuration
  storeConfig: {},    // Store-level configuration
};

// Process payment
const result = await plugin.processPayment(order, config);

if (result.success && result.redirectUrl) {
  // Redirect to payment gateway
  redirect(result.redirectUrl);
}

// Confirm payment (after redirect)
const confirmation = await plugin.confirmPayment(
  orderId,
  result.paymentData || {},
  config
);

// Calculate fees
const feeStructure = plugin.calculateFees(Number(order.orderTotal), config);
const totalFee = feeStructure.calculateFee(Number(order.orderTotal));
```

## Plugin Configuration

Plugins support multi-level configuration:

### Platform-level Configuration

Configuration shared across all stores (e.g., default API credentials):

```typescript
const config: PluginConfig = {
  storeId: "store-123",
  platformConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    feeRate: 0.029,
    feeAdditional: 0.3,
  },
};
```

### Store-level Configuration

Store-specific configuration that overrides platform defaults:

```typescript
const config: PluginConfig = {
  storeId: "store-123",
  platformConfig: {
    feeRate: 0.029, // Platform default
  },
  storeConfig: {
    feeRate: 0.025, // Store-specific override
    immediateConfirmation: true, // For cash payments
  },
};
```

## Plugin Registration

Plugins are registered in the system via the `PaymentMethod` database table:

- `payUrl` field stores the plugin identifier (e.g., `"stripe"`, `"linepay"`, `"credit"`, `"cash"`)
- Plugins are automatically registered when the module is loaded
- Custom plugins can be registered programmatically

## Adding a New Payment Method Plugin

To add a new payment method plugin:

1. Create a new plugin class implementing `PaymentMethodPlugin`:

```typescript
import type { PaymentMethodPlugin, ... } from "./types";

export class MyPaymentPlugin implements PaymentMethodPlugin {
  readonly identifier = "mypayment";
  readonly name = "My Payment";
  readonly description = "My custom payment method";
  readonly version = "1.0.0";

  // Implement all required methods...
}
```

2. Register the plugin:

```typescript
import { registerPaymentPlugin } from "./registry";
import { MyPaymentPlugin } from "./my-payment-plugin";

registerPaymentPlugin(new MyPaymentPlugin());
```

3. Add the payment method to the database:

```sql
INSERT INTO "PaymentMethod" (id, name, payUrl, ...)
VALUES (..., 'My Payment', 'mypayment', ...);
```

## Testing

Plugins can be tested independently:

```typescript
import { stripePlugin } from "./stripe-plugin";

const config: PluginConfig = {
  storeId: "test-store",
  platformConfig: {},
  storeConfig: {},
};

// Test fee calculation
const fees = stripePlugin.calculateFees(100, config);
expect(fees.calculateFee(100)).toBe(3.2); // 100 * 0.029 + 0.3

// Test configuration validation
const validation = stripePlugin.validateConfiguration(config);
expect(validation.valid).toBe(true);
```

## Future Enhancements

- Dynamic plugin loading from external packages
- Plugin marketplace/installation system
- Plugin configuration UI for System Admins
- Plugin-specific webhook handlers
- Plugin analytics and reporting

