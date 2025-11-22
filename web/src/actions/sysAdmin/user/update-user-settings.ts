"use server";

import { updateUserSettingsSchema } from "@/actions/sysAdmin/user/update-user-settings.validation";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import type { Role } from "@prisma/client";

export const updateUserSettingsAction = userRequiredActionClient
	.metadata({ name: "updateUserSettings" })
	.schema(updateUserSettingsSchema)
	.action(async ({ ctx: { userId }, parsedInput: { name, locale, role } }) => {
		await sqlClient.user.update({
			where: { id: userId },
			data: { name, locale, role: role as Role },
		});
	});
