"use server";

import { updateUserSettingsSchema } from "@/actions/sysAdmin/user/user.validation";
import { authClient } from "@/lib/auth-client";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { adminActionClient } from "@/utils/actions/safe-action";

export const updateUserAction = adminActionClient
	.metadata({ name: "updateUser" })
	.schema(updateUserSettingsSchema)
	.action(
		async ({
			parsedInput: {
				id,
				name,
				email,
				locale,
				timezone,
				role,
				stripeCustomerId,
				password,
			},
		}) => {
			await sqlClient.user.update({
				where: { id: id },
				data: { name, locale, timezone, role, stripeCustomerId },
			});

			const updatedUser = await authClient.admin.setRole({
				userId: id,
				role: role as "user" | "admin" | ("user" | "admin")[],
			});

			const result = (await sqlClient.user.findUnique({
				where: { id },
				include: {
					accounts: true,
					sessions: true,
					twofactors: true,
					apikeys: true,
					passkeys: true,
					members: true,
					invitations: true,
				},
			})) as User;

			return result;
		},
	);
