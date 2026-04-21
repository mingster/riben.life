import type { StoreOrder } from "@prisma/client";
import type Stripe from "stripe";
import logger from "@/lib/logger";
import { cancelPlatformStoreBillingAtStripe } from "@/lib/payment/stripe/cancel-platform-store-billing";
import { stripe } from "@/lib/payment/stripe/config";
import { handlePlatformStripeWebhookEvent } from "@/lib/payment/stripe/platform-stripe-webhooks";
import { refundUnusedCurrentSubscriptionPeriod } from "@/lib/payment/stripe/refund-unused-subscription-period";
import {
	internalMinorToStripeUnit,
	majorUnitsToStripeUnit,
	normalizeStripeCurrency,
} from "@/lib/payment/stripe/stripe-money";
import { handleStripeShopWebhookEvent as dispatchStripeShopWebhook } from "./stripe-shop-webhooks";
import type {
	CreateCheckoutPaymentIntentInput,
	CreateIncompleteStripeStoreSubscriptionParams,
	CreateIncompleteStripeStoreSubscriptionResult,
	CreateStripeStoreSubscriptionParams,
	SubscriptionBillingPlugin,
	SubscriptionPaymentMethodResolution,
} from "./subscription-billing-types";
import type {
	AvailabilityResult,
	FeeStructure,
	PaymentConfirmation,
	PaymentData,
	PaymentMethodPlugin,
	PaymentResult,
	PaymentStatus,
	PluginConfig,
	ValidationResult,
} from "./types";

type InvoiceWithPaymentSurface = Stripe.Invoice & {
	confirmation_secret?: { client_secret?: string | null } | null;
	payment_intent?: Stripe.PaymentIntent | string | null;
};

/**
 * Prefer Stripe invoice `confirmation_secret.client_secret`, else expanded PaymentIntent `client_secret`.
 */
export function resolveSubscriptionInvoiceClientSecret(
	invoice: Stripe.Invoice,
): string | null {
	const inv = invoice as InvoiceWithPaymentSurface;
	const fromConfirm = inv.confirmation_secret?.client_secret?.trim();
	if (fromConfirm) {
		return fromConfirm;
	}
	const pi = inv.payment_intent;
	if (pi && typeof pi === "object" && "client_secret" in pi) {
		const cs = pi.client_secret?.trim();
		if (cs) {
			return cs;
		}
	}
	return null;
}

async function extractCheckoutSecretsFromSubscriptionLatestInvoice(
	subscription: Stripe.Subscription,
): Promise<
	Omit<CreateIncompleteStripeStoreSubscriptionResult, "subscription">
> {
	let invoice = subscription.latest_invoice;
	if (typeof invoice === "string") {
		invoice = await stripe.invoices.retrieve(invoice, {
			expand: ["confirmation_secret", "payment_intent"],
		});
	}
	if (!invoice || typeof invoice === "string") {
		throw new Error("Missing latest_invoice on subscription");
	}
	let inv = invoice as Stripe.Invoice;
	if (inv.status === "draft") {
		inv = await stripe.invoices.finalizeInvoice(inv.id, {
			expand: ["confirmation_secret", "payment_intent"],
		});
	}
	const clientSecret = resolveSubscriptionInvoiceClientSecret(inv);
	if (!clientSecret) {
		throw new Error(
			"Could not resolve subscription invoice client secret (confirmation_secret or payment_intent)",
		);
	}
	const piRaw = (inv as InvoiceWithPaymentSurface).payment_intent;
	let paymentIntentId = "";
	if (typeof piRaw === "string") {
		paymentIntentId = piRaw;
	} else if (piRaw && typeof piRaw === "object" && "id" in piRaw) {
		paymentIntentId = piRaw.id;
	}
	return {
		clientSecret,
		paymentIntentId,
		invoiceId: inv.id,
	};
}

/**
 * Stripe Payment Method Plugin
 *
 * Implements payment processing via Stripe payment gateway.
 * Handles payment intent creation, confirmation, and status verification.
 * Also implements {@link SubscriptionBillingPlugin} for platform store billing.
 */
