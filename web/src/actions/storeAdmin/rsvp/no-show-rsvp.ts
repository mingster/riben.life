"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { noShowRsvpSchema } from "./no-show-rsvp.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

// Store admin can mark any RSVP as No Show in their store.
export const noShowRsvpAction = storeActionClient
	.metadata({ name: "noShowRsvp" })
	.schema(noShowRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		// Get the existing RSVP
		const existingRsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Customer: true,
				Store: true,
			},
		});

		const { t } = await getT();

		if (!existingRsvp) {
			throw new SafeError(t("rsvp_reservation_not_found") || "RSVP not found");
		}

		// Validate store context: ensure reservation belongs to the specified store
		if (existingRsvp.storeId !== storeId) {
			throw new SafeError(
				t("rsvp_reservation_not_belong_to_store") ||
					"RSVP does not belong to the specified store",
			);
		}

		// Check if RSVP is already marked as No Show
		if (existingRsvp.status === RsvpStatus.NoShow) {
			throw new SafeError(
				t("rsvp_already_no_show") || "RSVP is already marked as No Show",
			);
		}

		// Only allow marking RSVPs as NoShow if they are in Ready status
		if (existingRsvp.status !== RsvpStatus.Ready) {
			throw new SafeError(
				t("rsvp_can_only_no_show_ready") ||
					"Only RSVPs in Ready status can be marked as No Show",
			);
		}

		const previousStatus = existingRsvp.status;

		logger.info("Marking RSVP as No Show (store admin)", {
			metadata: {
				rsvpId: id,
				storeId,
				previousStatus,
				customerId: existingRsvp.customerId,
			},
			tags: ["rsvp", "no-show", "store-admin"],
		});

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					status: RsvpStatus.NoShow,
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Order: true,
					Facility: true,
					FacilityPricingRule: true,
					ServiceStaff: {
						include: {
							User: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			// Send notification for RSVP no-show
			const notificationRouter = getRsvpNotificationRouter();
			await notificationRouter.routeNotification({
				rsvpId: updated.id,
				storeId: updated.storeId,
				eventType: "no_show",
				customerId: updated.customerId || null,
				customerName: updated.Customer?.name || null,
				customerEmail: updated.Customer?.email || null,
				customerPhone: updated.Customer?.phoneNumber || null,
				storeName: updated.Store?.name || null,
				rsvpTime: updated.rsvpTime,
				arriveTime: updated.arriveTime,
				status: updated.status,
				previousStatus: previousStatus,
				facilityName: updated.Facility?.facilityName || null,
				serviceStaffName:
					updated.ServiceStaff?.User?.name ||
					updated.ServiceStaff?.User?.email ||
					null,
				numOfAdult: updated.numOfAdult,
				numOfChild: updated.numOfChild,
				message: updated.message || null,
				actionUrl: `/storeAdmin/${updated.storeId}/rsvp`,
			});

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const { t } = await getT();
				throw new SafeError(
					t("rsvp_no_show_failed") || "RSVP no-show marking failed.",
				);
			}

			throw error;
		}
	});
