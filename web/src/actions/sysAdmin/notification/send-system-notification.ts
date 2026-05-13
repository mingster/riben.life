"use server";

import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { sendSystemNotificationSchema } from "./send-system-notification.validation";
import { notificationService } from "@/lib/notification";
import { createSysAdminMinimalTemplateVariablesResolver } from "@/lib/notification/create-sysadmin-minimal-template-variables-resolver";
import { createSysAdminTemplateSampleVariablesResolver } from "@/lib/notification/create-sysadmin-template-sample-variables-resolver";
import type { SysAdminTemplateSampleDomain } from "@/lib/notification/create-sysadmin-template-sample-variables-resolver";
import { getPlatformAppName } from "@/lib/platform-settings/get-platform-app-name";
import { getPlatformSupportEmail } from "@/lib/platform-settings/get-platform-support-email";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Relative path; channels resolve to absolute URLs where needed. */
const SYSTEM_BULK_NOTIFICATION_ACTION_PATH = "/account/notifications";

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

		const templateId =
			parsedInput.templateId != null && parsedInput.templateId.trim() !== ""
				? parsedInput.templateId
				: null;
		const sampleStore = await sqlClient.store.findFirst({
			select: { id: true, name: true },
			orderBy: { createdAt: "asc" },
		});
		const sampleStoreId = sampleStore?.id ?? "sample_store";
		const sampleStoreName = sampleStore?.name ?? "Sample Store";

		const supportEmail = await getPlatformSupportEmail();
		const platformName = await getPlatformAppName();

		const bulkBase = {
			recipientIds,
			senderId,
			storeId: null as string | null,
			subject: parsedInput.subject,
			message: parsedInput.message,
			notificationType: "system" as const,
			actionUrl: SYSTEM_BULK_NOTIFICATION_ACTION_PATH,
			priority,
			channels: parsedInput.channels,
			templateId,
			templateVariables: {},
		};

		const sampleDomain = parsedInput.templateSampleDomain;
		const resolveTemplateVariables =
			templateId == null
				? undefined
				: sampleDomain !== "none"
					? createSysAdminTemplateSampleVariablesResolver({
							domain: sampleDomain as SysAdminTemplateSampleDomain,
							sampleStoreId,
							sampleStoreName,
							supportEmail,
							platformName,
						})
					: createSysAdminMinimalTemplateVariablesResolver({
							sampleStoreId,
							sampleStoreName,
							supportEmail,
							platformName,
						});

		const result = await notificationService.sendBulkNotifications({
			...bulkBase,
			...(resolveTemplateVariables != null ? { resolveTemplateVariables } : {}),
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
