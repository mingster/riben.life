import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import Stripe from "stripe";

import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import {
	getUtcNow,
	getUtcNowEpoch,
	epochToDate,
	dateToEpoch,
} from "@/utils/datetime-utils";
import { formatDateTime } from "@/utils/datetime-utils";
import logger from "@/lib/logger";

/**
 * Calculate a safe billing start date that complies with Stripe's 5-year limit
 */
function calculateSafeBillingStartDate(
	currentExpiration: Date,
	daysToAdd: number,
): { billingStartDate: Date; wasCapped: boolean } {
	const now = getUtcNow();
	const maxFutureDate = new Date(
		Date.UTC(
			now.getUTCFullYear() + 5,
			now.getUTCMonth(),
			now.getUTCDate(),
			now.getUTCHours(),
			now.getUTCMinutes(),
			now.getUTCSeconds(),
			now.getUTCMilliseconds(),
		),
	); // Stripe limit: 5 years

	//if currentExpiration is in the past, set it to now
	if (currentExpiration < now) {
		currentExpiration = now;
	}

	// Calculate the intended billing start date
	let billingStartDate = new Date(
		currentExpiration.getTime() + daysToAdd * 24 * 60 * 60 * 1000,
	);

	// If the calculated date is more than 5 years in the future, cap it
	let wasCapped = false;

	if (billingStartDate > maxFutureDate) {
		logger.warn(
			`Billing start date ${billingStartDate.toISOString()} exceeds 5 years. Capping to ${maxFutureDate.toISOString()}`,
		);
		billingStartDate = maxFutureDate;
		wasCapped = true;
	}

	return { billingStartDate, wasCapped };
}

// confirmSubscriptionAction is called when stripe element confirmed the payment.
// As confirmed, it will:
// 1. mark the order as paid,
// 2. credit the user
// 3. create new stripe schedule.
// When done, redirect customer to its account page.

