import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";
import { StoreLevel } from "@/types/enum";
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
		const subscriptions = await sqlClient.subscription.findUnique({
			where: {
				storeId,
			},
		});

		//console.log("store is pro. exp is: ", subscriptions?.expiration);

		if (subscriptions && subscriptions.expiration > getUtcNow()) {
			return true;
		}
	}

	return false;
};

export default isProLevel;
