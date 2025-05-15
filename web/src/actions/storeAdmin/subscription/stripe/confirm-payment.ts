import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import Stripe from "stripe";

import { formatDateTime, getUtcNow } from "@/utils/utils";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";

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
	const pi = await stripePi.paymentIntents.retrieve(payment_intent, {
		client_secret: payment_intent_client_secret,
	});

	if (process.env.NODE_ENV === "development") {
		console.log(JSON.stringify(pi));
	}

	if (pi && pi.status === "succeeded") {
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
		const subscription = await sqlClient.subscription.findUnique({
			where: {
				storeId: store.id,
			},
		});

		if (subscription === null) {
			//subscription should already created from subscribe api
			throw new Error("subscription not found");
		}

		const now = getUtcNow();
		let current_exp = subscription.expiration;
		if (current_exp < now) {
			//reset to today if expired
			current_exp = now;
		}

		// add one month
		const new_exp = new Date(current_exp);
		new_exp.setMonth(new_exp.getMonth() + 1);

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

		const note = `extend subscription from ${formatDateTime(current_exp)} to ${formatDateTime(new_exp)}`;

		await sqlClient.subscription.update({
			where: {
				storeId: store.id,
			},
			data: {
				status: SubscriptionStatus.Active,
				expiration: new_exp,
				subscriptionId: subscriptionSchedule.id,
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
