import type Stripe from "stripe";
import logger from "@/lib/logger";
import { getStripeSubscriptionPeriodEndUnix } from "@/lib/payment/stripe/subscription-period-end";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { GetSubscriptionLength } from "@/utils/utils";
import { sendCancelSubscription } from "@/lib/mail/send-cancel-subscrption";

async function syncPlatformStoreSubscriptionFromStripe(
	subscription: Stripe.Subscription,
	options: { ended: boolean },
): Promise<void> {
	const storeId = subscription.metadata?.store_id?.trim();
	if (!storeId) {
		return;
	}

	// `default_incomplete` checkouts emit lifecycle events before the first invoice is paid.
	// Do not mark the store entitled until Stripe reports an active (or trialing) subscription.
	if (!options.ended) {
		const s = subscription.status;
		if (s !== "active" && s !== "trialing") {
			return;
		}
	}

	const row = await sqlClient.storeSubscription.findUnique({
		where: { storeId },
	});
	if (!row) {
		return;
	}

	if (options.ended) {
		// Do not set `expiration` here. Downgrade-to-free sets it explicitly (preserve when
		// no refund, `getUtcNowEpoch()` after yearly unused refund). Overwriting from Stripe
		// would undo that (e.g. future current_period_end vs "now" after refund).
		await sqlClient.storeSubscription.update({
			where: { storeId },
			data: {
				subscriptionId: null,
				status: SubscriptionStatus.Cancelled,
				updatedAt: getUtcNowEpoch(),
				note: row.note
					? `${row.note} | Stripe subscription ended`
					: "Cancelled (Stripe)",
			},
		});
		await sqlClient.store.update({
			where: { id: storeId },
			data: { level: StoreLevel.Free },
		});
		return;
	}

	const periodEnd = getStripeSubscriptionPeriodEndUnix(subscription);
	if (periodEnd === null) {
		return;
	}
	const expiration = BigInt(periodEnd * 1000);

	await sqlClient.storeSubscription.update({
		where: { storeId },
		data: {
			subscriptionId: subscription.id,
			expiration,
			status: SubscriptionStatus.Active,
			updatedAt: getUtcNowEpoch(),
		},
	});
}

/**
 * Platform / billing Stripe events (subscriptions, catalog placeholders).
 * Not tied to store checkout PaymentMethod rows.
 */
export async function handlePlatformStripeWebhookEvent(
	event: Stripe.Event,
): Promise<void> {
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
		case "checkout.session.completed":
			break;

		case "customer.subscription.created": {
			const newSubscription = event.data.object as Stripe.Subscription;

			if (newSubscription.metadata?.store_id?.trim()) {
				await syncPlatformStoreSubscriptionFromStripe(newSubscription, {
					ended: false,
				});
				break;
			}

			const user = await sqlClient.user.findFirst({
				where: {
					stripeCustomerId: newSubscription.customer as string,
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
					stripeSubscriptionId: newSubscription.id,
					status: "active",
					periodStart: new Date(newSubscription.start_date),
					periodEnd: new Date(
						newSubscription.start_date + daysToAdd * 24 * 60 * 60 * 1000,
					),
					cancelAtPeriodEnd: false,
					plan: newSubscription.items.data[0].price.id as string,
					seats: newSubscription.items.data[0].quantity,
					trialStart: null,
					trialEnd: null,
				},
				create: {
					id: crypto.randomUUID(),
					referenceId: user.id,
					stripeCustomerId: user.stripeCustomerId,
					stripeSubscriptionId: newSubscription.id,
					status: "active",
					periodStart: new Date(newSubscription.start_date),
					periodEnd: new Date(
						newSubscription.start_date + daysToAdd * 24 * 60 * 60 * 1000,
					),
					cancelAtPeriodEnd: false,
					plan: newSubscription.items.data[0].price.id as string,
					seats: newSubscription.items.data[0].quantity,
					trialStart: null,
					trialEnd: null,
				},
			});

			break;
		}

		case "customer.subscription.updated": {
			const sub = event.data.object as Stripe.Subscription;
			const ended =
				sub.status === "canceled" ||
				sub.status === "unpaid" ||
				sub.status === "incomplete_expired";
			await syncPlatformStoreSubscriptionFromStripe(sub, { ended });
			break;
		}

		case "customer.subscription.deleted": {
			const sub = event.data.object as Stripe.Subscription;
			await syncPlatformStoreSubscriptionFromStripe(sub, { ended: true });
			// Notify store owner of subscription cancellation (order.cancelled.customer.email)
			const storeId = sub.metadata?.store_id?.trim();
			if (storeId) {
				try {
					const store = await sqlClient.store.findUnique({
						where: { id: storeId },
						include: { Owner: true },
					});
					if (store?.Owner) {
						await sendCancelSubscription({
							user: store.Owner,
							storeId: store.id,
							storeName: store.name,
						});
					}
				} catch (mailError) {
					logger.error("Failed to send subscription cancel email", {
						metadata: {
							storeId,
							error:
								mailError instanceof Error
									? mailError.message
									: String(mailError),
						},
						tags: ["stripe", "webhook", "platform", "email", "error"],
					});
				}
			}
			break;
		}

		default:
			logger.warn("Unhandled platform Stripe event in switch", {
				metadata: { type: event.type },
				tags: ["stripe", "webhook", "platform"],
			});
	}
}
