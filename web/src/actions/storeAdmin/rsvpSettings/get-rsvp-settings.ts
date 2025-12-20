"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";

const getRsvpSettingsSchema = z.object({});

export const getRsvpSettingsAction = storeActionClient
	.metadata({ name: "getRsvpSettings" })
	.schema(getRsvpSettingsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

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

		// Transform Decimal objects to numbers for client components
		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}

		return { rsvpSettings };
	});
