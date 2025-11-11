"use server";

import { mapStoreTableToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/tables/table-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createStoreTablesSchema } from "./create-store-tables.validation";

export const createStoreTablesAction = storeOwnerActionClient
	.metadata({ name: "createStoreTables" })
	.schema(createStoreTablesSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, prefix, numOfTables, capacity } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const operations = Array.from({ length: numOfTables }, (_, index) =>
			sqlClient.storeTables.create({
				data: {
					storeId,
					tableName: `${prefix}${index + 1}`,
					capacity,
				},
			}),
		);

		try {
			const createdTables = await sqlClient.$transaction(operations);

			return {
				createdTables: createdTables.map(mapStoreTableToColumn),
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
