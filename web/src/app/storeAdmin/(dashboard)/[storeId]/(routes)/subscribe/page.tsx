import { checkStoreAccess } from "@/lib/store-admin-utils";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import { Suspense } from "react";
import { PkgSelection } from "./pkgSelection";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSubscribePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	/*
  await sqlClient.subscription.deleteMany({
  });
  await sqlClient.subscriptionPayment.deleteMany({
  });
  await sqlClient.store.update({
	where: {
	  id: params.storeId,
	},
	data: {
	  level: StoreLevel.Free
	}
  });
  */

	const store = (await checkStoreAccess(params.storeId)) as Store;
	const subscription = await sqlClient.subscription.findUnique({
		where: {
			storeId: store.id,
		},
	});

	if (process.env.NODE_ENV === "development")
		console.log("subscription", subscription);

	/*
	if (subscription !== null) {
		const subscriptionScheduleId = subscription.subscriptionId as string;

		console.log("subscriptionScheduleId", subscriptionScheduleId);

		let subscriptionSchedule = null;
		try {
			if (subscriptionScheduleId !== null)
				subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
					subscriptionScheduleId,
				);
		} catch (err) {
			console.error(err);
			//logger.error(err);
		}
		console.log("subscriptionSchedule", subscriptionSchedule);
	}
	*/

	return (
		<Suspense fallback={<Loader />}>
			<section className="relative w-full">
				<div className="container">
					<PkgSelection store={store} subscription={subscription} />
				</div>
			</section>
		</Suspense>
	);
}
