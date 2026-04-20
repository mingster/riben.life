import logger from "@/lib/logger";
import { stripe } from "@/lib/payment/stripe/config";

/**
 * Cancels platform store billing in Stripe. `stripeObjectId` may be a
 * Subscription id (`sub_...`) or legacy SubscriptionSchedule id (`sub_sched_...`).
 * Uses `prorate: false` so Stripe does not add proration lines on cancel; any yearly
 * unused-time refund is done separately (see {@link downgradeStoreToFreeWithStripe}).
 */
export async function cancelPlatformStoreBillingAtStripe(
	stripeObjectId: string,
): Promise<void> {
	const id = stripeObjectId.trim();
	if (!id) {
		return;
	}

	try {
		const sub = await stripe.subscriptions.retrieve(id);
		if (sub.status !== "canceled") {
			await stripe.subscriptions.cancel(id, {
				invoice_now: true,
				prorate: false,
			});
		}
		return;
	} catch (firstErr: unknown) {
		const code = (firstErr as { code?: string }).code;
		const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
		const missing =
			code === "resource_missing" || msg.includes("No such subscription");
		if (!missing) {
			throw firstErr;
		}
	}

	try {
		const schedule = await stripe.subscriptionSchedules.retrieve(id);
		await stripe.subscriptionSchedules.cancel(schedule.id);
		const subRef = schedule.subscription;
		const subId =
			typeof subRef === "string"
				? subRef
				: subRef &&
						typeof subRef === "object" &&
						subRef !== null &&
						"id" in subRef
					? (subRef as { id: string }).id
					: null;
		if (subId) {
			const sub = await stripe.subscriptions.retrieve(subId).catch(() => null);
			if (sub && sub.status !== "canceled") {
				await stripe.subscriptions.cancel(subId, {
					invoice_now: true,
					prorate: false,
				});
			}
		}
	} catch (scheduleErr: unknown) {
		logger.error("Cancel platform billing: schedule path failed", {
			metadata: {
				stripeObjectId: id,
				error:
					scheduleErr instanceof Error
						? scheduleErr.message
						: String(scheduleErr),
			},
			tags: ["stripe", "unsubscribe", "error"],
		});
		throw scheduleErr;
	}
}
