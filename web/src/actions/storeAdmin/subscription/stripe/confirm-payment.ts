import type Stripe from "stripe";
import logger from "@/lib/logger";
import { stripePlugin } from "@/lib/payment/plugins/stripe-plugin";
import { stripe } from "@/lib/payment/stripe/config";
import { getStripeSubscriptionPeriodEndUnix } from "@/lib/payment/stripe/subscription-period-end";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import {
	dateToEpoch,
	epochToDate,
	formatDateTime,
	getUtcNow,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";

/**
 * Calculate a safe billing start date that complies with Stripe's 5-year limit
 */
function _calculateSafeBillingStartDate(
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

function addBillingIntervalToDate(
	date: Date,
	interval: "month" | "year" | null | undefined,
): Date {
	const d = new Date(date.getTime());
	if (interval === "year") {
		d.setUTCFullYear(d.getUTCFullYear() + 1);
	} else {
		d.setUTCMonth(d.getUTCMonth() + 1);
	}
	return d;
}

async function resolveStripePriceRecurringInterval(
	stripePriceId: string,
): Promise<"month" | "year" | null> {
	try {
		const p = await stripe.prices.retrieve(stripePriceId.trim());
		if (p.recurring?.interval === "year") {
			return "year";
		}
		if (p.recurring?.interval === "month") {
			return "month";
		}
	} catch (err: unknown) {
		logger.warn("confirm-payment: could not load price for interval fallback", {
			metadata: {
				stripePriceId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["stripe", "subscription"],
		});
	}
	return null;
}

function parseSubscriptionCheckoutAttrsJson(
	raw: string,
): Record<string, unknown> {
	if (!raw?.trim()) {
		return {};
	}
	try {
		const o = JSON.parse(raw) as unknown;
		return typeof o === "object" && o !== null && !Array.isArray(o)
			? (o as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

/**
 * If this PaymentIntent belongs to a subscription invoice (new checkout flow), return that
 * Subscription when metadata matches. Otherwise null → legacy standalone PI + subscriptions.create.
 */
function subscriptionCustomerId(sub: Stripe.Subscription): string | null {
	const c = sub.customer;
	if (typeof c === "string") {
		return c;
	}
	if (c && typeof c === "object" && "id" in c) {
		return c.id;
	}
	return null;
}

function paymentIntentCustomerId(pi: Stripe.PaymentIntent): string | null {
	const c = pi.customer;
	if (typeof c === "string") {
		return c;
	}
	if (c && typeof c === "object" && c !== null && "id" in c) {
		return (c as Stripe.Customer).id;
	}
	return null;
}

function invoicePaymentIntentId(
	inv: Stripe.Invoice & {
		payment_intent?: string | Stripe.PaymentIntent | null;
	},
): string | null {
	const pi = inv.payment_intent;
	if (typeof pi === "string") {
		return pi;
	}
	if (pi && typeof pi === "object" && "id" in pi) {
		return pi.id;
	}
	return null;
}

async function tryResolveStoreSubscriptionFromSucceededPaymentIntent(
	paymentIntentId: string,
	subscriptionPaymentId: string,
	storeId: string,
	checkoutAttributesRaw: string,
): Promise<Stripe.Subscription | null> {
	const attrs = parseSubscriptionCheckoutAttrsJson(checkoutAttributesRaw);
	const pendingSub =
		typeof attrs.pending_stripe_subscription_id === "string"
			? attrs.pending_stripe_subscription_id.trim()
			: "";
	const pendingPi =
		typeof attrs.pending_stripe_payment_intent_id === "string"
			? attrs.pending_stripe_payment_intent_id.trim()
			: "";

	let piFull = (await stripe.paymentIntents.retrieve(paymentIntentId, {
		expand: ["invoice", "invoice.subscription"],
	})) as Stripe.PaymentIntent & {
		invoice?: string | Stripe.Invoice | null;
	};

	// Some API/account combinations omit `invoice` on expanded retrieve; try bare retrieve.
	if (!piFull.invoice) {
		const bare = (await stripe.paymentIntents.retrieve(
			paymentIntentId,
		)) as Stripe.PaymentIntent & {
			invoice?: string | Stripe.Invoice | null;
		};
		if (bare.invoice) {
			piFull = {
				...piFull,
				invoice: bare.invoice,
			};
		}
	}

	async function loadSubIfMetaMatches(
		subId: string,
	): Promise<Stripe.Subscription | null> {
		const sub = await stripe.subscriptions.retrieve(subId);
		const metaPay = sub.metadata?.subscription_payment_id?.trim();
		const metaStore = sub.metadata?.store_id?.trim();
		if (metaPay === subscriptionPaymentId && metaStore === storeId) {
			return sub;
		}
		logger.warn(
			"confirm-payment: Stripe subscription metadata does not match payment",
			{
				metadata: {
					subscriptionId: sub.id,
					metaPay,
					metaStore,
					expectedPaymentId: subscriptionPaymentId,
					expectedStoreId: storeId,
				},
				tags: ["stripe", "subscription"],
			},
		);
		return null;
	}

	let invId: string | null = null;
	if (typeof piFull.invoice === "string") {
		invId = piFull.invoice;
	} else if (
		piFull.invoice &&
		typeof piFull.invoice === "object" &&
		"id" in piFull.invoice
	) {
		invId = (piFull.invoice as Stripe.Invoice).id;
	}

	if (invId) {
		const invObj =
			typeof piFull.invoice === "object" &&
			piFull.invoice !== null &&
			"subscription" in piFull.invoice
				? (piFull.invoice as Stripe.Invoice & {
						subscription?: string | Stripe.Subscription | null;
					})
				: null;

		const invoice =
			invObj && invObj.subscription !== undefined
				? invObj
				: ((await stripe.invoices.retrieve(invId, {
						expand: ["subscription"],
					})) as Stripe.Invoice & {
						subscription?: string | Stripe.Subscription | null;
					});

		const rawSub = invoice.subscription;
		if (typeof rawSub === "string") {
			return loadSubIfMetaMatches(rawSub);
		}
		if (rawSub && typeof rawSub === "object") {
			const sub = rawSub as Stripe.Subscription;
			const metaPay = sub.metadata?.subscription_payment_id?.trim();
			const metaStore = sub.metadata?.store_id?.trim();
			if (metaPay === subscriptionPaymentId && metaStore === storeId) {
				return sub;
			}
		}
	}

	if (pendingSub && pendingPi === paymentIntentId) {
		return loadSubIfMetaMatches(pendingSub);
	}

	// Checkout may omit pending_stripe_payment_intent_id when only confirmation_secret was present;
	// list summaries often omit payment_intent — retrieve each invoice with expand.
	if (pendingSub) {
		const subExpanded = await stripe.subscriptions.retrieve(pendingSub, {
			expand: ["latest_invoice.payment_intent"],
		});
		const mp = subExpanded.metadata?.subscription_payment_id?.trim();
		const ms = subExpanded.metadata?.store_id?.trim();
		if (mp === subscriptionPaymentId && ms === storeId) {
			let latest = subExpanded.latest_invoice;
			if (typeof latest === "string") {
				latest = await stripe.invoices.retrieve(latest, {
					expand: ["payment_intent"],
				});
			}
			if (latest && typeof latest === "object") {
				const lip = invoicePaymentIntentId(
					latest as Stripe.Invoice & {
						payment_intent?: string | Stripe.PaymentIntent | null;
					},
				);
				if (lip === paymentIntentId) {
					return subExpanded;
				}
			}

			const listed = await stripe.invoices.list({
				subscription: pendingSub,
				limit: 20,
			});
			for (const row of listed.data) {
				const invFull = await stripe.invoices.retrieve(row.id, {
					expand: ["payment_intent"],
				});
				const pid = invoicePaymentIntentId(
					invFull as Stripe.Invoice & {
						payment_intent?: string | Stripe.PaymentIntent | null;
					},
				);
				if (pid === paymentIntentId) {
					return subExpanded;
				}
			}

			// Last resort: same Stripe customer, metadata matches, subscription already active — typical right after first invoice pay.
			if (
				subExpanded.status === "active" ||
				subExpanded.status === "trialing"
			) {
				const piForCust = await stripe.paymentIntents.retrieve(paymentIntentId);
				const subCust = subscriptionCustomerId(subExpanded);
				const piCust = paymentIntentCustomerId(piForCust);
				if (
					subCust &&
					piCust &&
					subCust === piCust &&
					piForCust.status === "succeeded"
				) {
					logger.info(
						"confirm-payment: resolved subscription via pending_sub + customer match (PI invoice link missing in API)",
						{
							metadata: {
								subscriptionId: pendingSub,
								paymentIntentId,
								subscriptionPaymentId,
							},
							tags: ["stripe", "subscription"],
						},
					);
					return subExpanded;
				}
			}
		}
	}

	logger.warn(
		"confirm-payment: could not resolve subscription from succeeded PI",
		{
			metadata: {
				paymentIntentId,
				subscriptionPaymentId,
				storeId,
				hasInvoiceOnPi: Boolean(invId),
				pendingSub: pendingSub || null,
				pendingPiStored: pendingPi || null,
			},
			tags: ["stripe", "subscription"],
		},
	);

	return null;
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

	const subscriptionPayment = await sqlClient.subscriptionPayment.findUnique({
		where: {
			id: orderId,
		},
	});

	if (!subscriptionPayment) throw Error("order not found");

	if (subscriptionPayment.isPaid) {
		return true;
	}

	const paymentIntent = await stripePlugin.retrievePaymentIntent(
		payment_intent,
		payment_intent_client_secret,
	);

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

		const targetStoreLevel =
			subscriptionPayment.targetStoreLevel != null
				? Number(subscriptionPayment.targetStoreLevel)
				: StoreLevel.Pro;

		const stripePriceIdForSubscription =
			subscriptionPayment.stripePriceId?.trim() || setting.stripePriceId;
		if (!stripePriceIdForSubscription?.trim()) {
			throw new Error(
				"Subscription price is not configured on this payment or platform settings",
			);
		}

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

		const priceInterval = await resolveStripePriceRecurringInterval(
			stripePriceIdForSubscription,
		);
		const fallbackPeriodEnd = addBillingIntervalToDate(
			current_exp_date,
			priceInterval,
		);
		const fallback_exp_epoch = dateToEpoch(fallbackPeriodEnd) ?? BigInt(0);

		const stripeCustomerId = db_user?.stripeCustomerId;
		if (!stripeCustomerId?.trim()) {
			throw new Error("User is missing a Stripe customer id");
		}

		const invoiceLinkedSub =
			await tryResolveStoreSubscriptionFromSucceededPaymentIntent(
				payment_intent,
				subscriptionPayment.id,
				store.id,
				subscriptionPayment.checkoutAttributes,
			);

		if (invoiceLinkedSub) {
			if (
				invoiceLinkedSub.status !== "active" &&
				invoiceLinkedSub.status !== "trialing"
			) {
				throw new Error(
					`Subscription is ${invoiceLinkedSub.status} after payment succeeded; expected active or trialing.`,
				);
			}
			const periodEndSec = getStripeSubscriptionPeriodEndUnix(invoiceLinkedSub);
			const new_exp_epoch =
				periodEndSec != null ? BigInt(periodEndSec * 1000) : fallback_exp_epoch;
			const new_exp_date =
				periodEndSec != null
					? new Date(periodEndSec * 1000)
					: fallbackPeriodEnd;
			const note = `extend subscription from ${formatDateTime(current_exp_date)} to ${formatDateTime(new_exp_date)}`;

			await sqlClient.storeSubscription.update({
				where: { storeId: store.id },
				data: {
					status: SubscriptionStatus.Active,
					expiration: new_exp_epoch,
					subscriptionId: invoiceLinkedSub.id,
					note,
				},
			});

			const checkoutAttributes = JSON.stringify({
				payment_intent: payment_intent,
				client_secret: payment_intent_client_secret,
				stripe_subscription_id: invoiceLinkedSub.id,
				subscription_checkout_flow: "invoice_pi",
			});

			await sqlClient.subscriptionPayment.update({
				where: { id: orderId },
				data: {
					isPaid: true,
					paidAt: getUtcNowEpoch(),
					note,
					checkoutAttributes: checkoutAttributes,
				},
			});

			await sqlClient.store.update({
				where: { id: subscriptionPayment.storeId },
				data: { level: targetStoreLevel },
			});

			return true;
		}

		const checkoutAttrsForLegacyGuard = parseSubscriptionCheckoutAttrsJson(
			subscriptionPayment.checkoutAttributes,
		);
		const hasNewFlowPendingSub =
			typeof checkoutAttrsForLegacyGuard.pending_stripe_subscription_id ===
				"string" &&
			checkoutAttrsForLegacyGuard.pending_stripe_subscription_id.trim() !== "";

		if (hasNewFlowPendingSub) {
			logger.error(
				"confirm-payment: refusing legacy subscriptions.create — new checkout flow marker present but subscription not resolved from PI (prevents double charge)",
				{
					metadata: {
						subscriptionPaymentId: subscriptionPayment.id,
						storeId: store.id,
						paymentIntentId: payment_intent,
					},
					tags: ["stripe", "subscription", "error"],
				},
			);
			throw new Error(
				"Could not link this payment to your subscription checkout. If you were charged, refresh the page or contact support — do not pay again.",
			);
		}

		let stripeSubscription: Stripe.Subscription | null = null;

		const { attachedPaymentMethodId } =
			await stripePlugin.resolveDefaultPaymentMethodForSubscription(
				stripeCustomerId,
				paymentIntent,
			);

		if (!attachedPaymentMethodId) {
			// Without a payment method, we cannot create a subscription with automatic collection
			// The payment has already succeeded, so we'll mark it as paid but skip subscription creation
			logger.error(
				"Cannot create subscription - customer has no valid payment method for automatic collection",
				{
					metadata: {
						customerId: db_user?.stripeCustomerId,
						subscriptionPaymentId: subscriptionPayment.id,
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

			const _paidOrder = await sqlClient.subscriptionPayment.update({
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
					level: targetStoreLevel,
				},
			});

			// Update subscription expiration manually (interval-aware fallback; no Stripe sub)
			const note = `Payment processed but subscription not created automatically. Manual intervention required.`;
			await sqlClient.storeSubscription.update({
				where: {
					storeId: store.id,
				},
				data: {
					status: SubscriptionStatus.Active,
					expiration: fallback_exp_epoch,
					note: note,
				},
			});

			logger.warn("Payment processed but subscription creation skipped", {
				metadata: {
					subscriptionPaymentId: subscriptionPayment.id,
					storeId: store.id,
					customerId: db_user?.stripeCustomerId,
				},
				tags: ["stripe", "subscription"],
			});

			return true; // Payment succeeded, even though subscription wasn't created
		}

		try {
			stripeSubscription = await stripePlugin.createStoreBillingSubscription({
				customerId: stripeCustomerId,
				stripePriceId: stripePriceIdForSubscription.trim(),
				subscriptionPaymentId: subscriptionPayment.id,
				storeId: store.id,
				defaultPaymentMethodId: attachedPaymentMethodId,
			});
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
						subscriptionPaymentId: subscriptionPayment.id,
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

				const _paidOrder = await sqlClient.subscriptionPayment.update({
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
						level: targetStoreLevel,
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
						expiration: fallback_exp_epoch,
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
			start_date: Math.floor(fallbackPeriodEnd.getTime() / 1000),
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
		const periodEndSec = getStripeSubscriptionPeriodEndUnix(stripeSubscription);
		const new_exp_epoch =
			periodEndSec != null ? BigInt(periodEndSec * 1000) : fallback_exp_epoch;
		const new_exp_date =
			periodEndSec != null ? new Date(periodEndSec * 1000) : fallbackPeriodEnd;

		const note = `extend subscription from ${formatDateTime(current_exp_date)} to ${formatDateTime(new_exp_date)}`;

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
		const _paidOrder = await sqlClient.subscriptionPayment.update({
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
				level: targetStoreLevel,
			},
		});

		return true;
	}

	return false;
};

export default confirmSubscriptionPayment;
