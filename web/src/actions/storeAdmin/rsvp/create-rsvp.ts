"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { dateToEpoch, getUtcNowEpoch } from "@/utils/datetime-utils";

import { createRsvpSchema } from "./create-rsvp.validation";

export const createRsvpAction = storeActionClient
	.metadata({ name: "createRsvp" })
	.schema(createRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
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

		// Convert rsvpTime to UTC Date, then to BigInt epoch
		// datetime-local inputs create Date objects in user's local timezone
		// We need to ensure it's stored as UTC epoch time in the database
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
			throw new SafeError("rsvpTime must be a Date object");
		}
		const rsvpTime = dateToEpoch(rsvpTimeDate) ?? BigInt(0);

		// Convert arriveTime to UTC Date, then to BigInt epoch
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
				: null;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		try {
			const rsvp = await sqlClient.rsvp.create({
				data: {
					storeId,
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
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Store: true,
					User: true,
					Order: true,
					Facility: true,
					FacilityPricingRule: true,
				},
			});

			const transformedRsvp = { ...rsvp } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Rsvp already exists.");
			}

			throw error;
		}
	});
