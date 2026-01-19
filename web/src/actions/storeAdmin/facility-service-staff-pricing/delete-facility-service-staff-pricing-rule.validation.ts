import { z } from "zod";

export const deleteFacilityServiceStaffPricingRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
});

export type DeleteFacilityServiceStaffPricingRuleInput = z.infer<
	typeof deleteFacilityServiceStaffPricingRuleSchema
>;
