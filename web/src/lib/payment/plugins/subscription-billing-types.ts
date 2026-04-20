import type Stripe from "stripe";

/**
 * Internal minor: integer = major × 100 (NT$330 → 33000; USD $99.99 → 9999).
 * Same as `POST /api/payment/stripe/create-payment-intent` body field `total`.
 */
export interface CreateCheckoutPaymentIntentInput {
	amountInternalMinor: number;
	currency: string;
	customerId?: string;
	metadata: Record<string, string>;
	/**
	 * Maps to Stripe `setup_future_usage` on the PaymentIntent.
	 * Must be `"off_session"` or `"on_session"` — Stripe does not accept a boolean.
	 * Use `"off_session"` for saved cards / subscription renewals when the customer may not be present.
	 */
	setupFutureUsage?: "off_session" | "on_session";
}

/** Result of resolving default payment method after a successful PaymentIntent (Stripe only). */
export interface SubscriptionPaymentMethodResolution {
	attachedPaymentMethodId: string | undefined;
}

/** Inputs for creating the Stripe Subscription after PI success (no Prisma). */
export interface CreateStripeStoreSubscriptionParams {
	customerId: string;
	stripePriceId: string;
	subscriptionPaymentId: string;
	storeId: string;
	defaultPaymentMethodId?: string;
}

/** Create an incomplete subscription so the first invoice PaymentIntent is paid once via Elements. */
export interface CreateIncompleteStripeStoreSubscriptionParams {
	customerId: string;
	stripePriceId: string;
	subscriptionPaymentId: string;
	storeId: string;
}

export interface CreateIncompleteStripeStoreSubscriptionResult {
	subscription: Stripe.Subscription;
	clientSecret: string;
	paymentIntentId: string;
	invoiceId: string;
}

/**
 * Platform store subscription billing (PaymentIntent checkout + Stripe Subscription + webhooks).
 * Implemented fully by {@link StripePlugin}; other gateways use stubs that throw
 * {@link SubscriptionBillingNotSupportedError}.
 */
export interface SubscriptionBillingPlugin {
	readonly subscriptionBillingGatewayId: string;

	createCheckoutPaymentIntent(
		input: CreateCheckoutPaymentIntentInput,
	): Promise<Stripe.PaymentIntent>;

	handlePlatformBillingWebhook(event: Stripe.Event): Promise<void>;

	/**
	 * Retrieve PI (validates client_secret).
	 */
	retrievePaymentIntent(
		paymentIntentId: string,
		clientSecret: string,
	): Promise<Stripe.PaymentIntent>;

	/**
	 * Attach PI payment method to customer and set default when needed (Stripe subscription collection).
	 */
	resolveDefaultPaymentMethodForSubscription(
		customerId: string,
		paymentIntent: Stripe.PaymentIntent,
	): Promise<SubscriptionPaymentMethodResolution>;

	/**
	 * Create Stripe Subscription (trial_end now, proration none — matches existing confirm flow).
	 */
	createStoreBillingSubscription(
		params: CreateStripeStoreSubscriptionParams,
	): Promise<Stripe.Subscription>;

	/**
	 * Create Stripe Subscription with `payment_behavior: default_incomplete` and return the invoice
	 * client secret (confirmation_secret or PaymentIntent) for a single Elements confirmation.
	 */
	createIncompleteStoreBillingSubscription(
		params: CreateIncompleteStripeStoreSubscriptionParams,
		options?: { idempotencyKey?: string },
	): Promise<CreateIncompleteStripeStoreSubscriptionResult>;

	/**
	 * Re-resolve client_secret for an existing incomplete subscription’s latest invoice (after finalize if draft).
	 */
	getSubscriptionInvoiceCheckoutSecrets(
		subscriptionId: string,
	): Promise<CreateIncompleteStripeStoreSubscriptionResult>;
}
