"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { createRsvpBlacklistSchema } from "./create-rsvp-blacklist.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { mapRsvpBlacklistToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp-settings/components/rsvp-blacklist-column";

export const createRsvpBlacklistAction = storeActionClient
	.metadata({ name: "createRsvpBlacklist" })
	.schema(createRsvpBlacklistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { userId } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Check if user exists
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new SafeError("User not found");
		}

		// Check if already blacklisted
		const existing = await sqlClient.rsvpBlacklist.findFirst({
			where: {
				storeId,
				userId,
			},
		});

		if (existing) {
			throw new SafeError("User is already blacklisted");
		}

		try {
			const blacklist = await sqlClient.rsvpBlacklist.create({
				data: {
					storeId,
					userId,
					createdAt: getUtcNowEpoch(),
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
					...blacklist,
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
