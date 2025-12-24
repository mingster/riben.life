"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateRsvpBlacklistSchema } from "./update-rsvp-blacklist.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { mapRsvpBlacklistToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp-settings/components/rsvp-blacklist-column";

export const updateRsvpBlacklistAction = storeActionClient
	.metadata({ name: "updateRsvpBlacklist" })
	.schema(updateRsvpBlacklistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id, userId } = parsedInput;

		const blacklist = await sqlClient.rsvpBlacklist.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!blacklist || blacklist.storeId !== storeId) {
			throw new SafeError("Blacklist entry not found");
		}

		// Check if user exists
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new SafeError("User not found");
		}

		// Check if another entry already exists for this user
		const existing = await sqlClient.rsvpBlacklist.findFirst({
			where: {
				storeId,
				userId,
				id: {
					not: id,
				},
			},
		});

		if (existing) {
			throw new SafeError("User is already blacklisted");
		}

		try {
			const updated = await sqlClient.rsvpBlacklist.update({
				where: { id },
				data: {
					userId,
					updatedAt: getUtcNowEpoch(),
				},
			});

			// Fetch user data separately
			const user = await sqlClient.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					email: true,
				},
			});

			return {
				blacklist: mapRsvpBlacklistToColumn({
					...updated,
					User: user,
				}),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("User is already blacklisted");
			}

			throw error;
		}
	});
