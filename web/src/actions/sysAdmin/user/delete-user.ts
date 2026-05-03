"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { deleteUserSchema } from "./delete-user.validation";
import logger from "@/lib/logger";
import { removeUserDataAndAuth } from "./remove-user-data";

export const deleteUserAction = adminActionClient
	.metadata({ name: "deleteUser" })
	.schema(deleteUserSchema)
	.action(async ({ parsedInput }) => {
		const { userEmail } = parsedInput;

		logger.info("Deleting user", {
			metadata: { userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		const user = await sqlClient.user.findUnique({
			where: {
				email: userEmail,
			},
		});

		if (!user) {
			throw new SafeError("User not found");
		}

		await removeUserDataAndAuth({
			userId: user.id,
			userEmail: user.email as string,
		});

		logger.info("User deleted successfully", {
			metadata: { userId: user.id, userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		return {
			success: true,
			message: "user deleted",
			userId: user.id,
		};
	});
