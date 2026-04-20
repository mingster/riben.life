/**
 * Payment Method Plugins
 *
 * This module exports all payment method plugins and registers them with the plugin registry.
 */

export { CashPlugin, cashPlugin } from "./cash-plugin";
export { CreditPlugin, creditPlugin } from "./credit-plugin";
export { LinePayPlugin, linePayPlugin } from "./linepay-plugin";
export * from "./loader";
export { PayPalPlugin, payPalPlugin } from "./paypal-plugin";
export * from "./registry";
export {
	getPaymentPlugin,
	registerPaymentPlugin,
} from "./registry";
// Export plugin implementations
export { StripePlugin, stripePlugin } from "./stripe-plugin";
export { SubscriptionBillingNotSupportedError } from "./subscription-billing-error";
export type {
	CreateCheckoutPaymentIntentInput,
	CreateStripeStoreSubscriptionParams,
	SubscriptionBillingPlugin,
	SubscriptionPaymentMethodResolution,
} from "./subscription-billing-types";
export {
	getPlatformSubscriptionBillingGateway,
	getSubscriptionBillingPlugin,
} from "./subscription-gateway-registry";
// Export types and registry
export * from "./types";
// Export utilities and loader functions
export * from "./utils";
export * from "./webhook-registry";
export * from "./webhook-types";

import { cashPlugin } from "./cash-plugin";
import { creditPlugin } from "./credit-plugin";
import { linePayPlugin } from "./linepay-plugin";
import { payPalPlugin } from "./paypal-plugin";
// Register all built-in plugins
import { registerPaymentPlugin } from "./registry";
import { stripePlugin } from "./stripe-plugin";

// Register plugins on module load
registerPaymentPlugin(stripePlugin);
registerPaymentPlugin(linePayPlugin);
registerPaymentPlugin(payPalPlugin);
registerPaymentPlugin(creditPlugin);
registerPaymentPlugin(cashPlugin);
