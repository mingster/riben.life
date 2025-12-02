"use server";

import { mapFacilityPricingRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility-pricing/facility-pricing-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateFacilityPricingRuleSchema } from "./update-facility-pricing-rule.validation";

export const updateFacilityPricingRuleAction = storeActionClient
	.metadata({ name: "updateFacilityPricingRule" })
	.schema(updateFacilityPricingRuleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
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

		const rule = await sqlClient.facilityPricingRule.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rule || rule.storeId !== storeId) {
			throw new SafeError("Pricing rule not found");
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
			const updated = await sqlClient.facilityPricingRule.update({
				where: { id },
				data: {
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
				rule: mapFacilityPricingRuleToColumn(updated),
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
