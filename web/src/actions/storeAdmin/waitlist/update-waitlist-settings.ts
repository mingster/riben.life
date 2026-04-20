"use server";

import { sqlClient } from "@/lib/prismadb";
import { ensureWaitListSettingsRow } from "@/lib/store/waitlist/ensure-waitlist-settings";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { updateWaitlistSettingsSchema } from "./update-waitlist-settings.validation";

export const updateWaitlistSettingsAction = storeActionClient
	.metadata({ name: "updateWaitlistSettings" })
	.schema(updateWaitlistSettingsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			enabled,
			requireSignIn,
			requireName,
			requireLineOnly,
			canGetNumBefore,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});
		if (!store) {
			throw new SafeError("Store not found");
		}

		await ensureWaitListSettingsRow(sqlClient, storeId);

		const now = getUtcNowEpoch();
		const row = await sqlClient.waitListSettings.update({
			where: { storeId },
			data: {
				enabled,
				requireSignIn,
				requireName,
				requireLineOnly,
				canGetNumBefore,
				updatedAt: now,
			},
		});

		transformPrismaDataForJson(row);
		return { waitListSettings: row };
	});
