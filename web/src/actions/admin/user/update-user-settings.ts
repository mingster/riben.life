"use server";

import { actionClientUser } from "@/utils/actions/safe-action";
import { updateUserSettingsSchema } from "@/actions/admin/user/update-user-settings.validation";
import { sqlClient } from "@/lib/prismadb";
import type { Role } from "@prisma/client";

export const updateUserSettingsAction = actionClientUser
	.metadata({ name: "updateUserSettings" })
	.schema(updateUserSettingsSchema)
	.action(async ({ ctx: { userId }, parsedInput: { name, locale, role } }) => {
		await sqlClient.user.update({
			where: { id: userId },
			data: { name, locale, role: role as Role },
		});
	});
