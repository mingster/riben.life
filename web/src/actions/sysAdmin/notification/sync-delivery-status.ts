"use server";

import logger from "@/lib/logger";
import { getChannelAdapter } from "@/lib/notification/channels";
import { DeliveryTracker } from "@/lib/notification/delivery-tracker";
import type {
	DeliveryStatus,
	NotificationChannel,
} from "@/lib/notification/types";
import { sqlClient } from "@/lib/prismadb";
import { syncDeliveryStatusSchema } from "./sync-delivery-status.validation";

// Ensure adapters are registered
import "@/lib/notification";
import { adminActionClient } from "@/utils/actions/safe-action";

const deliveryTracker = new DeliveryTracker();

/**
 * Core logic for syncing delivery statuses
 * Separated so it can be called from both server actions and API routes
 */
export async function syncDeliveryStatusInternal(options?: {
	notificationId?: string;
	channel?: string;
}) {
	const { notificationId, channel } = options || {};
	const log = logger.child({ module: "syncDeliveryStatusInternal" });

	try {
		// Find delivery statuses to sync
		const where: any = {
			status: { in: ["pending", "sent"] },
		};

		if (notificationId) {
			where.notificationId = notificationId;
		}

		if (channel) {
			where.channel = channel;
		}

		const statusesToSync = await sqlClient.notificationDeliveryStatus.findMany({
			where,
			include: {
				Notification: true,
			},
		});

		if (statusesToSync.length === 0) {
			return { processed: 0, updated: 0 };
		}

		let updatedCount = 0;

		for (const statusRecord of statusesToSync) {
			if (!statusRecord.messageId) {
				log.warn("Skipping sync - no messageId", {
					metadata: {
						notificationId: statusRecord.notificationId,
						channel: statusRecord.channel,
					},
				});
				continue;
			}

			const adapter = getChannelAdapter(
				statusRecord.channel as NotificationChannel,
			);
			if (!adapter) {
				log.warn("Skipping sync - adapter not found", {
					metadata: { channel: statusRecord.channel },
				});
				continue;
			}

			try {
				const deliveryInfo = await adapter.getDeliveryStatus(
					statusRecord.messageId,
				);

				// Only update if status changed
				if (deliveryInfo.status !== statusRecord.status) {
					await deliveryTracker.updateStatus(
						statusRecord.notificationId,
						statusRecord.channel as NotificationChannel,
						deliveryInfo.status as DeliveryStatus,
						{
							messageId: statusRecord.messageId,
							deliveredAt: deliveryInfo.deliveredAt
								? BigInt(deliveryInfo.deliveredAt)
								: undefined,
							error: deliveryInfo.error,
						},
					);

					// If successfully sent or delivered, update the message queue record too if needed
					if (
						deliveryInfo.status === "sent" ||
						deliveryInfo.status === "delivered" ||
						deliveryInfo.status === "read"
					) {
						const notification = await sqlClient.messageQueue.findUnique({
							where: { id: statusRecord.notificationId },
						});

						if (notification && !notification.sentOn) {
							await sqlClient.messageQueue.update({
								where: { id: statusRecord.notificationId },
								data: {
									sentOn: deliveryInfo.deliveredAt
										? BigInt(deliveryInfo.deliveredAt)
										: statusRecord.createdAt,
								},
							});
						}
					}

					updatedCount++;
					log.info("Status updated", {
						metadata: {
							notificationId: statusRecord.notificationId,
							channel: statusRecord.channel,
							oldStatus: statusRecord.status,
							newStatus: deliveryInfo.status,
						},
					});
				}
			} catch (error) {
				log.error("Failed to sync status for record", {
					metadata: {
						notificationId: statusRecord.notificationId,
						channel: statusRecord.channel,
						error: error instanceof Error ? error.message : String(error),
					},
				});
			}
		}

		return { processed: statusesToSync.length, updated: updatedCount };
	} catch (error) {
		log.error("Failed to sync delivery statuses", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
		});
		throw error;
	}
}

/**
 * Server action for syncing delivery statuses
 * Requires admin authentication
 */
export const syncDeliveryStatusAction = adminActionClient
	.metadata({ name: "syncDeliveryStatus" })
	.schema(syncDeliveryStatusSchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await syncDeliveryStatusInternal(parsedInput);
			return { data: result };
		} catch (error) {
			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to sync delivery statuses",
			};
		}
	});
