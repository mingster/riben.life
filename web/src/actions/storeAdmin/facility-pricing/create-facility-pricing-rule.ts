"use server";

import { mapFacilityPricingRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility-pricing/facility-pricing-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";

import { createFacilityPricingRuleSchema } from "./create-facility-pricing-rule.validation";

export const createFacilityPricingRuleAction = storeActionClient
	.metadata({ name: "createFacilityPricingRule" })
	.schema(createFacilityPricingRuleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			facilityId,
			name,
			priority,
			dayOfWeek,
			startTime,
			endTime,
			cost,
			credit,
			isActive,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// If facilityId is provided, verify it exists and belongs to the store
		if (facilityId) {
			const facility = await sqlClient.storeFacility.findUnique({
				where: { id: facilityId },
				select: { id: true, storeId: true },
			});

			if (!facility || facility.storeId !== storeId) {
				throw new SafeError("Facility not found or does not belong to store");
			}
		}

		try {
			const rule = await sqlClient.facilityPricingRule.create({
				data: {
					storeId,
					facilityId: facilityId || null,
					name,
					priority,
					dayOfWeek: dayOfWeek || null,
					startTime: startTime || null,
					endTime: endTime || null,
					cost:
						cost !== null && cost !== undefined
							? new Prisma.Decimal(cost)
							: null,
					credit:
						credit !== null && credit !== undefined
							? new Prisma.Decimal(credit)
							: null,
					isActive,
				},
			});

			return {
				rule: mapFacilityPricingRuleToColumn(rule),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Pricing rule name already exists.");
			}

			throw error;
		}
	});
