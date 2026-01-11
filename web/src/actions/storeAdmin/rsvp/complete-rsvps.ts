"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { completeRsvpsSchema } from "./complete-rsvps.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import { completeRsvpCore } from "./complete-rsvp-core";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

export const completeRsvpsAction = storeActionClient
	.metadata({ name: "completeRsvps" })
	.schema(completeRsvpsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { rsvpIds } = parsedInput;

		const { t } = await getT();

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				creditServiceExchangeRate: true,
				creditExchangeRate: true,
				defaultCurrency: true,
				useCustomerCredit: true,
			},
		});

		if (!store) {
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
		}

		// Fetch all RSVPs to verify they belong to the store and are in Ready status
		const rsvps = await sqlClient.rsvp.findMany({
			where: {
				id: { in: rsvpIds },
				storeId,
				status: RsvpStatus.Ready,
			},
			include: {
				Facility: {
					select: {
						id: true,
						defaultDuration: true,
					},
				},
				Customer: {
					select: {
						id: true,
						name: true,
						email: true,
						phoneNumber: true,
					},
				},
				Order: {
					select: {
						id: true,
						PaymentMethod: {
							select: {
								payUrl: true,
							},
						},
					},
				},
			},
		});

		if (rsvps.length === 0) {
			throw new SafeError(
				t("no_rsvps_to_complete") || "No RSVPs found to complete",
			);
		}

		// Verify all requested RSVPs were found
		if (rsvps.length !== rsvpIds.length) {
			const foundIds = rsvps.map((r) => r.id);
			const missingIds = rsvpIds.filter((id) => !foundIds.includes(id));
			logger.warn("Some RSVPs were not found or not in Ready status", {
				metadata: {
					storeId,
					requestedIds: rsvpIds,
					foundIds,
					missingIds,
				},
				tags: ["rsvp", "completion"],
			});
		}

		// Complete all RSVPs in a transaction
		const completedRsvps = await sqlClient.$transaction(async (tx) => {
			const updatedRsvps: Rsvp[] = [];

			for (const rsvp of rsvps) {
				try {
					const result = await completeRsvpCore({
						tx,
						rsvpId: rsvp.id,
						storeId,
						previousStatus: rsvp.status,
						existingRsvp: {
							id: rsvp.id,
							storeId: rsvp.storeId,
							status: rsvp.status,
							alreadyPaid: rsvp.alreadyPaid,
							customerId: rsvp.customerId,
							facilityId: rsvp.facilityId,
							orderId: rsvp.orderId,
							createdBy: rsvp.createdBy,
							Facility: rsvp.Facility,
							Order: rsvp.Order,
						},
						store: {
							id: store.id,
							creditServiceExchangeRate: store.creditServiceExchangeRate,
							creditExchangeRate: store.creditExchangeRate,
							defaultCurrency: store.defaultCurrency,
							useCustomerCredit: store.useCustomerCredit,
						},
					});

					updatedRsvps.push(result.rsvp);
				} catch (error) {
					logger.error("Failed to complete RSVP", {
						metadata: {
							storeId,
							rsvpId: rsvp.id,
							error: error instanceof Error ? error.message : String(error),
						},
						tags: ["rsvp", "completion", "error"],
					});
					// Continue with other RSVPs even if one fails
				}
			}

			return updatedRsvps;
		});

		// Send notifications for each completed RSVP (fire and forget)
		const notificationRouter = getRsvpNotificationRouter();
		for (const rsvp of completedRsvps) {
			try {
				await notificationRouter.routeNotification({
					rsvpId: rsvp.id,
					storeId: rsvp.storeId,
					eventType: "completed",
					customerId: rsvp.customerId || null,
					customerName: rsvp.Customer?.name || null,
					customerEmail: rsvp.Customer?.email || null,
					customerPhone: rsvp.Customer?.phoneNumber || null,
					storeName: rsvp.Store?.name || null,
					rsvpTime: rsvp.rsvpTime,
					arriveTime: rsvp.arriveTime,
					status: rsvp.status,
					previousStatus: RsvpStatus.Ready,
					facilityName: rsvp.Facility?.facilityName || null,
					serviceStaffName:
						rsvp.ServiceStaff?.User?.name ||
						rsvp.ServiceStaff?.User?.email ||
						null,
					numOfAdult: rsvp.numOfAdult,
					numOfChild: rsvp.numOfChild,
					message: rsvp.message || null,
					actionUrl: `/storeAdmin/${rsvp.storeId}/rsvp`,
				});
			} catch (error) {
				// Log but don't fail the entire operation if notification fails
				logger.warn("Failed to send completion notification", {
					metadata: {
						rsvpId: rsvp.id,
						storeId: rsvp.storeId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "notification", "error"],
				});
			}
		}

		// Transform BigInt and Decimal to numbers for JSON serialization
		const transformedRsvps = completedRsvps.map((rsvp) => {
			const transformed = { ...rsvp };
			transformPrismaDataForJson(transformed);
			return transformed as Rsvp;
		});

		return {
			rsvps: transformedRsvps,
			completedCount: transformedRsvps.length,
			requestedCount: rsvpIds.length,
		};
	});
