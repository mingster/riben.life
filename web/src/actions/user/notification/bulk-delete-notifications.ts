"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";
import { SafeError } from "@/utils/error";

const bulkDeleteNotificationsSchema = z.object({
	notificationIds: z
		.array(z.string().min(1))
		.min(1, "At least one notification ID is required"),
});

export const bulkDeleteNotificationsAction = userRequiredActionClient
	.metadata({ name: "bulkDeleteNotifications" })
	.schema(bulkDeleteNotificationsSchema)
	.action(async ({ parsedInput, ctx }) => {
		const userId = ctx.userId;
		const { notificationIds } = parsedInput;

		logger.info("Bulk deleting notifications", {
			metadata: { userId, count: notificationIds.length },
			tags: ["notification", "user", "bulk-delete"],
		});

		// Verify all notifications belong to the user
		const notifications = await sqlClient.messageQueue.findMany({
			where: {
				id: { in: notificationIds },
			},
		});

		const invalidNotifications = notifications.filter(
			(n) => n.recipientId !== userId,
		);

		if (invalidNotifications.length > 0) {
			throw new SafeError("Some notifications do not belong to this user");
		}

		// Soft delete by marking as deleted by recipient
		const result = await sqlClient.messageQueue.updateMany({
			where: {
				id: { in: notificationIds },
				recipientId: userId,
			},
			data: {
				isDeletedByRecipient: true,
			},
		});

		logger.info("Notifications bulk deleted", {
			metadata: { userId, count: result.count },
			tags: ["notification", "user", "bulk-deleted"],
		});

		return { count: result.count };
	});
