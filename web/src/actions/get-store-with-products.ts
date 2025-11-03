import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import type {
	StorePaymentMethodMapping,
	StoreShipMethodMapping,
	StoreWithProducts,
} from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";

const getStoreWithProducts = async (
	storeId: string,
): Promise<StoreWithProducts> => {
	// Validate storeId format and prevent reserved routes from being treated as storeIds
	if (isReservedRoute(storeId)) {
		throw new Error(
			`Invalid storeId: "${storeId}" is a reserved route or invalid format`,
		);
	}

	const store = await sqlClient.store.findFirst({
		where: {
			id: storeId,
		},
		include: {
			StoreTables: true,
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
			Categories: {
				where: { isFeatured: true },
				orderBy: { sortOrder: "asc" },
				include: {
					ProductCategories: {
						//where: { Product: { status: ProductStatus.Published } },
						include: {
							Product: {
								//where: { status: ProductStatus.Published },
								include: {
									ProductImages: true,
									ProductAttribute: true,
									//ProductCategories: true,
									ProductOptions: {
										include: {
											ProductOptionSelections: true,
										},
										orderBy: {
											sortOrder: "asc",
										},
									},
								},
							},
						},
						orderBy: { sortOrder: "asc" },
					},
				},
			},
		},
	});

	if (!store) {
		console.error(`Store not found: storeId="${storeId}"`);
		console.error("Attempted query returned null. Verify that:");
		console.error("1. The store exists in the database");
		console.error("2. The storeId format is correct (should be a UUID/GUID)");
		console.error(
			"3. You've created at least one store via /storeAdmin or /sysAdmin/stores",
		);

		throw new Error(`Store not found with id: ${storeId}`);
	}

	// add default payment methods to the store
	// skip if store already has the method(s)
	if (store.StorePaymentMethods.length === 0) {
		const defaultPaymentMethods = (await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as PaymentMethod[];

		defaultPaymentMethods.map((paymentMethod) => {
			if (
				!store.StorePaymentMethods.find(
					(existingMethod) => existingMethod.id === paymentMethod.id,
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

	// add default shipping methods to the store
	// skip if store already has the method(s)
	if (store.StoreShippingMethods.length === 0) {
		const defaultShippingMethods = (await sqlClient.shippingMethod.findMany({
			where: {
				isDefault: true,
			},
		})) as ShippingMethod[];

		defaultShippingMethods.map((method) => {
			if (
				!store.StoreShippingMethods.find(
					(existingMethod) => existingMethod.id === method.id,
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

export default getStoreWithProducts;
