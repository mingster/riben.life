import { z } from "zod";

export const deleteStoreSchema = z.object({
	storeId: z.string().min(1),
});

export type DeleteStoreInput = z.infer<typeof deleteStoreSchema>;
