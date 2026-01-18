import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { RsvpStatus } from "@/types/enum";
import logger from "@/lib/logger";

export interface CleanupUnpaidRsvpsResult {
	success: boolean;
	deleted: number;
	deletedOrders: number;
	ageMinutes: number;
	message: string;
	error?: string;
}

/**
 * Server action to cleanup unpaid RSVPs older than a specified time threshold.
 * This action is designed to be called by cron jobs.
 *
 * @param ageMinutes - Minimum age in minutes before deleting (default: 30)
 * @returns Result object with deletion counts and status
 */
export const cleanupUnpaidRsvps = async (
	ageMinutes: number = 30,
): Promise<CleanupUnpaidRsvpsResult> => {
	const startTime = Date.now();
	const log = logger.child({ module: "cleanupUnpaidRsvps" });

	try {
		// Validate ageMinutes
		if (Number.isNaN(ageMinutes) || ageMinutes < 0) {
			return {
				success: false,
				deleted: 0,
				deletedOrders: 0,
				ageMinutes,
				message: "Invalid ageMinutes parameter",
				error: "Invalid ageMinutes parameter",
			};
		}

		// Calculate the cutoff time (epoch milliseconds)
		const now = getUtcNowEpoch();
		const cutoffTime = now - BigInt(ageMinutes * 60 * 1000);

		// Find unpaid RSVPs older than cutoff time
		// Exclude RSVPs that are confirmed by store (confirmedByStore = true)
		const unpaidRsvps = await sqlClient.rsvp.findMany({
			where: {
				alreadyPaid: false,
				status: RsvpStatus.Pending, // RsvpStatus.Pending = 0 (尚未付款)
				confirmedByStore: false, // Do not delete RSVPs confirmed by store
				createdAt: {
					lt: cutoffTime,
				},
			},
			select: {
				id: true,
				storeId: true,
				customerId: true,
				orderId: true,
				createdAt: true,
			},
		});

		if (unpaidRsvps.length === 0) {
			return {
				success: true,
				deleted: 0,
				deletedOrders: 0,
				ageMinutes,
				message: "No unpaid RSVPs to delete",
			};
		}

		// Extract order IDs that need to be deleted (only orders that are related to RSVPs being deleted)
		const orderIds = unpaidRsvps
			.map((rsvp) => rsvp.orderId)
			.filter(
				(orderId): orderId is string =>
					orderId !== null && orderId !== undefined,
			);

		const rsvpIds = unpaidRsvps.map((rsvp) => rsvp.id);

		// Delete RSVPs and related StoreOrders in a transaction for atomicity
		const result = await sqlClient.$transaction(async (tx) => {
			// Delete related StoreOrders first (if any)
			let deletedOrdersCount = 0;
			if (orderIds.length > 0) {
				const deleteOrdersResult = await tx.storeOrder.deleteMany({
					where: {
						id: {
							in: orderIds,
						},
					},
				});
				deletedOrdersCount = deleteOrdersResult.count;
			}

			// Delete unpaid RSVPs
			const deleteResult = await tx.rsvp.deleteMany({
				where: {
					id: {
						in: rsvpIds,
					},
				},
			});

			return {
				deletedRsvps: deleteResult.count,
				deletedOrders: deletedOrdersCount,
			};
		});

		const duration = Date.now() - startTime;

		// Log the cleanup
		log.info("Cleaned up unpaid RSVPs", {
			metadata: {
				deleted: result.deletedRsvps,
				deletedOrders: result.deletedOrders,
				ageMinutes,
				cutoffTime: Number(cutoffTime),
				duration,
				storeIds: [...new Set(unpaidRsvps.map((r) => r.storeId))],
			},
			tags: ["cron", "cleanup", "rsvp"],
		});

		return {
			success: true,
			deleted: result.deletedRsvps,
			deletedOrders: result.deletedOrders,
			ageMinutes,
			message: `Successfully deleted ${result.deletedRsvps} unpaid RSVP(s) and ${result.deletedOrders} related order(s) older than ${ageMinutes} minutes`,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		log.error("Failed to cleanup unpaid RSVPs", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				duration,
			},
			tags: ["cron", "cleanup", "rsvp", "error"],
		});

		return {
			success: false,
			deleted: 0,
			deletedOrders: 0,
			ageMinutes,
			message: "Failed to cleanup unpaid RSVPs",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
};
