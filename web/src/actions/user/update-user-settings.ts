"use server";

import { updateUserSettingsSchema } from "@/actions/user/update-user-settings.validation";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { getUtcNow } from "@/utils/datetime-utils";

export const updateUserSettingsAction = userRequiredActionClient
	.metadata({ name: "updateUserSettings" })
	.schema(updateUserSettingsSchema)
	.action(
		async ({
			ctx: { userId },
			parsedInput: { name, locale, timezone, phone },
		}) => {
			const updatedUser = await sqlClient.user.update({
				where: { id: userId },
				data: { name, locale, timezone, phone, updatedAt: getUtcNow() },
			});

			return updatedUser;
		},
	);
