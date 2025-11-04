import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import logger from "@/lib/logger";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreSubscription } from "@prisma/client";
import { StoreEditTabs } from "./tabs";

const StoreEditPage = async (props: {
	params: Promise<{ storeId: string }>;
}) => {
	const params = await props.params;
	const store = await sqlClient.store.findUnique({
		where: {
			id: params.storeId,
		},
		include: {
			Categories: true,
			StoreAnnouncement: true,
			Owner: true,
			Products: true,
			StoreOrders: true,
		},
	});
	transformDecimalsToNumbers(store);

	//console.log(`store: ${JSON.stringify(store)}`);

	const action = "Edit";
	//if (user === null) action = "New";

	if (store === null) return;

	const subscription = (await sqlClient.storeSubscription.findUnique({
		where: {
			storeId: store.id,
		},
	})) as StoreSubscription;

	logger.info("subscription");

	/*
	const subscriptionScheduleId = subscription?.subscriptionId as string;

	logger.info("subscriptionScheduleId");

	let subscriptionSchedule = null;
	try {
		subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
			subscriptionScheduleId,
		);
	} catch (err) {
		logger.error(err);
	}
	logger.info("subscriptionSchedule");
	*/

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<StoreEditTabs
					initialData={store}
					subscription={subscription}
					action={action}
				/>
			</div>
		</div>
	);
};

export default StoreEditPage;
