"use server";

import { updateUserSettingsSchema } from "@/actions/update-user-settings.validation";
import { sqlClient } from "@/lib/prismadb";
import { actionClientUser } from "@/utils/actions/safe-action";

export const updateUserSettingsAction = actionClientUser
	.metadata({ name: "updateUserSettings" })
	.schema(updateUserSettingsSchema)
	.action(async ({ ctx: { userId }, parsedInput: { name, locale } }) => {
		await sqlClient.user.update({
			where: { id: userId },
			data: { name, locale },
		});
	});
