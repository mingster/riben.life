"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteFacilityPricingRuleSchema } from "./delete-facility-pricing-rule.validation";

export const deleteFacilityPricingRuleAction = storeActionClient
	.metadata({ name: "deleteFacilityPricingRule" })
	.schema(deleteFacilityPricingRuleSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const rule = await sqlClient.facilityPricingRule.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rule || rule.storeId !== storeId) {
			throw new SafeError("Pricing rule not found");
		}

		await sqlClient.facilityPricingRule.delete({
			where: { id },
		});

		return { id };
	});
