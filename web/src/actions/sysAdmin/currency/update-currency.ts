"use server";

import { sqlClient } from "@/lib/prismadb";
import type { Currency } from "@prisma/client";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateCurrencySchema } from "./update-currency.validation";
import logger from "@/lib/logger";

export const updateCurrencyAction = adminActionClient
	.metadata({ name: "updateCurrency" })
	.schema(updateCurrencySchema)
	.action(
		async ({
			parsedInput: {
				id,
				name,
				symbol,
				ISOdigits,
				ISOnum,
				decimals,
				demonym,
				majorPlural,
				majorSingle,
				minorPlural,
				minorSingle,
				numToBasic,
				symbolNative,
			},
		}) => {
			logger.info("updateCurrencyAction", {
				metadata: { id, name },
				tags: ["currency", "action"],
			});

			// If id is "new" or empty, create new currency
			if (id === undefined || id === null || id === "" || id === "new") {
				throw new Error(
					"Currency ID is required. Cannot create currency without ID.",
				);
			} else {
				// Update existing currency
				await sqlClient.currency.update({
					where: { id },
					data: {
						name,
						symbol: symbol || null,
						ISOdigits: ISOdigits || null,
						ISOnum: ISOnum || null,
						decimals: decimals || null,
						demonym,
						majorPlural: majorPlural || null,
						majorSingle: majorSingle || null,
						minorPlural: minorPlural || null,
						minorSingle: minorSingle || null,
						numToBasic: numToBasic || null,
						symbolNative,
					},
				});

				const result = (await sqlClient.currency.findUnique({
					where: { id },
				})) as Currency;

				return result;
			}
		},
	);

export const createCurrencyAction = adminActionClient
	.metadata({ name: "createCurrency" })
	.schema(updateCurrencySchema)
	.action(
		async ({
			parsedInput: {
				id,
				name,
				symbol,
				ISOdigits,
				ISOnum,
				decimals,
				demonym,
				majorPlural,
				majorSingle,
				minorPlural,
				minorSingle,
				numToBasic,
				symbolNative,
			},
		}) => {
			logger.info("createCurrencyAction", {
				metadata: { id, name },
				tags: ["currency", "action"],
			});

			if (!id || id === "new") {
				throw new Error("Currency ID is required for creation");
			}

			const result = await sqlClient.currency.create({
				data: {
					id,
					name,
					symbol: symbol || null,
					ISOdigits: ISOdigits || null,
					ISOnum: ISOnum || null,
					decimals: decimals || null,
					demonym,
					majorPlural: majorPlural || null,
					majorSingle: majorSingle || null,
					minorPlural: minorPlural || null,
					minorSingle: minorSingle || null,
					numToBasic: numToBasic || null,
					symbolNative,
				},
			});

			return result;
		},
	);
