"use server";

import { updateUserSettingsSchema } from "@/actions/sysAdmin/user/user.validation";
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
				phoneNumber,
				phoneNumberVerified,
				image,
				twoFactorEnabled,
				banned,
				banReason,
				banExpires,
			},
		}) => {
			// Convert banExpires ISO string to DateTime if provided
			const banExpiresDate = banExpires ? new Date(banExpires) : undefined;

			// Set banReason to null when banned is false
			const finalBanReason = banned === false ? null : banReason || null;

			await sqlClient.user.update({
				where: { id: id },
				data: {
					name,
					locale,
					timezone,
					role,
					stripeCustomerId,
					phoneNumber: phoneNumber === "" ? null : phoneNumber,
					phoneNumberVerified,
					image: image === "" ? null : image,
					twoFactorEnabled,
					banned,
					banReason: finalBanReason,
					banExpires: banExpiresDate,
				},
			});

			/*
			const updatedUser = await authClient.admin.setRole({
				userId: id,
				role: role as string,
			});
			*/

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
