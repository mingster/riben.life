import { z } from "zod";

export const updateMessageTemplateSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Message template name is required"),
	templateType: z
		.enum([
			"email",
			"line",
			"sms",
			"whatsapp",
			"wechat",
			"telegram",
			"push",
			"onsite",
		])
		.default("email"),
	// Note: isGlobal and storeId are not in schema - they're handled by the action
	// isGlobal is always false for store templates
	// storeId is set from bindArgsClientInputs
});

export type UpdateMessageTemplateInput = z.infer<
	typeof updateMessageTemplateSchema
>;
