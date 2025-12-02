"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteRsvpSchema } from "./delete-rsvp.validation";

export const deleteRsvpAction = storeActionClient
	.metadata({ name: "deleteRsvp" })
	.schema(deleteRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		await sqlClient.rsvp.delete({
			where: { id },
		});

		return { id };
	});
