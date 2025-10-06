"use server";

import { adminActionClient } from "@/utils/actions/safe-action";
import { updatePlatformSettingsSchema } from "./update-platform-settings.validation";
import { sqlClient } from "@/lib/prismadb";

interface KeyValuePair {
	key: string;
	value: string;
}

// Convert key-value pairs to JSON string
const keyValuePairsToJson = (pairs: KeyValuePair[]): string => {
	const obj: Record<string, string> = {};
	pairs.forEach((pair) => {
		if (pair.key.trim()) {
			obj[pair.key.trim()] = pair.value;
		}
	});
	return JSON.stringify(obj, null, 2);
};

export const updatePlatformSettingsAction = adminActionClient
	.metadata({ name: "updatePlatformSettings" })
	.schema(updatePlatformSettingsSchema)
	.action(
		async ({
			parsedInput: { id, stripeProductId, stripePriceId, settings },
		}) => {
			console.log(
				"updatePlatformSettingsAction",
				id,
				stripeProductId,
				stripePriceId,
				settings,
			);

			// convert settings key-value pairs to json string
			//const settingsJson = JSON.stringify(settings);
			//console.log("settingsJson", settingsJson);

			//if there's no id, this is a new object
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				//create new platform settings
				const newPlatformSettings = await sqlClient.platformSettings.create({
					data: {
						stripeProductId,
						stripePriceId,
						settings,
					},
				});
				id = newPlatformSettings.id;
			} else {
				//update existing platform settings
				await sqlClient.platformSettings.update({
					where: { id },
					data: {
						stripeProductId,
						stripePriceId,
						settings,
					},
				});
			}

			const result = await sqlClient.platformSettings.findFirst({
				where: { id },
			});

			return result;
		},
	);
