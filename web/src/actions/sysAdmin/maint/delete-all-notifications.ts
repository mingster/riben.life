"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllNotifications = async () => {
	// Delete all notification-related data
	// Delete NotificationDeliveryStatus first (may have foreign keys)
	const deliveryStatusCount =
		await sqlClient.notificationDeliveryStatus.deleteMany({
			where: {},
		});

	// Delete all message queues
	const messageQueueCount = await sqlClient.messageQueue.deleteMany({
		where: {},
	});

	// Delete all email queues
	const emailQueueCount = await sqlClient.emailQueue.deleteMany({
		where: {},
	});

	logger.info("Deleted all notification data", {
		metadata: {
			messageQueueCount: messageQueueCount.count,
			emailQueueCount: emailQueueCount.count,
			deliveryStatusCount: deliveryStatusCount.count,
		},
		tags: ["action", "maintenance", "notifications"],
	});

	return {
		messageQueueCount: messageQueueCount.count,
		emailQueueCount: emailQueueCount.count,
		deliveryStatusCount: deliveryStatusCount.count,
	};
};
