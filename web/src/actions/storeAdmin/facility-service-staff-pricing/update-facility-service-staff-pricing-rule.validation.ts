import { z } from "zod";

export const updateFacilityServiceStaffPricingRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
	facilityId: z.string().nullable().optional(),
	serviceStaffId: z.string().nullable().optional(),
	facilityDiscount: z.coerce.number().min(0).default(0),
	serviceStaffDiscount: z.coerce.number().min(0).default(0),
	priority: z.coerce.number().int().default(0),
	isActive: z.boolean().default(true),
});

export type UpdateFacilityServiceStaffPricingRuleInput = z.infer<
	typeof updateFacilityServiceStaffPricingRuleSchema
>;
