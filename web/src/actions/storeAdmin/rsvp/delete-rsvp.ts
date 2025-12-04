"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { RsvpStatus } from "@/types/enum";

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

		// Only allow deletion of pending or cancelled RSVPs
		if (
			rsvp.status !== RsvpStatus.Pending &&
			rsvp.status !== RsvpStatus.Cancelled
		) {
			throw new SafeError(
				"Only pending or cancelled reservations can be deleted.",
			);
		}

		// Actually delete from database (hard delete)
		await sqlClient.rsvp.delete({
			where: { id },
		});

		return { id };
	});
