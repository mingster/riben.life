"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformDecimalsToNumbers } from "@/utils/utils";

const getRsvpSettingsSchema = z.object({
	storeId: z.string().uuid(),
});

export const getRsvpSettingsAction = storeOwnerActionClient
	.metadata({ name: "getRsvpSettings" })
	.schema(getRsvpSettingsSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		// Verify store exists and user has access
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Get RsvpSettings or return null if doesn't exist
		const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
		});
		transformDecimalsToNumbers(rsvpSettings);

		return { rsvpSettings };
	});
