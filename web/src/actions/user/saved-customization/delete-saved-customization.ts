"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";

import { deleteSavedCustomizationSchema } from "./saved-customization.validation";

export const deleteSavedCustomizationAction = userRequiredActionClient
	.metadata({ name: "deleteSavedCustomization" })
	.schema(deleteSavedCustomizationSchema)
	.action(async ({ ctx: { userId }, parsedInput }) => {
		if (parsedInput.id) {
			const result = await sqlClient.savedProductCustomization.deleteMany({
				where: { userId, id: parsedInput.id },
			});
			return { deleted: result.count };
		}

		const result = await sqlClient.savedProductCustomization.deleteMany({
			where: { userId, productId: parsedInput.productId! },
		});
		return { deleted: result.count };
	});
