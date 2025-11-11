"use server";

import { mapStoreTableToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/tables/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { updateStoreTableSchema } from "./update-store-table.validation";

export const updateStoreTableAction = storeOwnerActionClient
	.metadata({ name: "updateStoreTable" })
	.schema(updateStoreTableSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id, tableName, capacity } = parsedInput;

		const table = await sqlClient.storeTables.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!table || table.storeId !== storeId) {
			throw new SafeError("Table not found");
		}

		try {
			const updated = await sqlClient.storeTables.update({
				where: { id },
				data: {
					tableName,
					capacity,
				},
			});

			return {
				table: mapStoreTableToColumn(updated),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Table name already exists.");
			}

			throw error;
		}
	});
