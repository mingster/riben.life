import { z } from "zod";

export const createStoreTablesSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	prefix: z.string().trim().default(""),
	numOfTables: z.coerce.number().int().min(1).max(100),
	capacity: z.coerce.number().int().min(1),
});
