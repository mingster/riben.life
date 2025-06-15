import { sqlClient } from "@/lib/prismadb";

import type {
	Store,
	StorePaymentMethodMapping,
	StoreShipMethodMapping,
} from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";

const getStoreById = async (storeId: string): Promise<Store> => {
	if (!storeId) {
		throw Error("storeId is required");
	}

	const store = (await sqlClient.store.findFirst({
		where: {
			id: storeId,
		},
		include: {
			Categories: {
				where: { isFeatured: true },
				orderBy: { sortOrder: "asc" },
			},
			//StoreAnnouncement: true,
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
		},
	})) as Store;

	if (!store) {
		throw Error("store not found");
	}

	if (store.StorePaymentMethods.length === 0) {
		const defaultPaymentMethods = (await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as PaymentMethod[];

		// add default payment methods to the store
		// skip if store already has the method(s)
		defaultPaymentMethods.map((paymentMethod) => {
			if (
				!store.StorePaymentMethods.find(
					(existingMethod: { id: string }) =>
						existingMethod.id === paymentMethod.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: paymentMethod.id,
					PaymentMethod: paymentMethod,
				} as StorePaymentMethodMapping;

				store.StorePaymentMethods.push(mapping);
			}
		});
	}

	if (store.StoreShippingMethods.length === 0) {
		// add default shipping methods to the store
		// skip if store already has the method(s)
		const defaultShippingMethods = (await sqlClient.shippingMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as ShippingMethod[];

		defaultShippingMethods.map((method) => {
			if (
				!store.StoreShippingMethods.find(
					(existingMethod: { id: string }) => existingMethod.id === method.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: method.id,
					ShippingMethod: method,
				} as StoreShipMethodMapping;

				store.StoreShippingMethods.push(mapping);
			}
		});
	}

	transformDecimalsToNumbers(store);

	return store;
};
export default getStoreById;
