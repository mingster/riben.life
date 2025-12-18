"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";
import { SafeError } from "@/utils/error";

const deleteNotificationSchema = z.object({
	notificationId: z.string().min(1, "Notification ID is required"),
});

export const deleteNotificationAction = userRequiredActionClient
	.metadata({ name: "deleteNotification" })
	.schema(deleteNotificationSchema)
	.action(async ({ parsedInput, ctx }) => {
		const userId = ctx.userId;
		const { notificationId } = parsedInput;

		logger.info("Deleting notification", {
			metadata: { userId, notificationId },
			tags: ["notification", "user", "delete"],
		});

		// Verify the notification belongs to the user
		const notification = await sqlClient.messageQueue.findUnique({
			where: { id: notificationId },
		});

		if (!notification) {
			throw new SafeError("Notification not found");
		}

		if (notification.recipientId !== userId) {
			throw new SafeError("Notification does not belong to this user");
		}

		// Soft delete by marking as deleted by recipient
		const updated = await sqlClient.messageQueue.update({
			where: { id: notificationId },
			data: {
				isDeletedByRecipient: true,
			},
		});

		logger.info("Notification deleted", {
			metadata: { userId, notificationId },
			tags: ["notification", "user", "deleted"],
		});

		return updated;
	});
