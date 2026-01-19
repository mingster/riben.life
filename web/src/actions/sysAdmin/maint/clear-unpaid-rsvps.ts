"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { RsvpStatus } from "@/types/enum";
import logger from "@/lib/logger";

/**
 * Maintenance action to clear all unpaid RSVPs regardless of age.
 * This deletes all RSVPs with:
 * - alreadyPaid: false
 * - status: Pending or ReadyToConfirm
 * - confirmedByStore: false
 *
 * Also deletes all associated StoreOrders that are linked to these RSVPs.
 */
export const clearUnpaidRsvps = async () => {
	try {
		// Find all unpaid RSVPs (no age restriction)
		const unpaidRsvps = await sqlClient.rsvp.findMany({
			where: {
				alreadyPaid: false,
				status: {
					in: [RsvpStatus.Pending, RsvpStatus.ReadyToConfirm],
				},
				confirmedByStore: false,
			},
			select: {
				id: true,
				orderId: true,
			},
		});

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

		logger.info("Cleared all unpaid RSVPs", {
			metadata: {
				deletedRsvps: result.deletedRsvps,
				deletedOrders: result.deletedOrders,
			},
			tags: ["action", "maintenance", "unpaid-rsvps"],
		});

		redirect("/sysAdmin/maint");
	} catch (error) {
		logger.error("Failed to clear unpaid RSVPs", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["action", "maintenance", "unpaid-rsvps", "error"],
		});
		throw error;
	}
};
