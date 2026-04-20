import { z } from "zod";

export const listMyRsvpsForStoreSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export type ListMyRsvpsForStoreInput = z.infer<
	typeof listMyRsvpsForStoreSchema
>;
