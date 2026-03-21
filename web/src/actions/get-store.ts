import { sqlClient } from "@/lib/prismadb";

import type {
	Store,
	StoreForOrderEdit,
	StorePaymentMethodMapping,
	StoreShipMethodMapping,
} from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import { StoreLevel } from "@/types/enum";

const getStoreWithCategories = async (storeId: string): Promise<Store> => {
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

	const storePaymentMethods = store.StorePaymentMethods ?? [];
	const storeShippingMethods = store.StoreShippingMethods ?? [];

	if (storePaymentMethods.length === 0) {
		const defaultPaymentMethods = (await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as PaymentMethod[];

		// add default payment methods to the store
		// skip if store already has the method(s)
		defaultPaymentMethods.map((paymentMethod) => {
			if (
				!storePaymentMethods.find(
					(existingMethod: { id: string }) =>
						existingMethod.id === paymentMethod.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: paymentMethod.id,
					PaymentMethod: paymentMethod,
				} as StorePaymentMethodMapping;

				storePaymentMethods.push(mapping);
			}
		});
	}

	if (storeShippingMethods.length === 0) {
		// add default shipping methods to the store
		// skip if store already has the method(s)
		const defaultShippingMethods = (await sqlClient.shippingMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as ShippingMethod[];

		defaultShippingMethods.map((method) => {
			if (
				!storeShippingMethods.find(
					(existingMethod: { id: string }) => existingMethod.id === method.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: method.id,
					ShippingMethod: method,
				} as StoreShipMethodMapping;

				storeShippingMethods.push(mapping);
			}
		});
	}

	store.StorePaymentMethods = storePaymentMethods;
	store.StoreShippingMethods = storeShippingMethods;

	// Filter out cash payment method for Free-tier stores
	// Cash is only available for Pro (2) or Multi (3) level stores
	if (store.level === StoreLevel.Free) {
		store.StorePaymentMethods = storePaymentMethods.filter(
			(mapping: { PaymentMethod: { payUrl: string } }) =>
				mapping.PaymentMethod.payUrl !== "cash",
		);
	}

	transformPrismaDataForJson(store);

	return store;
};

const orderEditInclude = {
	Categories: {
		where: { isFeatured: true },
		orderBy: { sortOrder: "asc" as const },
		include: {
			ProductCategories: {
				include: {
					Product: {
						include: {
							ProductImages: true,
							ProductAttribute: true,
							ProductOptions: {
								include: {
									ProductOptionSelections: true,
								},
							},
						},
					},
				},
			},
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
} as const;

/**
 * Store load for store admin order create/edit: featured categories with products (add-item modal), plus payment/shipping.
 */
export async function getStoreForOrderEdit(
	storeId: string,
): Promise<StoreForOrderEdit> {
	if (!storeId) {
		throw Error("storeId is required");
	}

	const store = await sqlClient.store.findFirst({
		where: { id: storeId },
		include: orderEditInclude,
	});

	if (!store) {
		throw Error("store not found");
	}

	const storePaymentMethods = store.StorePaymentMethods ?? [];
	const storeShippingMethods = store.StoreShippingMethods ?? [];

	if (storePaymentMethods.length === 0) {
		const defaultPaymentMethods = (await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as PaymentMethod[];

		defaultPaymentMethods.map((paymentMethod) => {
			if (
				!storePaymentMethods.find(
					(existingMethod: { id: string }) =>
						existingMethod.id === paymentMethod.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: paymentMethod.id,
					PaymentMethod: paymentMethod,
				} as StorePaymentMethodMapping;

				storePaymentMethods.push(mapping);
			}
		});
	}

	if (storeShippingMethods.length === 0) {
		const defaultShippingMethods = (await sqlClient.shippingMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as ShippingMethod[];

		defaultShippingMethods.map((method) => {
			if (
				!storeShippingMethods.find(
					(existingMethod: { id: string }) => existingMethod.id === method.id,
				)
			) {
				const mapping = {
					storeId: store.id,
					methodId: method.id,
					ShippingMethod: method,
				} as StoreShipMethodMapping;

				storeShippingMethods.push(mapping);
			}
		});
	}

	store.StorePaymentMethods = storePaymentMethods;
	store.StoreShippingMethods = storeShippingMethods;

	if (store.level === StoreLevel.Free) {
		store.StorePaymentMethods = storePaymentMethods.filter(
			(mapping: { PaymentMethod: { payUrl: string } }) =>
				mapping.PaymentMethod.payUrl !== "cash",
		);
	}

	transformPrismaDataForJson(store);

	return store as StoreForOrderEdit;
}

export default getStoreWithCategories;
