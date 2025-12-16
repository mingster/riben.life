import { z } from "zod";

export const updateMessageTemplateSchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
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
	isGlobal: z.boolean().default(false),
	storeId: z.string().optional().nullable(),
});

export type UpdateMessageTemplateInput = z.infer<
	typeof updateMessageTemplateSchema
>;
