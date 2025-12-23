"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteRsvpBlacklistSchema } from "./delete-rsvp-blacklist.validation";

export const deleteRsvpBlacklistAction = storeActionClient
	.metadata({ name: "deleteRsvpBlacklist" })
	.schema(deleteRsvpBlacklistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const blacklist = await sqlClient.rsvpBlacklist.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!blacklist || blacklist.storeId !== storeId) {
			throw new SafeError("Blacklist entry not found");
		}

		await sqlClient.rsvpBlacklist.delete({
			where: { id },
		});

		return { id };
	});
