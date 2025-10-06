import { z } from "zod/v4";

export const updateMessageTemplateLocalizedSchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
	id: z.string(),
	messageTemplateId: z.string(),
	localeId: z.string(),
	bCCEmailAddresses: z.string().optional(),
	subject: z.string().min(1, "Subject is required"),
	body: z.string().min(1, "Body is required"),
	isActive: z.boolean(),
});

export type UpdateMessageTemplateLocalizedInput = z.infer<
	typeof updateMessageTemplateLocalizedSchema
>;
