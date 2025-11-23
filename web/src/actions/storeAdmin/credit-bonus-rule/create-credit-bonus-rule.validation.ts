import { z } from "zod";

export const createCreditBonusRuleSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	threshold: z.coerce.number().min(0, "Threshold must be 0 or greater"),
	bonus: z.coerce.number().min(0, "Bonus must be 0 or greater"),
	isActive: z.boolean().default(true),
});

export type CreateCreditBonusRuleInput = z.infer<
	typeof createCreditBonusRuleSchema
>;