export class StripePlugin
	implements PaymentMethodPlugin, SubscriptionBillingPlugin
{
	readonly identifier = "stripe";
	readonly subscriptionBillingGatewayId = "stripe";
	readonly name = "Stripe";
	readonly description =
		"Credit/debit card payments via Stripe payment gateway";
	readonly version = "1.0.0";

	async processPayment(
		order: StoreOrder,
		_config: PluginConfig,
	): Promise<PaymentResult> {
		try {
			const paymentIntent = await stripe.paymentIntents.create({
				amount: majorUnitsToStripeUnit(
					order.currency,
					Number(order.orderTotal),
				),
				currency: order.currency.toLowerCase(),
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
				},
			});

			// Return payment intent ID for confirmation
			return {
				success: true,
				paymentData: {
					paymentIntentId: paymentIntent.id,
					clientSecret: paymentIntent.client_secret,
				},
			};
		} catch (error) {
			logger.error("Stripe payment processing failed", {
				metadata: {
					orderId: order.id,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Payment processing failed",
			};
		}
	}

	async confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentConfirmation> {
		const paymentIntentId = paymentData.paymentIntentId as string;

		if (!paymentIntentId) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Payment intent ID is required",
			};
		}

		try {
			// Retrieve and verify payment intent
			const paymentIntent =
				await stripe.paymentIntents.retrieve(paymentIntentId);

			if (paymentIntent.status === "succeeded") {
				return {
					success: true,
					paymentStatus: "paid",
					paymentData: {
						paymentIntentId: paymentIntent.id,
						chargeId: paymentIntent.latest_charge as string,
					},
				};
			}

			if (paymentIntent.status === "requires_payment_method") {
				return {
					success: false,
					paymentStatus: "failed",
					error: "Payment requires a payment method",
				};
			}

			// Payment is still processing or requires action
			return {
				success: false,
				paymentStatus: "pending",
				error: `Payment status: ${paymentIntent.status}`,
			};
		} catch (error) {
			logger.error("Stripe payment confirmation failed", {
				metadata: {
					orderId,
					paymentIntentId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				success: false,
				paymentStatus: "failed",
				error:
					error instanceof Error
						? error.message
						: "Payment confirmation failed",
			};
		}
	}

	async verifyPaymentStatus(
		orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentStatus> {
		const paymentIntentId = paymentData.paymentIntentId as string;

		if (!paymentIntentId) {
			return {
				status: "failed",
			};
		}

		try {
			const paymentIntent =
				await stripe.paymentIntents.retrieve(paymentIntentId);

			if (paymentIntent.status === "succeeded") {
				return {
					status: "paid",
					paymentData: {
						paymentIntentId: paymentIntent.id,
					},
				};
			}

			if (
				paymentIntent.status === "requires_payment_method" ||
				paymentIntent.status === "canceled"
			) {
				return {
					status: "failed",
					paymentData: {
						paymentIntentId: paymentIntent.id,
					},
				};
			}

			// Payment is still processing
			return {
				status: "pending",
				paymentData: {
					paymentIntentId: paymentIntent.id,
				},
			};
		} catch (error) {
			logger.error("Stripe payment status verification failed", {
				metadata: {
					orderId,
					paymentIntentId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				status: "failed",
			};
		}
	}

	calculateFees(_amount: number, config: PluginConfig): FeeStructure {
		// Default Stripe fees: 2.9% + 30¢
		const defaultFeeRate = 0.029;
		const defaultFeeAdditional = 0.3;

		// Allow override from config (platform or store level)
		const feeRate =
			config.storeConfig?.feeRate ??
			config.platformConfig?.feeRate ??
			defaultFeeRate;
		const feeAdditional =
			config.storeConfig?.feeAdditional ??
			config.platformConfig?.feeAdditional ??
			defaultFeeAdditional;

		return {
			feeRate,
			feeAdditional,
			calculateFee: (amt: number) => {
				return amt * feeRate + feeAdditional;
			},
		};
	}

	validateConfiguration(config: PluginConfig): ValidationResult {
		// Stripe requires API keys (handled at platform level via environment variables)
		// Store-level configuration is optional (for custom fees)
		const errors: string[] = [];

		if (!process.env.STRIPE_SECRET_KEY) {
			errors.push("Stripe secret key is not configured");
		}

		if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
			errors.push("Stripe publishable key is not configured");
		}

		// Validate fee configuration if provided
		if (config.storeConfig?.feeRate !== undefined) {
			const feeRate = Number(config.storeConfig.feeRate);
			if (Number.isNaN(feeRate) || feeRate < 0 || feeRate > 1) {
				errors.push("Fee rate must be between 0 and 1");
			}
		}

		if (config.storeConfig?.feeAdditional !== undefined) {
			const feeAdditional = Number(config.storeConfig.feeAdditional);
			if (Number.isNaN(feeAdditional) || feeAdditional < 0) {
				errors.push("Additional fee must be a non-negative number");
			}
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	/**
	 * Store checkout webhook branch (`payment_intent.*`). Delegates to the shared shop handler (calls `markOrderAsPaidAction`); API routes must not invoke that action for Stripe directly.
	 */
	async handleShopPaymentIntentWebhook(event: Stripe.Event): Promise<void> {
		return dispatchStripeShopWebhook(event);
	}

	checkAvailability(
		_order: StoreOrder,
		_config: PluginConfig,
	): AvailabilityResult {
		// Stripe is available if API keys are configured
		if (!process.env.STRIPE_SECRET_KEY) {
			return {
				available: false,
				reason: "Stripe secret key is not configured",
			};
		}

		if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
			return {
				available: false,
				reason: "Stripe publishable key is not configured",
			};
		}

		return {
			available: true,
		};
	}

	// --- SubscriptionBillingPlugin (platform store billing) ---

	async createCheckoutPaymentIntent(
		input: CreateCheckoutPaymentIntentInput,
	): Promise<Stripe.PaymentIntent> {
		const currency = normalizeStripeCurrency(input.currency);
		const internalMinor = Math.round(input.amountInternalMinor);
		const params: Stripe.PaymentIntentCreateParams = {
			...(input.customerId ? { customer: input.customerId } : {}),
			amount: internalMinorToStripeUnit(currency, internalMinor),
			currency,
			automatic_payment_methods: { enabled: true },
			metadata: input.metadata,
		};
		if (input.setupFutureUsage) {
			params.setup_future_usage = input.setupFutureUsage;
		}
		const paymentIntent = await stripe.paymentIntents.create(params);
		logger.info("Stripe payment intent created", {
			metadata: {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
			},
			tags: ["payment", "stripe", "api"],
		});
		return paymentIntent;
	}

	async handlePlatformBillingWebhook(event: Stripe.Event): Promise<void> {
		return handlePlatformStripeWebhookEvent(event);
	}

	async retrievePaymentIntent(
		paymentIntentId: string,
		clientSecret: string,
	): Promise<Stripe.PaymentIntent> {
		return stripe.paymentIntents.retrieve(paymentIntentId, {
			client_secret: clientSecret,
		});
	}

	async resolveDefaultPaymentMethodForSubscription(
		customerId: string,
		paymentIntent: Stripe.PaymentIntent,
	): Promise<SubscriptionPaymentMethodResolution> {
		const paymentMethodId = paymentIntent.payment_method as string;
		let attachedPaymentMethodId: string | undefined = paymentMethodId;

		let paymentMethod: Stripe.PaymentMethod | null = null;
		try {
			paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
		} catch (err: unknown) {
			logger.error("Failed to retrieve payment method", {
				metadata: {
					error: err instanceof Error ? err.message : String(err),
					paymentMethodId,
				},
				tags: ["stripe", "payment-method"],
			});
			throw new Error("Failed to retrieve payment method");
		}

		if (!paymentMethod.customer) {
			try {
				await stripe.paymentMethods.attach(paymentMethodId, {
					customer: customerId,
				});
				attachedPaymentMethodId = paymentMethodId;
			} catch (err: unknown) {
				const error = err as { message?: string; type?: string };
				if (
					error.message?.includes("previously used without being attached") ||
					error.message?.includes("may not be used again") ||
					error.type === "StripeInvalidRequestError"
				) {
					logger.warn(
						"Payment method cannot be reused - checking for existing customer payment method",
						{
							metadata: {
								error: error.message,
								paymentMethodId,
								customerId,
							},
							tags: ["stripe", "payment-method"],
						},
					);
					try {
						const customer = await stripe.customers.retrieve(customerId);
						if (
							typeof customer !== "string" &&
							!customer.deleted &&
							customer.invoice_settings?.default_payment_method
						) {
							attachedPaymentMethodId = customer.invoice_settings
								.default_payment_method as string;
							logger.info("Using customer's existing default payment method", {
								metadata: {
									customerId,
									paymentMethodId: attachedPaymentMethodId,
								},
								tags: ["stripe", "payment-method"],
							});
						} else {
							const paymentMethods = await stripe.paymentMethods.list({
								customer: customerId,
								type: "card",
							});
							if (paymentMethods.data.length > 0) {
								attachedPaymentMethodId = paymentMethods.data[0].id;
								await stripe.customers.update(customerId, {
									invoice_settings: {
										default_payment_method: attachedPaymentMethodId,
									},
								});
								logger.info("Using customer's existing payment method", {
									metadata: {
										customerId,
										paymentMethodId: attachedPaymentMethodId,
									},
									tags: ["stripe", "payment-method"],
								});
							} else {
								logger.error(
									"Customer has no payment methods available for subscription",
									{
										metadata: {
											customerId,
											originalPaymentMethodId: paymentMethodId,
										},
										tags: ["stripe", "payment-method", "error"],
									},
								);
								attachedPaymentMethodId = undefined;
							}
						}
					} catch (customerErr: unknown) {
						logger.error("Failed to retrieve customer payment methods", {
							metadata: {
								error:
									customerErr instanceof Error
										? customerErr.message
										: String(customerErr),
								customerId,
							},
							tags: ["stripe", "payment-method", "error"],
						});
						attachedPaymentMethodId = undefined;
					}
				} else {
					throw err;
				}
			}
		} else if (paymentMethod.customer !== customerId) {
			logger.warn("Payment method is attached to a different customer", {
				metadata: {
					paymentMethodId,
					attachedToCustomer: paymentMethod.customer,
					currentCustomerId: customerId,
				},
				tags: ["stripe", "payment-method"],
			});
			attachedPaymentMethodId = undefined;
		}

		if (attachedPaymentMethodId) {
			try {
				await stripe.customers.update(customerId, {
					invoice_settings: {
						default_payment_method: attachedPaymentMethodId,
					},
				});
			} catch (err: unknown) {
				logger.warn("Failed to set default payment method", {
					metadata: {
						error: err instanceof Error ? err.message : String(err),
						customerId,
						paymentMethodId: attachedPaymentMethodId,
					},
					tags: ["stripe", "payment-method"],
				});
			}
		}

		return { attachedPaymentMethodId };
	}

	async createIncompleteStoreBillingSubscription(
		params: CreateIncompleteStripeStoreSubscriptionParams,
		options?: { idempotencyKey?: string },
	): Promise<CreateIncompleteStripeStoreSubscriptionResult> {
		const subscriptionParams: Stripe.SubscriptionCreateParams = {
			customer: params.customerId,
			items: [{ price: params.stripePriceId.trim() }],
			collection_method: "charge_automatically",
			payment_behavior: "default_incomplete",
			payment_settings: {
				save_default_payment_method: "on_subscription",
			},
			expand: [
				"latest_invoice.confirmation_secret",
				"latest_invoice.payment_intent",
			],
			metadata: {
				subscription_payment_id: params.subscriptionPaymentId,
				store_id: params.storeId,
			},
			proration_behavior: "none",
		};
		const subscription = await stripe.subscriptions.create(subscriptionParams, {
			...(options?.idempotencyKey
				? { idempotencyKey: options.idempotencyKey }
				: {}),
		});
		const checkout =
			await extractCheckoutSecretsFromSubscriptionLatestInvoice(subscription);
		logger.info("Stripe incomplete store billing subscription created", {
			metadata: {
				subscriptionId: subscription.id,
				invoiceId: checkout.invoiceId,
				subscriptionPaymentId: params.subscriptionPaymentId,
				storeId: params.storeId,
			},
			tags: ["payment", "stripe", "subscription"],
		});
		return { subscription, ...checkout };
	}

	async getSubscriptionInvoiceCheckoutSecrets(
		subscriptionId: string,
	): Promise<CreateIncompleteStripeStoreSubscriptionResult> {
		const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
			expand: [
				"latest_invoice.confirmation_secret",
				"latest_invoice.payment_intent",
			],
		});
		const checkout =
			await extractCheckoutSecretsFromSubscriptionLatestInvoice(subscription);
		return { subscription, ...checkout };
	}

	async createStoreBillingSubscription(
		params: CreateStripeStoreSubscriptionParams,
	): Promise<Stripe.Subscription> {
		const subscriptionParams: Stripe.SubscriptionCreateParams = {
			customer: params.customerId,
			items: [{ price: params.stripePriceId.trim() }],
			collection_method: "charge_automatically",
			expand: ["latest_invoice.payment_intent"],
			metadata: {
				subscription_payment_id: params.subscriptionPaymentId,
				store_id: params.storeId,
			},
			trial_end: "now",
			proration_behavior: "none",
		};
		if (params.defaultPaymentMethodId) {
			subscriptionParams.default_payment_method = params.defaultPaymentMethodId;
		}
		return stripe.subscriptions.create(subscriptionParams);
	}

	/**
	 * Monthly ↔ yearly at same tier: refunds unused time on the current period to the
	 * original payment method, then updates the subscription with a fresh billing cycle
	 * and full charge for the new cadence (no proration credits on the invoice).
	 */
	async changeStoreBillingSubscriptionIntervalWithUnusedRefund(params: {
		subscriptionId: string;
		subscriptionItemId: string;
		newPriceId: string;
		storeId: string;
	}): Promise<Stripe.Subscription> {
		await refundUnusedCurrentSubscriptionPeriod({
			subscriptionId: params.subscriptionId,
			subscriptionItemId: params.subscriptionItemId,
			storeId: params.storeId,
		});
		return stripe.subscriptions.update(params.subscriptionId, {
			items: [
				{
					id: params.subscriptionItemId,
					price: params.newPriceId.trim(),
				},
			],
			billing_cycle_anchor: "now",
			proration_behavior: "none",
			payment_behavior: "error_if_incomplete",
		});
	}

	/** Cancels immediately with `prorate: false`. Yearly downgrade-to-free refunds unused time before this call. */
	async cancelStoreBillingSubscriptionWithProration(
		stripeObjectId: string,
	): Promise<void> {
		await cancelPlatformStoreBillingAtStripe(stripeObjectId);
	}
}

// Export singleton instance
export const stripePlugin = new StripePlugin();
