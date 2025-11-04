import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { GetSubscriptionLength } from "@/utils/utils";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import logger from "@/lib/logger";

const relevantEvents = new Set([
	"product.created",
	"product.updated",
	"product.deleted",
	"price.created",
	"price.updated",
	"price.deleted",
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
]);

const webhookHandler = async (req: NextRequest) => {
	const body = await req.text();
	const sig = req.headers.get("stripe-signature") as string;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	let event: Stripe.Event;

	try {
		if (!sig || !webhookSecret)
			return new Response("Webhook secret not found.", { status: 400 });
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
		logger.info("Operation log", {
			tags: ["api"],
		});
	} catch (err: unknown) {
		logger.error("Stripe webhook error", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "stripe", "webhook", "error"],
		});

		return new Response(`Webhook Error: ${(err as Error).message}`, {
			status: 400,
		});
	}

	// Successfully constructed event.
	logger.info("✅ Success:", {
		tags: ["api"],
	});

	// getting to the data we want from the event
	const subscription = event.data.object as Stripe.Subscription;

	try {
		if (relevantEvents.has(event.type)) {
			switch (event.type) {
				case "product.created":
				case "product.updated":
					break;
				case "price.created":
				case "price.updated":
					break;
				case "price.deleted":
					break;
				case "product.deleted":
					break;
				case "customer.subscription.created":
					// update pstv_subscriber table for the new subscription
					const new_subscription = event.data.object as Stripe.Subscription;

					//get user by its stripe customer id
					const user = await sqlClient.user.findFirst({
						where: {
							stripeCustomerId: new_subscription.customer as string,
						},
					});

					if (!user) {
						throw new Error("User not found");
					}

					const daysToAdd = GetSubscriptionLength(1);

					await sqlClient.subscription.upsert({
						where: {
							referenceId: user.id,
						},
						update: {
							id: crypto.randomUUID(),
							stripeSubscriptionId: new_subscription.id,
							status: "active",
							periodStart: new Date(new_subscription.start_date),
							periodEnd: new Date(
								new_subscription.start_date + daysToAdd * 24 * 60 * 60 * 1000,
							),
							cancelAtPeriodEnd: false,
							plan: new_subscription.items.data[0].price.id as string,
							seats: new_subscription.items.data[0].quantity,
							trialStart: null,
							trialEnd: null,
						},
						create: {
							id: crypto.randomUUID(),
							referenceId: user.id,
							stripeCustomerId: user.stripeCustomerId,
							stripeSubscriptionId: new_subscription.id,
							status: "active",
							periodStart: new Date(new_subscription.start_date),
							periodEnd: new Date(
								new_subscription.start_date + daysToAdd * 24 * 60 * 60 * 1000,
							),
							cancelAtPeriodEnd: false,
							plan: new_subscription.items.data[0].price.id as string,
							seats: new_subscription.items.data[0].quantity,
							trialStart: null,
							trialEnd: null,
						},
					});

					break;

				case "customer.subscription.updated":
				case "customer.subscription.deleted":
					//update subscription table

					break;

				case "checkout.session.completed":
					break;
				default:
					throw new Error("Unhandled relevant event!");
			}
		} else {
			return new NextResponse(`Unsupported event type: ${event.type}`, {
				status: 400,
			});
		}
	} catch (error: unknown) {
		logger.info("Operation log", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse("Webhook handler failed. View your server logs.", {
			status: 400,
		});
	}
};

export { webhookHandler as POST };
