"use server";

import { sqlClient } from "@/lib/prismadb";
import type { MessageQueue } from "@/types";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateMessageQueueSchema } from "./update-message-queue.validation";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const updateMessageQueueAction = adminActionClient
	.metadata({ name: "updateMessageQueue" })
	.schema(updateMessageQueueSchema)
	.action(
		async ({
			parsedInput: {
				id,
				senderId,
				recipientId,
				storeId,
				subject,
				message,
				notificationType,
				actionUrl,
				priority,
				isRead,
				isDeletedByAuthor,
				isDeletedByRecipient,
			},
		}) => {
			// If there's no id or id is "new", this is a new object
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.messageQueue.create({
					data: {
						senderId,
						recipientId,
						storeId: storeId || null,
						subject,
						message,
						notificationType: notificationType || null,
						actionUrl: actionUrl || null,
						priority: priority ?? 0,
						isRead: isRead ?? false,
						isDeletedByAuthor: isDeletedByAuthor ?? false,
						isDeletedByRecipient: isDeletedByRecipient ?? false,
						sendTries: 0,
						createdAt: getUtcNowEpoch(),
						updatedAt: getUtcNowEpoch(),
						sentOn: null,
					},
					include: {
						Sender: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						Recipient: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				});
				return result as MessageQueue;
			} else {
				// Update existing record
				const result = await sqlClient.messageQueue.update({
					where: { id },
					data: {
						senderId,
						recipientId,
						storeId: storeId || null,
						subject,
						message,
						notificationType: notificationType || null,
						actionUrl: actionUrl || null,
						priority: priority ?? 0,
						isRead: isRead ?? false,
						isDeletedByAuthor: isDeletedByAuthor ?? false,
						isDeletedByRecipient: isDeletedByRecipient ?? false,
						updatedAt: getUtcNowEpoch(),
					},
					include: {
						Sender: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						Recipient: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				});
				return result as MessageQueue;
			}
		},
	);
