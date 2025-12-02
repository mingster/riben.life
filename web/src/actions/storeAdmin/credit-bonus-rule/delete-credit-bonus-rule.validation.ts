import { z } from "zod";

export const deleteCreditBonusRuleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
});

export type DeleteCreditBonusRuleInput = z.infer<
	typeof deleteCreditBonusRuleSchema
>;