//NOTE - confirm subscription Payment.
const confirmSubscriptionPayment = async (
	orderId: string,
	payment_intent: string,
	payment_intent_client_secret: string,
): Promise<boolean | null> => {
	if (!orderId) {
		throw new Error("order Id is missing");
	}
	if (!payment_intent) {
		throw new Error("payment_intent is missing");
	}

	if (!payment_intent_client_secret) {
		throw new Error("payment_intent_client_secret is missing");
	}

	const stripePi = new Stripe(
		`${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
	);
	const paymentIntent = await stripePi.paymentIntents.retrieve(payment_intent, {
		client_secret: payment_intent_client_secret,
	});

	if (process.env.NODE_ENV === "development") {
		logger.info("Operation log", {
			tags: ["action"],
		});
	}

	if (paymentIntent && paymentIntent.status === "succeeded") {
		// payment confirmed
		// 1. mark payment a paid
		// 2. credit the payment
		const setting = await sqlClient.platformSettings.findFirst();
		if (setting === null) {
			throw new Error("Platform settings not found");
		}

		const subscriptionPayment = await sqlClient.subscriptionPayment.findUnique({
			where: {
				id: orderId,
			},
		});

		if (!subscriptionPayment) throw Error("order not found");

		const store = await sqlClient.store.findUnique({
			where: {
				id: subscriptionPayment.storeId,
			},
		});
		if (!store) throw Error("store not found");

		// credit the payment
		//
		const subscription = await sqlClient.storeSubscription.findUnique({
			where: {
				storeId: store.id,
			},
		});

		if (subscription === null) {
			//subscription should already created from subscribe api
			throw new Error("subscription not found");
		}

		const db_user = await sqlClient.user.findUnique({
			where: {
				id: subscription.userId,
			},
		});

		const order = await sqlClient.storeOrder.findUnique({
			where: {
				id: orderId,
			},
		});

		const now = getUtcNow();
		// Convert BigInt epoch to Date for calculations
		let current_exp_date = epochToDate(subscription.expiration);
		if (!current_exp_date) {
			current_exp_date = now;
		}
		if (current_exp_date < now) {
			//reset to today if expired
			current_exp_date = now;
		}

		// add one month
		const new_exp = new Date(current_exp_date);
		new_exp.setMonth(new_exp.getMonth() + 1);

		// Convert back to BigInt for storage
		const current_exp = dateToEpoch(current_exp_date);
		const new_exp_epoch = dateToEpoch(new_exp) ?? BigInt(0);

		let stripeSubscription: Stripe.Subscription | null = null;

		// Attach the payment method to the customer if not already attached
		const paymentMethodId = paymentIntent.payment_method as string;
		let attachedPaymentMethodId: string | undefined = paymentMethodId;

		// First, check if the payment method is already attached to a customer
		let paymentMethod: Stripe.PaymentMethod | null = null;
		try {
			paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
		} catch (error: any) {
			logger.error("Failed to retrieve payment method", {
				metadata: {
					error: error.message,
					paymentMethodId,
				},
				tags: ["stripe", "payment-method"],
			});
			throw new Error("Failed to retrieve payment method");
		}

		// If payment method is not attached to any customer, try to attach it
		if (!paymentMethod.customer) {
			try {
				await stripe.paymentMethods.attach(paymentMethodId, {
					customer: db_user?.stripeCustomerId as string,
				});
				attachedPaymentMethodId = paymentMethodId;
			} catch (error: any) {
				// If the payment method was previously used without being attached,
				// it cannot be reused. We need to handle this case.
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
								customerId: db_user?.stripeCustomerId,
							},
							tags: ["stripe", "payment-method"],
						},
					);
					// Try to get the customer's existing default payment method
					try {
						const customer = await stripe.customers.retrieve(
							db_user?.stripeCustomerId as string,
						);
						if (
							typeof customer !== "string" &&
							!customer.deleted &&
							customer.invoice_settings?.default_payment_method
						) {
							// Customer has a default payment method, use that
							attachedPaymentMethodId = customer.invoice_settings
								.default_payment_method as string;
							logger.info("Using customer's existing default payment method", {
								metadata: {
									customerId: db_user?.stripeCustomerId,
									paymentMethodId: attachedPaymentMethodId,
								},
								tags: ["stripe", "payment-method"],
							});
						} else {
							// No default payment method, try to list payment methods
							const paymentMethods = await stripe.paymentMethods.list({
								customer: db_user?.stripeCustomerId as string,
								type: "card",
							});
							if (paymentMethods.data.length > 0) {
								// Use the first available payment method
								attachedPaymentMethodId = paymentMethods.data[0].id;
								// Set it as default
								await stripe.customers.update(
									db_user?.stripeCustomerId as string,
									{
										invoice_settings: {
											default_payment_method: attachedPaymentMethodId,
										},
									},
								);
								logger.info("Using customer's existing payment method", {
									metadata: {
										customerId: db_user?.stripeCustomerId,
										paymentMethodId: attachedPaymentMethodId,
									},
									tags: ["stripe", "payment-method"],
								});
							} else {
								// No payment methods available - this is a problem for subscriptions
								logger.error(
									"Customer has no payment methods available for subscription",
									{
										metadata: {
											customerId: db_user?.stripeCustomerId,
											originalPaymentMethodId: paymentMethodId,
										},
										tags: ["stripe", "payment-method", "error"],
									},
								);
								attachedPaymentMethodId = undefined;
							}
						}
					} catch (customerError: any) {
						logger.error("Failed to retrieve customer payment methods", {
							metadata: {
								error: customerError.message,
								customerId: db_user?.stripeCustomerId,
							},
							tags: ["stripe", "payment-method", "error"],
						});
						attachedPaymentMethodId = undefined;
					}
				} else {
					throw error;
				}
			}
		} else if (paymentMethod.customer !== db_user?.stripeCustomerId) {
			// Payment method is attached to a different customer
			logger.warn("Payment method is attached to a different customer", {
				metadata: {
					paymentMethodId,
					attachedToCustomer: paymentMethod.customer,
					currentCustomerId: db_user?.stripeCustomerId,
				},
				tags: ["stripe", "payment-method"],
			});
			attachedPaymentMethodId = undefined;
		}

		// Set as default payment method for the customer (only if we have a valid attached method)
		if (attachedPaymentMethodId) {
			try {
				await stripe.customers.update(db_user?.stripeCustomerId as string, {
					invoice_settings: {
						default_payment_method: attachedPaymentMethodId,
					},
				});
			} catch (error: any) {
				logger.warn("Failed to set default payment method", {
					metadata: {
						error: error.message,
						customerId: db_user?.stripeCustomerId,
						paymentMethodId: attachedPaymentMethodId,
					},
					tags: ["stripe", "payment-method"],
				});
				// Continue even if setting default fails
			}
		}

		//create stripe subscription
		const subscriptionParams: Stripe.SubscriptionCreateParams = {
			customer: db_user?.stripeCustomerId as string,
			items: [{ price: setting.stripePriceId as string }],
			collection_method: "charge_automatically",
			expand: ["latest_invoice.payment_intent"],
			metadata: {
				order_id: order?.id as string,
			},
			//discounts: coupon ? [{ coupon: coupon.id }] : [],
			// Prevent double charging:
			trial_end: "now",
			proration_behavior: "none",

			//billing_cycle_anchor: billingCycleAnchor,
		};

		// Only set default_payment_method if we have a valid attached method
		if (attachedPaymentMethodId) {
			subscriptionParams.default_payment_method = attachedPaymentMethodId;
		} else {
			// Without a payment method, we cannot create a subscription with automatic collection
			// The payment has already succeeded, so we'll mark it as paid but skip subscription creation
			logger.error(
				"Cannot create subscription - customer has no valid payment method for automatic collection",
				{
					metadata: {
						customerId: db_user?.stripeCustomerId,
						orderId: order?.id,
						storeId: store.id,
					},
					tags: ["stripe", "subscription", "error"],
				},
			);
			// Mark payment as paid but don't create subscription
			// The subscription will need to be created manually later with a valid payment method
			const checkoutAttributes = JSON.stringify({
				payment_intent: payment_intent,
				client_secret: payment_intent_client_secret,
				subscription_creation_skipped: true,
				reason: "no_payment_method_available",
			});

			const paidOrder = await sqlClient.subscriptionPayment.update({
				where: {
					id: orderId,
				},
				data: {
					isPaid: true,
					paidAt: getUtcNowEpoch(),
					note: "Payment succeeded but subscription creation skipped - no payment method available",
					checkoutAttributes: checkoutAttributes,
				},
			});

			await sqlClient.store.update({
				where: {
					id: subscriptionPayment.storeId,
				},
				data: {
					level: StoreLevel.Pro,
				},
			});

			// Update subscription expiration manually (extend by 1 month from current)
			const note = `Payment processed but subscription not created automatically. Manual intervention required.`;
			await sqlClient.storeSubscription.update({
				where: {
					storeId: store.id,
				},
				data: {
					status: SubscriptionStatus.Active,
					expiration: new_exp_epoch,
					note: note,
				},
			});

			logger.warn("Payment processed but subscription creation skipped", {
				metadata: {
					orderId: order?.id,
					storeId: store.id,
					customerId: db_user?.stripeCustomerId,
				},
				tags: ["stripe", "subscription"],
			});

			return true; // Payment succeeded, even though subscription wasn't created
		}

		try {
			stripeSubscription =
				await stripe.subscriptions.create(subscriptionParams);
		} catch (subscriptionError: any) {
			// If subscription creation fails due to payment method issues, handle gracefully
			if (
				subscriptionError.message?.includes("no attached payment source") ||
				subscriptionError.message?.includes("no default payment method") ||
				subscriptionError.type === "StripeInvalidRequestError"
			) {
				logger.error("Failed to create subscription - payment method issue", {
					metadata: {
						error: subscriptionError.message,
						customerId: db_user?.stripeCustomerId,
						orderId: order?.id,
						storeId: store.id,
					},
					tags: ["stripe", "subscription", "error"],
				});
				// Mark payment as paid but subscription creation failed
				const checkoutAttributes = JSON.stringify({
					payment_intent: payment_intent,
					client_secret: payment_intent_client_secret,
					subscription_creation_failed: true,
					reason: subscriptionError.message,
				});

				const paidOrder = await sqlClient.subscriptionPayment.update({
					where: {
						id: orderId,
					},
					data: {
						isPaid: true,
						paidAt: getUtcNowEpoch(),
						note: `Payment succeeded but subscription creation failed: ${subscriptionError.message}`,
						checkoutAttributes: checkoutAttributes,
					},
				});

				await sqlClient.store.update({
					where: {
						id: subscriptionPayment.storeId,
					},
					data: {
						level: StoreLevel.Pro,
					},
				});

				// Update subscription expiration manually
				const note = `Payment processed but subscription creation failed. Manual intervention required.`;
				await sqlClient.storeSubscription.update({
					where: {
						storeId: store.id,
					},
					data: {
						status: SubscriptionStatus.Active,
						expiration: new_exp_epoch,
						note: note,
					},
				});

				return true; // Payment succeeded, even though subscription wasn't created
			}
			// Re-throw other errors
			throw subscriptionError;
		}

		/*
		const subscriptionSchedule = await stripe.subscriptionSchedules.create({
			customer: subscriptionPayment.userId,
			start_date: Math.floor(new_exp.getTime() / 1000),
			end_behavior: "release",
			phases: [
				{
					items: [
						{
							price: setting.stripePriceId as string,
							quantity: 1,
						},
					],
				},
			],
		});
*/
		const note = `extend subscription from ${formatDateTime(current_exp_date)} to ${formatDateTime(new_exp)}`;

		await sqlClient.storeSubscription.update({
			where: {
				storeId: store.id,
			},
			data: {
				status: SubscriptionStatus.Active,
				expiration: new_exp_epoch,
				subscriptionId: stripeSubscription.id,
				note: note,
			},
		});

		// finally update store's subscription level
		// save checkout references to related subscriptionPayment in db
		const checkoutAttributes = JSON.stringify({
			payment_intent: payment_intent,
			client_secret: payment_intent_client_secret,
		});

		// mark as paid
		const paidOrder = await sqlClient.subscriptionPayment.update({
			where: {
				id: orderId,
			},
			data: {
				isPaid: true,
				paidAt: getUtcNowEpoch(),
				note: note,
				checkoutAttributes: checkoutAttributes,
			},
		});

		await sqlClient.store.update({
			where: {
				id: subscriptionPayment.storeId,
			},
			data: {
				level: StoreLevel.Pro,
				//level: count === 1 ? StoreLevel.Pro : StoreLevel.Multi,
			},
		});

		return true;
	}

	return false;
};

export default confirmSubscriptionPayment;
