"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const markAllNotificationsReadAction = userRequiredActionClient
	.metadata({ name: "markAllNotificationsRead" })
	.action(async ({ ctx }) => {
		const userId = ctx.userId;

		logger.info("Marking all notifications as read", {
			metadata: { userId },
			tags: ["notification", "user", "mark-all-read"],
		});

		const now = getUtcNowEpoch();

		// Update all unread notifications for this user
		const result = await sqlClient.messageQueue.updateMany({
			where: {
				recipientId: userId,
				isDeletedByRecipient: false,
				isRead: false,
			},
			data: {
				isRead: true,
				updatedAt: now,
			},
		});

		logger.info("All notifications marked as read", {
			metadata: { userId, count: result.count },
			tags: ["notification", "user", "marked-all-read"],
		});

		return { count: result.count };
	});
