import { z } from "zod";

export const deleteStoreTableSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	id: z.string().min(1, "tableId is required"),
});
