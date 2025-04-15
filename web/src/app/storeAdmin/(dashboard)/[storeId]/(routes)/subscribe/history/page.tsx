import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { Loader } from "@/components/ui/loader";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import type { Store } from "@/types";
import { Suspense } from "react";

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

	console.log("subscription", subscription);

	const payments = await sqlClient.subscriptionPayment.findMany({
		where: {
			storeId: store.id,
		},
	});
	console.log("payments", payments);

	if (subscription !== null) {
		const subscriptionScheduleId = subscription.stripeSubscriptionId as string;

		console.log("subscriptionScheduleId", subscriptionScheduleId);

		let subscriptionSchedule = null;
		try {
			subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
				subscriptionScheduleId,
			);
		} catch (err) {
			logger.error(err);
		}
		console.log("subscriptionSchedule", subscriptionSchedule);
	}

	return (
		<Suspense fallback={<Loader />}>
			<section className="relative w-full">
				<div className="container">
					{JSON.stringify(subscription)}
					<div>{JSON.stringify(payments)}</div>
				</div>
			</section>
		</Suspense>
	);
}
