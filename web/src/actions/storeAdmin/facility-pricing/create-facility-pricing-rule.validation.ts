import { z } from "zod";

export const createFacilityPricingRuleSchema = z.object({
	facilityId: z.string().nullable().optional(),
	name: z.string().trim().min(1, "Name is required"),
	priority: z.coerce.number().int().default(0),
	dayOfWeek: z.string().nullable().optional(),
	startTime: z.string().nullable().optional(),
	endTime: z.string().nullable().optional(),
	cost: z.coerce.number().min(0).nullable().optional(),
	credit: z.coerce.number().min(0).nullable().optional(),
	isActive: z.boolean().default(true),
});

export type CreateFacilityPricingRuleInput = z.infer<
	typeof createFacilityPricingRuleSchema
>;
