import type { MessageQueue } from "@prisma/client";
import type { Notification, NotificationPriority } from "./types";

function toNotificationPriority(value: number): NotificationPriority {
	if (value <= 0) return 0;
	if (value >= 2) return 2;
	return 1;
}

/**
 * Maps a Prisma MessageQueue row to the channel adapter {@link Notification} shape.
 */
export function messageQueueToNotification(mq: MessageQueue): Notification {
	return {
		id: mq.id,
		senderId: mq.senderId,
		recipientId: mq.recipientId,
		storeId: mq.storeId,
		subject: mq.subject,
		message: mq.message,
		notificationType: mq.notificationType,
		actionUrl: mq.actionUrl,
		htmlBodyFooter: mq.htmlBodyFooter ?? undefined,
		lineFlexPayload: mq.lineFlexPayload ?? undefined,
		priority: toNotificationPriority(mq.priority),
		createdAt: mq.createdAt,
		updatedAt: mq.updatedAt,
		isRead: mq.isRead,
		isDeletedByAuthor: mq.isDeletedByAuthor,
		isDeletedByRecipient: mq.isDeletedByRecipient,
	};
}
