import { z } from "zod";

export const deleteCreditBonusRuleSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	id: z.string().min(1, "Rule ID is required"),
});

export type DeleteCreditBonusRuleInput = z.infer<
	typeof deleteCreditBonusRuleSchema
>;
