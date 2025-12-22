/**
 * Payment Method Plugins
 *
 * This module exports all payment method plugins and registers them with the plugin registry.
 */

// Export types and registry
export * from "./types";
export * from "./registry";
export {
	getPaymentPlugin,
	registerPaymentPlugin,
} from "./registry";

// Export plugin implementations
export { StripePlugin, stripePlugin } from "./stripe-plugin";
export { LinePayPlugin, linePayPlugin } from "./linepay-plugin";
export { CreditPlugin, creditPlugin } from "./credit-plugin";
export { CashPlugin, cashPlugin } from "./cash-plugin";

// Export utilities and loader functions
export * from "./utils";
export * from "./loader";

// Register all built-in plugins
import { registerPaymentPlugin } from "./registry";
import { stripePlugin } from "./stripe-plugin";
import { linePayPlugin } from "./linepay-plugin";
import { creditPlugin } from "./credit-plugin";
import { cashPlugin } from "./cash-plugin";

// Register plugins on module load
registerPaymentPlugin(stripePlugin);
registerPaymentPlugin(linePayPlugin);
registerPaymentPlugin(creditPlugin);
registerPaymentPlugin(cashPlugin);
