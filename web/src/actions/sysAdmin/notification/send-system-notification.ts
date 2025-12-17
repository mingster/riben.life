"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { sendSystemNotificationSchema } from "./send-system-notification.validation";
import { notificationService } from "@/lib/notification";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const sendSystemNotificationAction = adminActionClient
	.metadata({ name: "sendSystemNotification" })
	.schema(sendSystemNotificationSchema)
	.action(async ({ parsedInput }) => {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user?.id) {
			throw new Error("Unauthorized");
		}

		const senderId = session.user.id;

		logger.info("Sending system notification", {
			metadata: {
				senderId,
				recipientType: parsedInput.recipientType,
				recipientCount: parsedInput.recipientIds?.length || "all",
				channels: parsedInput.channels,
			},
			tags: ["notification", "system", "send"],
		});

		// Get recipient IDs
		let recipientIds: string[] = [];

		if (parsedInput.recipientType === "all") {
			// Get all users
			const allUsers = await sqlClient.user.findMany({
				select: { id: true },
			});
			recipientIds = allUsers.map((u) => u.id);
		} else {
			// Use selected users
			if (!parsedInput.recipientIds || parsedInput.recipientIds.length === 0) {
				throw new Error("At least one recipient must be selected");
			}
			recipientIds = parsedInput.recipientIds;
		}

		if (recipientIds.length === 0) {
			throw new Error("No recipients found");
		}

		// Convert priority string to number
		const priority = parseInt(parsedInput.priority, 10) as 0 | 1 | 2;

		// Send bulk notifications
		const result = await notificationService.sendBulkNotifications({
			recipientIds,
			senderId,
			storeId: null, // System notifications don't have a store
			subject: parsedInput.subject,
			message: parsedInput.message,
			notificationType: "system",
			actionUrl: parsedInput.actionUrl || null,
			priority,
			channels: parsedInput.channels,
			templateId: parsedInput.templateId || null,
			templateVariables: {}, // Can be extended later
		});

		logger.info("System notification sent", {
			metadata: {
				total: result.total,
				successful: result.successful,
				failed: result.failed,
			},
			tags: ["notification", "system", "sent"],
		});

		return {
			total: result.total,
			successful: result.successful,
			failed: result.failed,
		};
	});
