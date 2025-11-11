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

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
				ownerId: userId,
			},
			data: {
				acceptReservation,
				updatedAt: getUtcNow(),
			},
		});

		return { store };
	});
