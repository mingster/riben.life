"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { getUtcNowEpoch, dateToEpoch } from "@/utils/datetime-utils";
import { updateRsvpSchema } from "./update-rsvp.validation";

export const updateRsvpAction = storeActionClient
	.metadata({ name: "updateRsvp" })
	.schema(updateRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			userId,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			arriveTime: arriveTimeInput,
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

		// Convert rsvpTime to UTC Date, then to BigInt epoch
		let rsvpTimeDate: Date;
		if (rsvpTimeInput instanceof Date) {
			rsvpTimeDate = new Date(
				Date.UTC(
					rsvpTimeInput.getFullYear(),
					rsvpTimeInput.getMonth(),
					rsvpTimeInput.getDate(),
					rsvpTimeInput.getHours(),
					rsvpTimeInput.getMinutes(),
					rsvpTimeInput.getSeconds(),
					rsvpTimeInput.getMilliseconds(),
				),
			);
		} else {
			rsvpTimeDate = new Date(rsvpTimeInput);
		}
		const rsvpTime = dateToEpoch(rsvpTimeDate) ?? BigInt(0);

		// Convert arriveTime to UTC Date, then to BigInt epoch (or null)
		const arriveTime =
			arriveTimeInput instanceof Date
				? dateToEpoch(
						new Date(
							Date.UTC(
								arriveTimeInput.getFullYear(),
								arriveTimeInput.getMonth(),
								arriveTimeInput.getDate(),
								arriveTimeInput.getHours(),
								arriveTimeInput.getMinutes(),
								arriveTimeInput.getSeconds(),
								arriveTimeInput.getMilliseconds(),
							),
						),
					)
				: arriveTimeInput
					? dateToEpoch(new Date(arriveTimeInput))
					: null;

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
				include: {
					Store: true,
					User: true,
					Order: true,
					Facility: true,
					FacilityPricingRule: true,
				},
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
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
