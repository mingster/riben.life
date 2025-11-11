import { z } from "zod/v4";

export const updateStoreTermsSchema = z.object({
	storeId: z.string().min(1),
	tos: z.string().optional().nullable(),
});

export type UpdateStoreTermsInput = z.infer<typeof updateStoreTermsSchema>;
