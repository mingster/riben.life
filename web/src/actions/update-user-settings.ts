"use server";

import { updateUserSettingsSchema } from "@/actions/update-user-settings.validation";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";

export const updateUserSettingsAction = userRequiredActionClient
	.metadata({ name: "updateUserSettings" })
	.schema(updateUserSettingsSchema)
	.action(async ({ ctx: { userId }, parsedInput: { name, locale } }) => {
		await sqlClient.user.update({
			where: { id: userId },
			data: { name, locale },
		});
	});
