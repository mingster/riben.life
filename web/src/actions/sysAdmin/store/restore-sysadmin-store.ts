"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

import { transformPrismaDataForJson } from "@/utils/utils";

import { restoreSysAdminStoreSchema } from "./restore-sysadmin-store.validation";

export const restoreSysAdminStoreAction = adminActionClient
	.metadata({ name: "restoreSysAdminStore" })
	.schema(restoreSysAdminStoreSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

		const existing = await sqlClient.store.findFirst({
			where: { id },
		});

		if (!existing) {
			throw new SafeError("Store not found.");
		}

		if (!existing.isDeleted) {
			throw new SafeError("Store is not deleted.");
		}

		await sqlClient.store.update({
			where: { id },
			data: {
				isDeleted: false,
				updatedAt: getUtcNowEpoch(),
			},
		});

		const row = await sqlClient.store.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				ownerId: true,
				defaultCurrency: true,
				defaultCountry: true,
				defaultLocale: true,
				updatedAt: true,
				isDeleted: true,
				isOpen: true,
				acceptAnonymousOrder: true,
				autoAcceptOrder: true,
				Organization: { select: { id: true, name: true, slug: true } },
			},
		});

		if (!row) {
			throw new SafeError("Store not found after restore.");
		}

		transformPrismaDataForJson(row);

		logger.info("SysAdmin restored store", {
			metadata: { storeId: id },
			tags: ["sysAdmin", "store", "restore"],
		});

		return { store: row };
	});
