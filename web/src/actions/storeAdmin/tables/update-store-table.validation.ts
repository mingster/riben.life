import { z } from "zod";

export const updateStoreTableSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	id: z.string().min(1, "tableId is required"),
	tableName: z.string().trim().min(1, "tableName is required"),
	capacity: z.coerce.number().int().min(1),
});
