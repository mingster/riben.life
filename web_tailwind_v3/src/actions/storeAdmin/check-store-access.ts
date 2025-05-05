import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@prisma/client";

//NOTE - checkStoreAdminAccess is called to protect api routes.
// It returns null if theuser is not store owner; otherwise return store object.
//
const checkStoreAdminAccess = async (
	storeId: string,
	ownerId: string,
): Promise<Store | null> => {
	if (!storeId) {
		throw Error("storeId is required");
	}
	if (!ownerId) {
		throw Error("ownerId is required");
	}

	const store = await sqlClient.store.findFirst({
		where: {
			id: storeId,
			ownerId: ownerId,
		},
		include: {
			StorePaymentMethods: true,
			StoreShippingMethods: true,
		},
	});

	return store;
};

export default checkStoreAdminAccess;
