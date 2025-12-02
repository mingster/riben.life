import { z } from "zod";

export const updateStorePrivacySchema = z.object({
	privacyPolicy: z.string().optional().nullable(),
	tos: z.string().optional().nullable(),
});

export type UpdateStorePrivacyInput = z.infer<typeof updateStorePrivacySchema>;
