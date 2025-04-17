"use server";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { GetSession, IsSignInResponse } from "@/lib/auth/utils";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { formatDateTime, getUtcNow } from "@/lib/utils";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";
import { SuccessAndRedirect } from "./SuccessAndRedirect";

// this page is triggered when stripe confirmed the payment.
// here we mark the SubscriptionPayment as paid, activate the subscription, and show customer a message.
export default async function StripeConfirmedPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{
		payment_intent: string;
		payment_intent_client_secret: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	if (!params.orderId) {
		throw new Error("order Id is missing");
	}

	if (
		searchParams.payment_intent &&
		searchParams.payment_intent_client_secret
	) {
		const stripePi = new Stripe(
			`${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
		);
		const pi = await stripePi.paymentIntents.retrieve(
			searchParams.payment_intent,
			{
				client_secret: searchParams.payment_intent_client_secret,
			},
		);

		if (pi && pi.status === "succeeded") {
			const setting = await sqlClient.platformSettings.findFirst();
			if (setting === null) {
				throw new Error("Platform settings not found");
			}

			const order = await sqlClient.subscriptionPayment.findUnique({
				where: {
					id: params.orderId,
				},
			});

			if (!order) throw Error("order not found");

			const store = await sqlClient.store.findUnique({
				where: {
					id: order.storeId,
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

			const new_exp = new Date(
				current_exp.getFullYear(),
				current_exp.getMonth() + 1,
				current_exp.getDay(),
				23,
				59,
				59,
			);

			let owner = await sqlClient.user.findFirst({
				where: {
					id: order.userId,
				},
			});

			if (!owner) throw Error("owner not found");

			// Ensure stripeCustomerId is a valid string before retrieving the customer
			let stripeCustomer = null;
			if (owner?.stripeCustomerId) {
				try {
					stripeCustomer = await stripe.customers.retrieve(
						owner.stripeCustomerId,
					);
				} catch (error) {
					logger.error(`Error retrieving Stripe customer: ${error}`);

					stripeCustomer = null;
				}
			}

			if (stripeCustomer === null) {
				const email = `${owner?.email}`;

				stripeCustomer = await stripe.customers.create({
					email: email,
					name: email,
				});

				owner = await sqlClient.user.update({
					where: { id: owner?.id },
					data: {
						stripeCustomerId: stripeCustomer.id,
					},
				});
			}

			const subscriptionSchedule = await stripe.subscriptionSchedules.create({
				customer: stripeCustomer.id,
				start_date: new_exp.getTime() / 1000,
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

			const note =
				"extend subscription from" +
				formatDateTime(current_exp) +
				" to " +
				formatDateTime(new_exp);

			await sqlClient.subscription.update({
				where: {
					storeId: store.id,
				},
				data: {
					status: SubscriptionStatus.Active,
					expiration: new_exp,
					stripeSubscriptionId: subscriptionSchedule.id,
					note: note,
				},
			});

			// finally update store's subscription level
			// save checkout references to related subscriptionPayment in db
			const checkoutAttributes = JSON.stringify({
				payment_intent: searchParams.payment_intent,
				client_secret: searchParams.payment_intent_client_secret,
			});

			// mark as paid
			const paidOrder = await sqlClient.subscriptionPayment.update({
				where: {
					id: params.orderId,
				},
				data: {
					isPaid: true,
					paidAt: new Date(),
					note: note,
					checkoutAttributes: checkoutAttributes,
				},
			});

			await sqlClient.store.update({
				where: {
					id: order.storeId,
				},
				data: {
					level: StoreLevel.Pro,
					//level: count === 1 ? StoreLevel.Pro : StoreLevel.Multi,
				},
			});

			console.log(
				`StripeConfirmedPage: order confirmed: ${JSON.stringify(paidOrder)}`,
			);

			return (
				<Suspense fallback={<Loader />}>
					<Container>
						<SuccessAndRedirect orderId={paidOrder.id} />
					</Container>
				</Suspense>
			);
		}
	}
}
