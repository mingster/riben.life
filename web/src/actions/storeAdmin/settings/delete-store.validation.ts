import { z } from "zod/v4";

export const deleteStoreSchema = z.object({
	storeId: z.string().min(1),
});

export type DeleteStoreInput = z.infer<typeof deleteStoreSchema>;
