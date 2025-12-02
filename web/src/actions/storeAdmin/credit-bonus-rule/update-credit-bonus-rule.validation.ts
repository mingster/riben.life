import { z } from "zod";

export const updateCreditBonusRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
	threshold: z.coerce.number().min(0, "Threshold must be 0 or greater"),
	bonus: z.coerce.number().min(0, "Bonus must be 0 or greater"),
	isActive: z.boolean().default(true),
});

export type UpdateCreditBonusRuleInput = z.infer<
	typeof updateCreditBonusRuleSchema
>;
