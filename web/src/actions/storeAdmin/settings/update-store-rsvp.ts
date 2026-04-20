"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { ensureWaitListSettingsRow } from "@/lib/store/waitlist/ensure-waitlist-settings";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStoreRsvpSchema } from "./update-store-rsvp.validation";

export const updateStoreRsvpAction = storeActionClient
	.metadata({ name: "updateStoreRsvp" })
	.schema(updateStoreRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { acceptReservation } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Ensure store belongs to the user
		await sqlClient.store.findFirstOrThrow({
			where: {
				id: storeId,
				ownerId: userId,
			},
			select: { id: true },
		});

		// Find existing RsvpSettings or create new one
		const existing = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
		});

		const rsvpSettings = existing
			? await sqlClient.rsvpSettings.update({
					where: { id: existing.id },
					data: {
						acceptReservation,
					},
				})
			: await sqlClient.rsvpSettings.create({
					data: {
						storeId,
						acceptReservation,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
					},
				});

		await ensureWaitListSettingsRow(sqlClient, storeId);

		// Transform Decimal objects to numbers for client components
		transformPrismaDataForJson(rsvpSettings);

		return { rsvpSettings };
	});
