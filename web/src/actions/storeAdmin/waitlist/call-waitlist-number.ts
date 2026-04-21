"use server";

import { WaitListStatus } from "@prisma/client";
import { getT } from "@/app/i18n";
import { NotificationService } from "@/lib/notification/notification-service";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { callWaitlistNumberSchema } from "./call-waitlist-number.validation";

/** Send in-app notification when customer is signed in (customerId set). */
async function sendWaitlistCalledInAppNotification(
	storeId: string,
	storeOwnerId: string,
	customerId: string,
	queueNumber: number,
	locale?: string | null,
) {
	const { t } = await getT(locale ?? "en");
	const now = getUtcNowEpoch();
	await sqlClient.messageQueue.create({
		data: {
			senderId: storeOwnerId,
			recipientId: customerId,
			storeId,
			subject: `${t("waitlist_status_called")} #${queueNumber}`,
			message: t("waitlist_status_called_message"),
			createdAt: now,
			updatedAt: now,
			notificationType: "waitlist",
			actionUrl: `/s/${storeId}/waitlist`,
		},
	});
}

/** Send LINE notification for LIFF-linked users when their waitlist number is called. */
async function sendWaitlistCalledLineNotification(
	storeId: string,
	storeOwnerId: string,
	customerId: string,
	queueNumber: number,
	locale?: string | null,
) {
	const { t } = await getT(locale ?? "en");
	const notificationService = new NotificationService();
	const notification = await notificationService.createNotification({
		senderId: storeOwnerId,
		recipientId: customerId,
		storeId,
		subject: `${t("waitlist_status_called")} #${queueNumber}`,
		message: t("waitlist_status_called_message"),
		notificationType: "system",
		actionUrl: `/liff/waitlist?storeId=${storeId}`,
		priority: 1,
		channels: ["line"],
	});
	await notificationService.sendNotification(notification.id);
}

export const callWaitlistNumberAction = storeActionClient
	.metadata({ name: "callWaitlistNumber" })
	.schema(callWaitlistNumberSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { waitlistId } = parsedInput;

		const entry = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
			include: {
				Store: { select: { name: true, ownerId: true } },
				Customer: {
					select: {
						name: true,
						phoneNumber: true,
						email: true,
						line_userId: true,
						locale: true,
					},
				},
			},
		});

		if (!entry) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.storeId !== storeId) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.status !== WaitListStatus.waiting) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_already_called") || "This number was already called",
			);
		}

		const now = getUtcNowEpoch();
		const rawWait = now - entry.createdAt;
		const waitTimeMs = rawWait > BigInt(0) ? rawWait : BigInt(0);

		const updated = await sqlClient.waitList.update({
			where: { id: waitlistId },
			data: {
				status: WaitListStatus.called,
				notifiedAt: now,
				updatedAt: now,
				waitTimeMs,
			},
		});

		// In-app notification for signed-in customer
		if (entry.customerId && entry.Store?.ownerId) {
			try {
				await sendWaitlistCalledInAppNotification(
					storeId,
					entry.Store.ownerId,
					entry.customerId,
					entry.queueNumber,
					entry.Customer?.locale,
				);
			} catch {
				// Non-fatal: entry was already updated
			}

			// LINE notification for LIFF-linked customer
			if (entry.Customer?.line_userId) {
				try {
					await sendWaitlistCalledLineNotification(
						storeId,
						entry.Store.ownerId,
						entry.customerId,
						entry.queueNumber,
						entry.Customer?.locale,
					);
				} catch {
					// Non-fatal: entry was already updated
				}
			}
		}

		transformPrismaDataForJson(updated);
		return { entry: updated };
	});
