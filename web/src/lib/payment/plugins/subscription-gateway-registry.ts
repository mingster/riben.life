import type Stripe from "stripe";
import { stripePlugin } from "./stripe-plugin";
import { SubscriptionBillingNotSupportedError } from "./subscription-billing-error";
import type {
	CreateCheckoutPaymentIntentInput,
	CreateIncompleteStripeStoreSubscriptionParams,
	CreateIncompleteStripeStoreSubscriptionResult,
	CreateStripeStoreSubscriptionParams,
	SubscriptionBillingPlugin,
	SubscriptionPaymentMethodResolution,
} from "./subscription-billing-types";

const DEFAULT_PLATFORM_SUBSCRIPTION_BILLING_GATEWAY = "stripe";

class UnsupportedSubscriptionBillingPlugin
	implements SubscriptionBillingPlugin
{
	readonly subscriptionBillingGatewayId: string;

	constructor(gatewayId: string) {
		this.subscriptionBillingGatewayId = gatewayId;
	}

	createCheckoutPaymentIntent(
		_input: CreateCheckoutPaymentIntentInput,
	): Promise<Stripe.PaymentIntent> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	async handlePlatformBillingWebhook(_event: Stripe.Event): Promise<void> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	retrievePaymentIntent(
		_paymentIntentId: string,
		_clientSecret: string,
	): Promise<Stripe.PaymentIntent> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	resolveDefaultPaymentMethodForSubscription(
		_customerId: string,
		_paymentIntent: Stripe.PaymentIntent,
	): Promise<SubscriptionPaymentMethodResolution> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	createStoreBillingSubscription(
		_params: CreateStripeStoreSubscriptionParams,
	): Promise<Stripe.Subscription> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	createIncompleteStoreBillingSubscription(
		_params: CreateIncompleteStripeStoreSubscriptionParams,
		_options?: { idempotencyKey?: string },
	): Promise<CreateIncompleteStripeStoreSubscriptionResult> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}

	getSubscriptionInvoiceCheckoutSecrets(
		_subscriptionId: string,
	): Promise<CreateIncompleteStripeStoreSubscriptionResult> {
		throw new SubscriptionBillingNotSupportedError(
			this.subscriptionBillingGatewayId,
		);
	}
}

/** Stripe implements subscription billing on the plugin singleton. */
const stripeSubscriptionBillingAdapter: SubscriptionBillingPlugin =
	stripePlugin;

const subscriptionBillingRegistry = new Map<string, SubscriptionBillingPlugin>([
	["stripe", stripeSubscriptionBillingAdapter],
	["linepay", new UnsupportedSubscriptionBillingPlugin("linepay")],
	["paypal", new UnsupportedSubscriptionBillingPlugin("paypal")],
	["credit", new UnsupportedSubscriptionBillingPlugin("credit")],
	["cash", new UnsupportedSubscriptionBillingPlugin("cash")],
]);

/**
 * Resolves the platform subscription billing gateway (store admin subscriptions).
 * Override with `PLATFORM_SUBSCRIPTION_BILLING_GATEWAY` (default `stripe`).
 */
export function getPlatformSubscriptionBillingGateway(): SubscriptionBillingPlugin {
	const raw =
		process.env.PLATFORM_SUBSCRIPTION_BILLING_GATEWAY?.trim().toLowerCase() ||
		DEFAULT_PLATFORM_SUBSCRIPTION_BILLING_GATEWAY;
	const plugin = subscriptionBillingRegistry.get(raw);
	if (!plugin) {
		throw new Error(
			`Unknown PLATFORM_SUBSCRIPTION_BILLING_GATEWAY "${raw}". Expected one of: ${Array.from(subscriptionBillingRegistry.keys()).join(", ")}`,
		);
	}
	return plugin;
}

/**
 * Lookup subscription billing by gateway id (e.g. for tests or explicit routing).
 */
export function getSubscriptionBillingPlugin(
	gatewayId: string,
): SubscriptionBillingPlugin | undefined {
	return subscriptionBillingRegistry.get(gatewayId.trim().toLowerCase());
}
