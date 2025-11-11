import { z } from "zod";

export const updateStorePrivacySchema = z.object({
	storeId: z.string().min(1),
	privacyPolicy: z.string().optional().nullable(),
	tos: z.string().optional().nullable(),
});

export type UpdateStorePrivacyInput = z.infer<typeof updateStorePrivacySchema>;
