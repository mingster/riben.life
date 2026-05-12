import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type { Store } from "@prisma/client";

const isProLevel = async (storeId: string): Promise<boolean> => {
	if (!storeId) {
		throw Error("storeId is required");
	}

	const store = await sqlClient.store.findFirst({
		where: {
			id: storeId,
		},
	});
	if (!store) {
		return false;
	}

	//console.log("store level", store.level);

	if (store.level === StoreLevel.Free) return false;

	if (store.level === StoreLevel.Pro || store.level === StoreLevel.Multi) {
		const subscriptions = await sqlClient.storeSubscription.findUnique({
			where: {
				storeId,
			},
		});

		//console.log("store is pro. exp is: ", subscriptions?.expiration);

		if (subscriptions && subscriptions.expiration > getUtcNowEpoch()) {
			return true;
		}
	}

	return false;
};

export default isProLevel;
