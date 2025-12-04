"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";

const getRsvpSettingsSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export const getRsvpSettingsAction = baseClient
	.metadata({ name: "getRsvpSettings" })
	.schema(getRsvpSettingsSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Fetch RsvpSettings
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
		});

		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}

		return {
			rsvpSettings,
		};
	});
