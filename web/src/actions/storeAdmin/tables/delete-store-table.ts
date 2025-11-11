"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";

import { deleteStoreTableSchema } from "./delete-store-table.validation";

export const deleteStoreTableAction = storeOwnerActionClient
	.metadata({ name: "deleteStoreTable" })
	.schema(deleteStoreTableSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const table = await sqlClient.storeTables.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!table || table.storeId !== storeId) {
			throw new SafeError("Table not found");
		}

		await sqlClient.storeTables.delete({
			where: { id },
		});

		return { id };
	});
