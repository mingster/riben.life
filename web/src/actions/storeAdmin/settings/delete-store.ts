"use server";

import { deleteStoreSchema } from "./delete-store.validation";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";

export const deleteStoreAction = storeOwnerActionClient
	.metadata({ name: "deleteStore" })
	.schema(deleteStoreSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const storeToUpdate = await sqlClient.store.findUnique({
			where: {
				id: storeId,
				ownerId: userId,
			},
			include: {
				StoreOrders: true,
			},
		});

		if (!storeToUpdate) {
			throw new SafeError("Store not found");
		}

		if (storeToUpdate.StoreOrders.length === 0) {
			await sqlClient.storePaymentMethodMapping.deleteMany({
				where: { storeId },
			});
			await sqlClient.storeShipMethodMapping.deleteMany({
				where: { storeId },
			});
			await sqlClient.storeSettings.deleteMany({
				where: { storeId },
			});

			const deletedStore = await sqlClient.store.delete({
				where: { id: storeId },
			});

			return { store: deletedStore, deletedCompletely: true };
		}

		const updatedStore = await sqlClient.store.update({
			where: { id: storeId },
			data: {
				isDeleted: true,
			},
		});

		return { store: updatedStore, deletedCompletely: false };
	});
