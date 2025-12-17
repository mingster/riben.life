"use server";

import { sqlClient } from "@/lib/prismadb";
import type { Locale } from "@prisma/client";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateLocaleSchema } from "./update-locale.validation";
import logger from "@/lib/logger";

export const updateLocaleAction = adminActionClient
	.metadata({ name: "updateLocale" })
	.schema(updateLocaleSchema)
	.action(async ({ parsedInput: { id, name, lng, defaultCurrencyId } }) => {
		logger.info("updateLocaleAction", {
			metadata: { id, name, lng, defaultCurrencyId },
			tags: ["locale", "action"],
		});

		// Verify currency exists
		const currency = await sqlClient.currency.findUnique({
			where: { id: defaultCurrencyId },
		});

		if (!currency) {
			throw new Error(`Currency not found: ${defaultCurrencyId}`);
		}

		// If id is "new" or empty, create new locale
		if (id === undefined || id === null || id === "" || id === "new") {
			// Use lng as the ID if no ID is provided
			const localeId = lng.trim();

			if (!localeId || localeId.length === 0) {
				throw new Error("Language code (lng) is required to create a locale.");
			}

			// Check if locale with this ID already exists
			const existing = await sqlClient.locale.findUnique({
				where: { id: localeId },
			});

			if (existing) {
				throw new Error(
					`Locale with ID "${localeId}" already exists. Please use a different ID or edit the existing locale.`,
				);
			}

			const result = await sqlClient.locale.create({
				data: {
					id: localeId, // Use lng as the ID (must be unique, max 5 chars)
					name,
					lng,
					defaultCurrencyId,
				},
			});
			return result;
		} else {
			// Ensure ID is trimmed
			const localeId = id.trim();

			if (!localeId || localeId.length === 0) {
				throw new Error("Locale ID is required.");
			}

			// Check if locale exists to determine create vs update
			const existingLocale = await sqlClient.locale.findUnique({
				where: { id: localeId },
			});

			if (!existingLocale) {
				// Locale doesn't exist, so this is a create operation
				logger.info("Locale not found, treating as create", {
					metadata: { id: localeId, name, lng, defaultCurrencyId },
					tags: ["locale", "create"],
				});

				const result = await sqlClient.locale.create({
					data: {
						id: localeId,
						name,
						lng,
						defaultCurrencyId,
					},
				});
				return result;
			}

			// Locale exists, so this is an update operation
			// Update the locale (ID cannot be changed after creation)
			await sqlClient.locale.update({
				where: { id: localeId },
				data: {
					name,
					lng,
					defaultCurrencyId,
				},
			});

			const result = (await sqlClient.locale.findUnique({
				where: { id: localeId },
			})) as Locale;

			return result;
		}
	});
