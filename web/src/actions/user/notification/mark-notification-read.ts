"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

const markNotificationReadSchema = z.object({
	notificationId: z.string().min(1, "Notification ID is required"),
});

export const markNotificationReadAction = userRequiredActionClient
	.metadata({ name: "markNotificationRead" })
	.schema(markNotificationReadSchema)
	.action(async ({ parsedInput, ctx }) => {
		const userId = ctx.userId;
		const { notificationId } = parsedInput;

		logger.info("Marking notification as read", {
			metadata: { userId, notificationId },
			tags: ["notification", "user", "mark-read"],
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

		if (notification.isDeletedByRecipient) {
			throw new SafeError("Notification has been deleted");
		}

		// Update notification
		const updated = await sqlClient.messageQueue.update({
			where: { id: notificationId },
			data: {
				isRead: true,
				updatedAt: getUtcNowEpoch(),
			},
		});

		logger.info("Notification marked as read", {
			metadata: { userId, notificationId },
			tags: ["notification", "user", "marked-read"],
		});

		return updated;
	});
