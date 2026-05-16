import { z } from "zod";

export const upsertSystemMessageLocaleSchema = z.object({
	messageId: z.string().min(1),
	localeId: z.string().min(1),
	message: z.string().min(1, "Message is required"),
});

export type UpsertSystemMessageLocaleInput = z.infer<
	typeof upsertSystemMessageLocaleSchema
>;
