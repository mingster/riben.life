"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";

const deleteCurrencySchema = z.object({
	id: z.string().min(1, "Currency ID is required"),
});

export const deleteCurrencyAction = adminActionClient
	.metadata({ name: "deleteCurrency" })
	.schema(deleteCurrencySchema)
	.action(async ({ parsedInput: { id } }) => {
		logger.info("deleteCurrencyAction", {
			metadata: { id },
			tags: ["currency", "delete"],
		});

		// Check if currency is referenced by other tables
		const [shippingMethods, locales] = await Promise.all([
			sqlClient.shippingMethod.count({
				where: { currencyId: id },
			}),
			sqlClient.locale.count({
				where: { defaultCurrencyId: id },
			}),
		]);

		if (shippingMethods > 0 || locales > 0) {
			throw new Error(
				`Cannot delete currency: it is referenced by ${shippingMethods} shipping methods and ${locales} locales`,
			);
		}

		await sqlClient.currency.delete({
			where: { id },
		});

		return { success: true };
	});
