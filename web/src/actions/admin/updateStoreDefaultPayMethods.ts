"use server";
import { sqlClient } from "@/lib/prismadb";

export const updateStoreDefaultPayMethods = async () => {
	// add default payment methods to all store that does not have the payment methods yet
	const stores = await sqlClient.store.findMany({});

	const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
		where: {
			isDefault: true,
		},
	});

	for (const store of stores) {
		for (const defaultPaymentMethod of defaultPaymentMethods) {
			// delete default payment method that already exists
			await sqlClient.storePaymentMethodMapping.deleteMany({
				where: {
					storeId: store.id,
					methodId: defaultPaymentMethod.id,
				},
			});

			// add default payment methods for each store
			await sqlClient.storePaymentMethodMapping.create({
				data: {
					storeId: store.id,
					methodId: defaultPaymentMethod.id,
				},
			});
		}
	}
	console.log("default payment method updated.");
};
