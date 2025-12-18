"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import logger from "@/lib/logger";
import { transformPrismaDataForJson } from "@/utils/utils";

export const getUserPreferencesAction = userRequiredActionClient
	.metadata({ name: "getUserPreferences" })
	.action(async ({ ctx }) => {
		const userId = ctx.userId;

		logger.info("Fetching user notification preferences", {
			metadata: { userId },
			tags: ["notification", "user", "preferences", "fetch"],
		});

		// Get global user preferences (storeId is null)
		const globalPreferences = await sqlClient.notificationPreferences.findFirst(
			{
				where: {
					userId,
					storeId: null,
				},
			},
		);

		// Get all store-specific preferences for this user
		const storePreferences = await sqlClient.notificationPreferences.findMany({
			where: {
				userId,
				storeId: { not: null },
			},
			include: {
				Store: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		// Get stores the user has access to (for showing available stores)
		const stores = await sqlClient.store.findMany({
			where: {
				OR: [
					{ ownerId: userId },
					{
						Organization: {
							members: {
								some: {
									userId,
								},
							},
						},
					},
				],
				isDeleted: false,
			},
			select: {
				id: true,
				name: true,
			},
			orderBy: {
				name: "asc",
			},
		});

		// Transform BigInt and Decimal to numbers for JSON serialization
		if (globalPreferences) {
			transformPrismaDataForJson([globalPreferences]);
		}
		transformPrismaDataForJson(storePreferences);
		transformPrismaDataForJson(stores);

		logger.info("User notification preferences fetched", {
			metadata: {
				userId,
				hasGlobal: !!globalPreferences,
				storeCount: storePreferences.length,
			},
			tags: ["notification", "user", "preferences", "fetched"],
		});

		return {
			globalPreferences,
			storePreferences,
			stores,
		};
	});
