"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sendStoreNotificationSchema } from "./send-store-notification.validation";
import { notificationService } from "@/lib/notification";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const sendStoreNotificationAction = storeActionClient
	.metadata({ name: "sendStoreNotification" })
	.schema(sendStoreNotificationSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user?.id) {
			throw new Error("Unauthorized");
		}

		const senderId = session.user.id;

		logger.info("Sending store notification", {
			metadata: {
				senderId,
				storeId,
				recipientType: parsedInput.recipientType,
				recipientCount: parsedInput.recipientIds?.length || "all",
				channels: parsedInput.channels,
				notificationType: parsedInput.notificationType,
			},
			tags: ["notification", "store", "send"],
		});

		// Get recipient IDs based on recipient type
		let recipientIds: string[] = [];

		if (parsedInput.recipientType === "all") {
			// Get all customers for this store (users who are members of the store's organization)
			const store = await sqlClient.store.findUnique({
				where: { id: storeId },
				select: { organizationId: true },
			});

			if (!store?.organizationId) {
				throw new Error("Store organization not found");
			}

			// Get all members of the organization
			const members = await sqlClient.member.findMany({
				where: {
					organizationId: store.organizationId,
				},
				select: { userId: true },
			});

			recipientIds = members.map((m) => m.userId);
		} else if (parsedInput.recipientType === "multiple") {
			// Use selected users
			if (!parsedInput.recipientIds || parsedInput.recipientIds.length === 0) {
				throw new Error("At least one recipient must be selected");
			}
			recipientIds = parsedInput.recipientIds;
		} else {
			// Single recipient
			if (!parsedInput.recipientIds || parsedInput.recipientIds.length !== 1) {
				throw new Error(
					"Exactly one recipient must be selected for single recipient type",
				);
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
			storeId, // Store notifications have a store
			subject: parsedInput.subject,
			message: parsedInput.message,
			notificationType: parsedInput.notificationType || "system",
			actionUrl: parsedInput.actionUrl || null,
			priority,
			channels: parsedInput.channels,
			templateId: parsedInput.templateId || null,
			templateVariables: {}, // Can be extended later
		});

		logger.info("Store notification sent", {
			metadata: {
				storeId,
				total: result.total,
				successful: result.successful,
				failed: result.failed,
			},
			tags: ["notification", "store", "sent"],
		});

		return {
			total: result.total,
			successful: result.successful,
			failed: result.failed,
		};
	});
