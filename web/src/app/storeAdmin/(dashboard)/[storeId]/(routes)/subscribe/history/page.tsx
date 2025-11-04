import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { SubscriptionStatus } from "@/types/enum";
import logger from "@/lib/logger";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { SubscriptionHistoryClient } from "./client";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSubscriptionHistoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [store, subscription, payments] = await Promise.all([
		getStoreWithRelations(params.storeId) as Store,
		sqlClient.storeSubscription.findUnique({
			where: { storeId: params.storeId },
		}),
		sqlClient.subscriptionPayment.findMany({
			where: { storeId: params.storeId },
		}),
	]);

	transformDecimalsToNumbers(payments);

	// Get Stripe subscription schedule if exists
	let subscriptionSchedule = null;
	if (subscription !== null) {
		const subscriptionScheduleId = subscription.subscriptionId as string;

		try {
			subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
				subscriptionScheduleId,
			);

			// Update subscription status based on Stripe schedule
			subscription.status =
				subscriptionSchedule.status === "active"
					? SubscriptionStatus.Active
					: SubscriptionStatus.Inactive;
		} catch (err) {
			logger.error("Failed to retrieve Stripe subscription schedule", {
				metadata: {
					subscriptionScheduleId,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["subscription", "stripe", "error"],
			});
		}
	}

	if (process.env.NODE_ENV === "development") {
		console.log("subscription", subscription);
		console.log("payments", payments);
		console.log("subscriptionSchedule", subscriptionSchedule);
	}

	return (
		<section className="relative w-full">
			<div className="container">
				<SubscriptionHistoryClient
					store={store as Store}
					subscription={subscription}
					payments={payments}
				/>
			</div>
		</section>
	);
}
