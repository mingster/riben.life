"use server";

import { z } from "zod";

import { parseBagCustomizationPayload } from "@/actions/product/customize-product.validation";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";

export const getSavedCustomizationForProductAction = userRequiredActionClient
	.metadata({ name: "getSavedCustomizationForProduct" })
	.schema(z.object({ productId: z.string().uuid() }))
	.action(async ({ ctx: { userId }, parsedInput: { productId } }) => {
		const row = await sqlClient.savedProductCustomization.findUnique({
			where: {
				userId_productId: { userId, productId },
			},
		});

		if (!row) {
			return { customization: null as null };
		}

		const parsed = parseBagCustomizationPayload(row.customization);
		if (!parsed.success) {
			return { customization: null as null };
		}

		const out = { customization: parsed.data, updatedAt: row.updatedAt };
		transformPrismaDataForJson(out);
		return out;
	});
