import { z } from "zod";

export const updateStoreTermsSchema = z.object({
	tos: z.string().optional().nullable(),
});

export type UpdateStoreTermsInput = z.infer<typeof updateStoreTermsSchema>;
