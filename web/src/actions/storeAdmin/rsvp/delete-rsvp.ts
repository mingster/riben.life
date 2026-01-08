"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";

import { deleteRsvpSchema } from "./delete-rsvp.validation";
import { getRsvpNotificationRouter } from "@/lib/notification/rsvp-notification-router";

export const deleteRsvpAction = storeActionClient
	.metadata({ name: "deleteRsvp" })
	.schema(deleteRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			include: {
				Store: true,
				Customer: true,
				Facility: true,
			},
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		// Send notification before deletion
		const notificationRouter = getRsvpNotificationRouter();
		await notificationRouter.routeNotification({
			rsvpId: rsvp.id,
			storeId: rsvp.storeId,
			eventType: "deleted",
			customerId: rsvp.customerId,
			customerName: rsvp.Customer?.name || rsvp.name || null,
			customerEmail: rsvp.Customer?.email || null,
			customerPhone: rsvp.Customer?.phoneNumber || rsvp.phone || null,
			storeName: rsvp.Store?.name || null,
			rsvpTime: rsvp.rsvpTime,
			status: rsvp.status,
			facilityName: rsvp.Facility?.facilityName || null,
			actionUrl: `/storeAdmin/${rsvp.storeId}/rsvp`,
		});

		// Store admins can delete any RSVP regardless of status
		// Actually delete from database (hard delete)
		await sqlClient.rsvp.delete({
			where: { id },
		});

		return { id };
	});
