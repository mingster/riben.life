"use server";

import { mapStoreTableToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/tables/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createStoreTableSchema } from "./create-store-table.validation";

export const createStoreTableAction = storeOwnerActionClient
	.metadata({ name: "createStoreTable" })
	.schema(createStoreTableSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, tableName, capacity } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		try {
			const table = await sqlClient.storeFacility.create({
				data: {
					storeId,
					tableName,
					capacity,
				},
			});

			return {
				table: mapStoreTableToColumn(table),
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
