"use server";

import { updateStoreBankSchema } from "./update-store-bank.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";

export const updateStoreBankAction = storeActionClient
	.metadata({ name: "updateStoreBank" })
	.schema(updateStoreBankSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, payoutSchedule, bankCode, bankAccount, bankAccountName } =
			parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
				ownerId: userId,
			},
			data: {
				payoutSchedule,
				bankCode,
				bankAccount,
				bankAccountName,
				updatedAt: getUtcNow(),
			},
		});

		return { store };
	});
