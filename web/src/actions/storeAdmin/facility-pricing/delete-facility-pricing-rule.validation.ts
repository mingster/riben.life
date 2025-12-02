import { z } from "zod";

export const deleteFacilityPricingRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
});

export type DeleteFacilityPricingRuleInput = z.infer<
	typeof deleteFacilityPricingRuleSchema
>;
