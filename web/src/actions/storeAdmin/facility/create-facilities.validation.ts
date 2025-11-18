import { z } from "zod";

export const createFacilitiesSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	prefix: z.string().trim().default(""),
	numOfFacilities: z.coerce.number().int().min(1).max(100),
	capacity: z.coerce.number().int().min(1),
});
