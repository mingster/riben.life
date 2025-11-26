"use server";

import { mapRsvpToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp/history/rsvp-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateRsvpSchema } from "./update-rsvp.validation";

export const updateRsvpAction = storeActionClient
	.metadata({ name: "updateRsvp" })
	.schema(updateRsvpSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			id,
			userId,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime,
			arriveTime,
			status,
			message,
			alreadyPaid,
			confirmedByStore,
			confirmedByCustomer,
			facilityCost,
			facilityCredit,
			pricingRuleId,
		} = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		try {
			const updated = await sqlClient.rsvp.update({
				where: { id },
				data: {
					userId: userId || null,
					facilityId: facilityId || null,
					numOfAdult,
					numOfChild,
					rsvpTime,
					arriveTime: arriveTime || null,
					status,
					message: message || null,
					alreadyPaid,
					confirmedByStore,
					confirmedByCustomer,
					facilityCost:
						facilityCost !== null && facilityCost !== undefined
							? facilityCost
							: null,
					facilityCredit:
						facilityCredit !== null && facilityCredit !== undefined
							? facilityCredit
							: null,
					pricingRuleId: pricingRuleId || null,
				},
			});

			return {
				rsvp: mapRsvpToColumn(updated),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Rsvp update failed.");
			}

			throw error;
		}
	});
