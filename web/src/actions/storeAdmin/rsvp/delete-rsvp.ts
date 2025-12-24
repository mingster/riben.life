"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";

import { deleteRsvpSchema } from "./delete-rsvp.validation";

export const deleteRsvpAction = storeActionClient
	.metadata({ name: "deleteRsvp" })
	.schema(deleteRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: { id: true, storeId: true, status: true },
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		// Store admins can delete any RSVP regardless of status
		// Actually delete from database (hard delete)
		await sqlClient.rsvp.delete({
			where: { id },
		});

		return { id };
	});
