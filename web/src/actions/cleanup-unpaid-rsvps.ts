import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import logger from "@/lib/logger";

export interface CleanupUnpaidRsvpsResult {
	success: boolean;
	deleted: number;
	deletedOrders: number;
	message: string;
	error?: string;
}

/**
 * Server action to cleanup unpaid RSVPs that have exceeded the age threshold.
 * This action is designed to be called by cron jobs.
 *
 * Business Logic:
 * - Unpaid RSVPs are allowed to block time slots for a maximum duration (default: 5 minutes)
 * - After the threshold time has elapsed, they are automatically deleted to free up the slot
 * - This prevents reservation system abuse while giving genuine customers time to complete payment
 *
 * @param ageMinutes - Minimum age in minutes before deleting unpaid RSVPs (default: 5 minutes)
 * @returns Result object with deletion counts and status
 */
export const cleanupUnpaidRsvps = async (
	ageMinutes: number = 5,
): Promise<CleanupUnpaidRsvpsResult> => {
	const startTime = Date.now();
	const log = logger.child({ module: "cleanupUnpaidRsvps" });

	try {
		// Calculate the cutoff time (RSVPs older than this age will be deleted)
		// Unpaid RSVPs must exist for at least ageMinutes before being eligible for deletion
		const cutoffTime = BigInt(Date.now() - ageMinutes * 60 * 1000); // Convert minutes to milliseconds

		log.info("Starting unpaid RSVP cleanup", {
			metadata: {
				ageMinutes,
				cutoffTime: Number(cutoffTime),
				currentTime: Date.now(),
			},
			tags: ["cron", "cleanup", "rsvp"],
		});

		// Find all unpaid RSVPs older than the age threshold
		// Include both Pending (0) and ReadyToConfirm (10) statuses as they are both unpaid
		// Exclude RSVPs that are confirmed by store (confirmedByStore = true)
		// Only delete if createdAt is older than cutoffTime
		const unpaidRsvps = await sqlClient.rsvp.findMany({
			where: {
				alreadyPaid: false,
				status: {
					in: [RsvpStatus.Pending, RsvpStatus.ReadyToConfirm], // Both are unpaid statuses
				},
				confirmedByStore: false, // Do not delete RSVPs confirmed by store
				createdAt: {
					lt: cutoffTime, // Less than (older than) cutoff time
				},
			},
			select: {
				id: true,
				storeId: true,
				customerId: true,
				orderId: true,
				status: true, // Include status for logging
				alreadyPaid: true, // Include for logging
				confirmedByStore: true, // Include for logging
				createdAt: true, // Include for age calculation
			},
		});

		// Log detailed information about found RSVPs for debugging
		log.info("Found unpaid RSVPs for cleanup", {
			metadata: {
				count: unpaidRsvps.length,
				rsvpIds: unpaidRsvps.map((r) => r.id),
				rsvpDetails: unpaidRsvps.map((r) => ({
					id: r.id,
					status: r.status,
					alreadyPaid: r.alreadyPaid,
					confirmedByStore: r.confirmedByStore,
				})),
			},
			tags: ["cron", "cleanup", "rsvp", "debug"],
		});

		if (unpaidRsvps.length === 0) {
			return {
				success: true,
				deleted: 0,
				deletedOrders: 0,
				message: "No unpaid RSVPs to delete",
			};
		}

		// Extract unique order IDs from unpaid RSVPs
		// These orders will also be deleted as they are associated with unpaid RSVPs
		const orderIds = unpaidRsvps
			.map((rsvp) => rsvp.orderId)
			.filter(
				(orderId): orderId is string =>
					orderId !== null && orderId !== undefined,
			);

		// Get unique order IDs (in case multiple RSVPs share the same order)
		const uniqueOrderIds = [...new Set(orderIds)];
		const rsvpIds = unpaidRsvps.map((rsvp) => rsvp.id);

		// Delete RSVPs and related StoreOrders in a transaction for atomicity
		const result = await sqlClient.$transaction(async (tx) => {
			// Delete associated StoreOrders first (before RSVPs to avoid cascade issues)
			// Note: Deleting orders will cascade delete RSVPs due to onDelete: Cascade,
			// but we also explicitly delete RSVPs to ensure complete cleanup
			let deletedOrdersCount = 0;
			if (uniqueOrderIds.length > 0) {
				const deleteOrdersResult = await tx.storeOrder.deleteMany({
					where: {
						id: {
							in: uniqueOrderIds,
						},
					},
				});
				deletedOrdersCount = deleteOrdersResult.count;
			}

			// Delete unpaid RSVPs
			// This ensures RSVPs without orders are also deleted
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
				duration,
				storeIds: [...new Set(unpaidRsvps.map((r) => r.storeId))],
			},
			tags: ["cron", "cleanup", "rsvp"],
		});

		return {
			success: true,
			deleted: result.deletedRsvps,
			deletedOrders: result.deletedOrders,
			message: `Successfully deleted ${result.deletedRsvps} unpaid RSVP(s) and ${result.deletedOrders} related order(s)`,
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
			message: "Failed to cleanup unpaid RSVPs",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
};
