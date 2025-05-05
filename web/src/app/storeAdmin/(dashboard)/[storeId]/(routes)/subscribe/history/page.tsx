import { Loader } from "@/components/ui/loader";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreAccess } from "@/lib/store-admin-utils";
import { stripe } from "@/lib/stripe/config";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
import { SubscriptionStatus } from "@/types/enum";
import { Suspense } from "react";
import { SubscriptionHistoryClient } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSubscriptionHistoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreAccess(params.storeId)) as Store;
	const subscription = await sqlClient.subscription.findUnique({
		where: {
			storeId: store.id,
		},
	});
	//transformDecimalsToNumbers(subscription);

	console.log("subscription", subscription);

	const payments = await sqlClient.subscriptionPayment.findMany({
		where: {
			storeId: store.id,
		},
	});
	transformDecimalsToNumbers(payments);

	console.log("payments", payments);

	let subscriptionSchedule = null;
	if (subscription !== null) {
		const subscriptionScheduleId = subscription.subscriptionId as string;

		try {
			subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
				subscriptionScheduleId,
			);

			// if no valid schedule, subscription status = SubscriptionStatus_Incctive
			subscription.status =
				subscriptionSchedule.status === "active"
					? SubscriptionStatus.Active
					: SubscriptionStatus.Inactive;
			/*
			// convert stripe date to js date
			const startDate = new Date(
				subscriptionSchedule?.current_phase?.start_date * 1000,
			);
			const endDate = new Date(
				subscriptionSchedule?.current_phase?.end_date * 1000,
			);

			console.log("startDate", startDate);
			console.log("endDate", endDate);
      */
		} catch (err) {
			logger.error(err);
		}

		console.log("subscriptionSchedule", subscriptionSchedule);
	}

	return (
		<Suspense fallback={<Loader />}>
			<section className="relative w-full">
				<div className="container">
					<SubscriptionHistoryClient
						store={store}
						subscription={subscription}
						payments={payments}
					/>
				</div>
			</section>
		</Suspense>
	);
}
