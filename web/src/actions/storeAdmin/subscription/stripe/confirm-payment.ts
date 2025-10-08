import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import Stripe from "stripe";

import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/datetime-utils";
import { formatDateTime } from "@/utils/datetime-utils";
import logger from "@/lib/logger";

/**
 * Calculate a safe billing start date that complies with Stripe's 5-year limit
 */
function calculateSafeBillingStartDate(
	currentExpiration: Date,
	daysToAdd: number,
): { billingStartDate: Date; wasCapped: boolean } {
	const now = new Date();
	const maxFutureDate = new Date();
	maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5); // Stripe limit: 5 years

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
const confirmPayment = async (
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
		console.log(JSON.stringify(paymentIntent));
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
		let current_exp = subscription.expiration;
		if (current_exp < now) {
			//reset to today if expired
			current_exp = now;
		}

		// add one month
		const new_exp = new Date(current_exp);
		new_exp.setMonth(new_exp.getMonth() + 1);

		let stripeSubscription: Stripe.Subscription | null = null;

		// Attach the payment method to the customer if not already attached
		const paymentMethodId = paymentIntent.payment_method as string;
		try {
			await stripe.paymentMethods.attach(paymentMethodId, {
				customer: db_user?.stripeCustomerId as string,
			});
		} catch (error: any) {
			// If already attached, Stripe throws an error - we can ignore it
			if (!error.message?.includes("already been attached")) {
				throw error;
			}
		}

		// Set as default payment method for the customer
		await stripe.customers.update(db_user?.stripeCustomerId as string, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		//create stripe subscription
		stripeSubscription = await stripe.subscriptions.create({
			customer: db_user?.stripeCustomerId as string,
			items: [{ price: setting.stripePriceId as string }],
			collection_method: "charge_automatically",
			default_payment_method: paymentMethodId,
			expand: ["latest_invoice.payment_intent"],
			metadata: {
				order_id: order?.id as string,
			},
			//discounts: coupon ? [{ coupon: coupon.id }] : [],
			// Prevent double charging:
			trial_end: "now",
			proration_behavior: "none",

			//billing_cycle_anchor: billingCycleAnchor,
		});

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
		const note = `extend subscription from ${formatDateTime(current_exp)} to ${formatDateTime(new_exp)}`;

		await sqlClient.storeSubscription.update({
			where: {
				storeId: store.id,
			},
			data: {
				status: SubscriptionStatus.Active,
				expiration: new_exp,
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
				paidAt: getUtcNow(),
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

		console.log(`confirmPayment: ${JSON.stringify(paidOrder)}`);

		return true;
	}

	return false;
};

export default confirmPayment;
