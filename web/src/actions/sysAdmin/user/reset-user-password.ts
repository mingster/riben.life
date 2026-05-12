"use server";

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sendAuthPasswordResetCompleted } from "@/lib/mail/send-auth-password-reset-completed";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { headers } from "next/headers";
import { z } from "zod";

const setUserPasswordSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const setUserPasswordAction = adminActionClient
	.metadata({ name: "setUserPassword" })
	.schema(setUserPasswordSchema)
	.action(async ({ parsedInput }) => {
		// Get the current session to get admin user ID
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const adminId = session?.user?.id || "unknown";

		const log = logger.child({
			module: "SetUserPasswordAction",
			adminId,
			userId: parsedInput.userId,
		});

		try {
			const user = await sqlClient.user.findUnique({
				where: { id: parsedInput.userId },
				select: { email: true },
			});

			if (!user?.email) {
				return {
					serverError: "User not found",
				};
			}

			log.info("Admin setting new password for user", {
				metadata: {
					adminId,
					userId: parsedInput.userId,
				},
				tags: ["admin", "set-password", "initiate"],
			});

			// Use better-auth admin API to set user password
			const result = await auth.api.setUserPassword({
				body: {
					newPassword: parsedInput.newPassword,
					userId: parsedInput.userId,
				},
				headers: await headers(),
			});

			// Check if the operation was successful
			if (!result.status) {
				log.error("Failed to set user password", {
					metadata: {
						userId: parsedInput.userId,
						result,
					},
					tags: ["admin", "set-password", "error"],
				});

				return {
					serverError: "Failed to set user password",
				};
			}

			log.info("User password set successfully", {
				metadata: {
					userId: parsedInput.userId,
				},
				tags: ["admin", "set-password", "success"],
			});

			await sendAuthPasswordResetCompleted(user.email, parsedInput.newPassword);

			return {
				data: {
					success: true,
					message: "User password has been set successfully",
				},
			};
		} catch (error) {
			log.error("Unexpected error during password setting", {
				metadata: {
					error: error instanceof Error ? error.message : "Unknown error",
					userId: parsedInput.userId,
				},
				tags: ["admin", "set-password", "error"],
			});

			return {
				serverError:
					"An unexpected error occurred while setting the user password",
			};
		}
	});
