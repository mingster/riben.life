# Payment Method Plugin Registration

This document explains how payment method plugins are registered and synchronized with database records, as specified in section 4.3 of the Technical Requirements.

## Overview

Plugins are registered in the system via `PaymentMethod` database table records:

- **`payUrl` field** stores the plugin identifier (e.g., `"stripe"`, `"linepay"`, `"credit"`, `"cash"`)
- **Plugin instances** are registered in memory via the plugin registry
- **Database records** reference plugins by their identifier in the `payUrl` field

## Registration Flow

### 1. Plugin Implementation

Plugins are implemented as classes that implement the `PaymentMethodPlugin` interface:

```typescript
export class StripePlugin implements PaymentMethodPlugin {
  readonly identifier = "stripe";
  // ... implementation
}
```

### 2. Plugin Registration

Plugins are registered when the module is loaded:

```typescript
// In index.ts
registerPaymentPlugin(stripePlugin);
registerPaymentPlugin(linePayPlugin);
registerPaymentPlugin(creditPlugin);
registerPaymentPlugin(cashPlugin);
```

### 3. Database Records

Payment method records in the database reference plugins via `payUrl`:

```sql
INSERT INTO "PaymentMethod" (id, name, payUrl, ...)
VALUES (..., 'Stripe', 'stripe', ...);
```

The `payUrl` field must match the plugin's `identifier` property.

## Utility Functions

### Getting Plugins from Database Records

```typescript
import { getPluginFromPaymentMethod } from "@/lib/payment/plugins";

const paymentMethod = await sqlClient.paymentMethod.findUnique({
  where: { id: paymentMethodId },
});

const plugin = getPluginFromPaymentMethod(paymentMethod);
if (plugin) {
  // Use plugin
}
```

### Getting Plugin and Config from Order

```typescript
import { getPluginAndConfigFromOrder } from "@/lib/payment/plugins";

const order = await sqlClient.storeOrder.findUnique({
  where: { id: orderId },
  include: { PaymentMethod: true },
});

const result = await getPluginAndConfigFromOrder(order);
if (result) {
  const { plugin, config } = result;
  // Use plugin and config
}
```

### Building Plugin Configuration

```typescript
import { buildPluginConfig } from "@/lib/payment/plugins";

const config = await buildPluginConfig(
  storeId,
  paymentMethod,
  storePaymentMethodMapping
);
```

## Configuration Levels

### Platform-Level Configuration

Platform-level configuration provides defaults shared across all stores:

- Default fee rates
- Default API credentials
- Platform-wide settings

**Future Enhancement:** Stored in a `PlatformPaymentMethodConfig` table (not yet implemented).

### Store-Level Configuration

Store-level configuration overrides platform defaults:

- Store-specific API credentials (for Pro stores)
- Store-specific fee rates (if plugin allows)
- Store-specific settings

Currently accessed via:
- `StorePaymentMethodMapping` table (for display names)
- `PaymentMethod` table (for default fees)
- Store-specific fields (e.g., `Store.LINE_PAY_ID`)

**Future Enhancement:** Stored in a `StorePaymentMethodConfig` table (not yet implemented).

## Validation

### Validate Payment Methods Have Plugins

```typescript
import { validatePaymentMethodPlugins } from "@/lib/payment/plugins/loader";

const missingPlugins = await validatePaymentMethodPlugins();
// Returns array of PaymentMethod records without registered plugins
```

### Synchronize Plugins with Database

```typescript
import { synchronizePluginsWithDatabase } from "@/lib/payment/plugins/loader";

const summary = await synchronizePluginsWithDatabase();
// Returns summary of synchronization results
```

## Plugin Identifiers

The following plugin identifiers are currently supported:

- `"stripe"` - Stripe payment gateway
- `"linepay"` - LINE Pay service
- `"credit"` - Credit-based payment
- `"cash"` - Cash/in-person payment

## Adding a New Payment Method

To add a new payment method:

1. **Implement the plugin:**
   ```typescript
   export class MyPaymentPlugin implements PaymentMethodPlugin {
     readonly identifier = "mypayment";
     // ... implementation
   }
   ```

2. **Register the plugin:**
   ```typescript
   registerPaymentPlugin(new MyPaymentPlugin());
   ```

3. **Add database record:**
   ```sql
   INSERT INTO "PaymentMethod" (id, name, payUrl, ...)
   VALUES (..., 'My Payment', 'mypayment', ...);
   ```

4. **Ensure `payUrl` matches plugin identifier:**
   - The `payUrl` field in the database must exactly match the plugin's `identifier` property
   - This is how the system maps database records to plugin instances

## Future Enhancements

1. **Platform-Level Configuration Table:**
   - Store platform defaults in `PlatformPaymentMethodConfig` table
   - Centralized configuration management

2. **Store-Level Configuration Table:**
   - Store-specific overrides in `StorePaymentMethodConfig` table
   - Per-store API credentials and settings

3. **Plugin Marketplace:**
   - Dynamic plugin installation
   - Plugin versioning and updates
   - Plugin dependency management

4. **Plugin Validation:**
   - Validate plugin implementations at startup
   - Check for missing plugins when creating/updating payment methods
   - Warning system for orphaned payment methods

