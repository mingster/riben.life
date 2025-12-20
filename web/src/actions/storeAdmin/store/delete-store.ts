"use server";

import { deleteStoreSchema } from "./delete-store.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

export const deleteStoreAction = storeActionClient
	.metadata({ name: "deleteStore" })
	.schema(deleteStoreSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

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

		// if no orders, delete the store completely
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

			// Transform Decimal objects to numbers for client components
			transformPrismaDataForJson(deletedStore);

			return { store: deletedStore, deletedCompletely: true };
		}

		// otherwise mark the store as deleted only
		const updatedStore = await sqlClient.store.update({
			where: { id: storeId },
			data: {
				isDeleted: true,
			},
		});

		// Transform Decimal objects to numbers for client components
		transformPrismaDataForJson(updatedStore);

		return { store: updatedStore, deletedCompletely: false };
	});
