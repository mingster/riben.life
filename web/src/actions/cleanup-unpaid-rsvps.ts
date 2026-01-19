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
 * Server action to cleanup all unpaid RSVPs.
 * This action is designed to be called by cron jobs.
 * The cron job schedule determines when unpaid RSVPs should be cleaned up.
 *
 * @returns Result object with deletion counts and status
 */
export const cleanupUnpaidRsvps =
	async (): Promise<CleanupUnpaidRsvpsResult> => {
		const startTime = Date.now();
		const log = logger.child({ module: "cleanupUnpaidRsvps" });

		try {
			// Find all unpaid RSVPs (no age restriction - cron job handles scheduling)
			// Include both Pending (0) and ReadyToConfirm (10) statuses as they are both unpaid
			// Exclude RSVPs that are confirmed by store (confirmedByStore = true)
			const unpaidRsvps = await sqlClient.rsvp.findMany({
				where: {
					alreadyPaid: false,
					status: {
						in: [RsvpStatus.Pending, RsvpStatus.ReadyToConfirm], // Both are unpaid statuses
					},
					confirmedByStore: false, // Do not delete RSVPs confirmed by store
				},
				select: {
					id: true,
					storeId: true,
					customerId: true,
					orderId: true,
					status: true, // Include status for logging
					alreadyPaid: true, // Include for logging
					confirmedByStore: true, // Include for logging
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
