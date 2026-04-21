"use server";

import { z } from "zod";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";

export const listSavedCustomizationsAction = userRequiredActionClient
	.metadata({ name: "listSavedCustomizations" })
	.schema(z.object({}))
	.action(async ({ ctx: { userId } }) => {
		const rows = await sqlClient.savedProductCustomization.findMany({
			where: { userId },
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				productId: true,
				productName: true,
				updatedAt: true,
				createdAt: true,
			},
		});

		transformPrismaDataForJson(rows);
		return { items: rows };
	});
