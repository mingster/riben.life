"use server";

import { updateStoreRsvpSchema } from "./update-store-rsvp.validation";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";

export const updateStoreRsvpAction = storeOwnerActionClient
	.metadata({ name: "updateStoreRsvp" })
	.schema(updateStoreRsvpSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, acceptReservation } = parsedInput;

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
					},
				});

		return { rsvpSettings };
	});
