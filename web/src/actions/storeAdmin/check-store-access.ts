/**
 * @deprecated This function has been deprecated due to over-fetching issues.
 *
 * **Problem**: This function loads ALL products, ALL orders, and all related data
 * for every store access check, causing:
 * - Slow page loads (500-2000ms queries)
 * - High memory usage
 * - Wasted database resources
 *
 * **Migration**: Use the new modular approach instead:
 *
 * ```typescript
 * // Old approach (loads everything)
 * import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
 * const store = await checkStoreAdminAccess(storeId, ownerId);
 *
 * // New approach (loads only what you need)
 * import { checkStoreOwnership, getStoreWithRelations } from "@/lib/store-access";
 *
 * // For access check only (minimal data)
 * const store = await checkStoreOwnership(storeId, ownerId);
 *
 * // For specific data needs
 * const store = await getStoreWithRelations(storeId, {
 *   includeCategories: true,
 *   includePaymentMethods: true,
 * });
 * ```
 *
 * This function is kept for backward compatibility but should not be used in new code.
 */

import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@prisma/client";

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
			Owner: true,
			Products: true,
			StoreOrders: {
				orderBy: {
					updatedAt: "desc",
				},
			},
			StoreShippingMethods: {
				include: {
					ShippingMethod: true,
				},
			},
			StorePaymentMethods: {
				include: {
					PaymentMethod: true,
				},
			},
			Categories: true,
			StoreAnnouncement: {
				orderBy: {
					updatedAt: "desc",
				},
			},
		},
	});

	return store;
};

export default checkStoreAdminAccess;
