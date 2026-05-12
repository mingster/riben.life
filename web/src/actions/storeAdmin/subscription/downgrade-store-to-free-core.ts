import logger from "@/lib/logger";
import { cancelPlatformStoreBillingAtStripe } from "@/lib/payment/stripe/cancel-platform-store-billing";
import { stripe } from "@/lib/payment/stripe/config";
import { refundUnusedCurrentSubscriptionPeriod } from "@/lib/payment/stripe/refund-unused-subscription-period";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export async function applyStoreDowngradeToFreeInDb(params: {
	storeId: string;
	note: string;
	/**
	 * After a yearly unused-period refund, set expiration to now (paid access settled).
	 * With no refund (e.g. monthly), keep the existing expiration on the row.
	 */
	resetExpirationToNow: boolean;
}): Promise<void> {
	const { storeId, note, resetExpirationToNow } = params;
	const sub = await sqlClient.storeSubscription.findUnique({
		where: { storeId },
	});
	if (sub) {
		await sqlClient.storeSubscription.update({
			where: { storeId },
			data: {
				subscriptionId: null,
				status: SubscriptionStatus.Cancelled,
				...(resetExpirationToNow ? { expiration: getUtcNowEpoch() } : {}),
				note,
				updatedAt: getUtcNowEpoch(),
			},
		});
	}
	await sqlClient.store.update({
		where: { id: storeId },
		data: {
			level: StoreLevel.Free,
		},
	});
}

/**
 * Stripe cancel + DB free tier. Yearly subscriptions: proportional refund of unused
 * current period (same helper as interval changes). Monthly: cancel only, no refund.
 */
export async function downgradeStoreToFreeWithStripe(params: {
	storeId: string;
	userId: string;
	note?: string;
}): Promise<void> {
	const { storeId, userId, note } = params;
	let resetExpirationToNow = false;
	const subscription = await sqlClient.storeSubscription.findUnique({
		where: { storeId },
	});
	if (subscription?.subscriptionId) {
		const stripeSub = await stripe.subscriptions.retrieve(
			subscription.subscriptionId,
			{ expand: ["items.data.price"] },
		);
		const item = stripeSub.items.data[0];
		const price = item?.price;
		const recurringInterval =
			price &&
			typeof price === "object" &&
			"recurring" in price &&
			price.recurring &&
			typeof price.recurring === "object"
				? price.recurring.interval
				: undefined;

		if (recurringInterval === "year" && item?.id) {
			try {
				const { amountRefunded } = await refundUnusedCurrentSubscriptionPeriod({
					subscriptionId: stripeSub.id,
					subscriptionItemId: item.id,
					storeId,
					refundMetadataReason: "subscription_downgrade_to_free_yearly",
				});
				resetExpirationToNow = true;
				logger.info("Downgrade to free: yearly unused period refund", {
					metadata: {
						storeId,
						subscriptionId: stripeSub.id,
						amountRefunded,
					},
					tags: ["stripe", "subscription", "refund", "downgrade"],
				});
			} catch (err: unknown) {
				logger.error("Downgrade to free: yearly refund failed", {
					metadata: {
						storeId,
						subscriptionId: stripeSub.id,
						error: err instanceof Error ? err.message : String(err),
					},
					tags: ["stripe", "subscription", "refund", "downgrade", "error"],
				});
				throw err;
			}
		}

		await cancelPlatformStoreBillingAtStripe(subscription.subscriptionId);
	}
	const resolvedNote = note ?? `Unsubscribed by ${userId}`;
	await applyStoreDowngradeToFreeInDb({
		storeId,
		note: resolvedNote,
		resetExpirationToNow,
	});
}
